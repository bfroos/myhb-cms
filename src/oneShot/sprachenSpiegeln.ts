/**
 * Einmalig: Verknuepfungen und fehlende Bilder der deutschen Fassung in die
 * Uebersetzungen uebernehmen (myhb-store#343, 20.10.2026).
 *
 * 65 Eintraege (Blogartikel, Aerzte, Aerzteseite). Je Eintrag nur die
 * Felder aus sprachenSpiegelnDaten.ts; Bloecke ohne Aenderung tragen nur
 * __component + id und behalten ihren Inhalt. Geschrieben wird nur, wenn der
 * Entwurf noch genau der gemessene ist (updatedAt gleich) und Entwurf und
 * Live-Fassung gleich alt sind - offene Aenderungen anderer bleiben unberuehrt.
 * Danach wird veroeffentlicht. Blogartikel gehen nur so, weil die REST-API
 * das Feld "components" ablehnt (Kollision mit dem reservierten Namen).
 *
 * Laeuft genau einmal (Marke im Core-Store), 30 s nach dem Start, im
 * Hintergrund; Fehler einzelner Eintraege brechen nicht ab. Log: [sprachen-spiegeln].
 */
import { SPIEGEL } from "./sprachenSpiegelnDaten";

const STORE_KEY = "sprachen-spiegeln-2026-10-20";
const LOG = "[sprachen-spiegeln]";

function iso(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(value as any);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function runSprachenSpiegeln(strapi: any): Promise<void> {
  const store = strapi.store({ type: "plugin", name: "myhb-oneshot" });
  if (await store.get({ key: STORE_KEY })) {
    strapi.log.info(`${LOG} schon gelaufen, nichts zu tun`);
    return;
  }
  await store.set({ key: STORE_KEY, value: { status: "laeuft", start: new Date().toISOString() } });
  const result = { geschrieben: 0, uebersprungen: [] as string[], fehler: [] as string[] };

  for (const entry of SPIEGEL) {
    const { uid, documentId, locale, expectedDraftUpdatedAt, data } = entry;
    const tag = `${uid}:${documentId}:${locale}`;
    try {
      const docs = strapi.documents(uid);
      const draft = await docs.findOne({ documentId, locale, status: "draft", fields: ["updatedAt"] });
      const published = await docs.findOne({ documentId, locale, status: "published", fields: ["updatedAt"] });
      if (!draft || !published) {
        result.uebersprungen.push(`${tag} (keine Fassung)`);
        continue;
      }
      if (iso(draft.updatedAt) !== iso(expectedDraftUpdatedAt) || iso(draft.updatedAt) !== iso(published.updatedAt)) {
        result.uebersprungen.push(`${tag} (Entwurf geaendert oder offen)`);
        continue;
      }
      await docs.update({ documentId, locale, data });
      await docs.publish({ documentId, locale });
      result.geschrieben += 1;
    } catch (err) {
      result.fehler.push(`${tag}: ${err}`);
    }
  }

  await store.set({ key: STORE_KEY, value: { status: "fertig", ende: new Date().toISOString(), ...result } });
  strapi.log.info(`${LOG} fertig: ${JSON.stringify(result)}`);
}

export function scheduleSprachenSpiegeln(strapi: any): void {
  setTimeout(() => {
    runSprachenSpiegeln(strapi).catch((err) => strapi.log.error(`${LOG} abgebrochen: ${err}`));
  }, 30_000);
}
