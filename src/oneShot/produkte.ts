/**
 * Einmalig: Produkte auf Franzoesisch und Niederlaendisch (myhb-store#343, 21.10.2026).
 *
 * - 19 vorhandene, vollstaendig uebersetzte Entwuerfe werden veroeffentlicht
 *   (data = null), nur wenn der Entwurf noch der gemessene ist.
 * - 12 Fassungen (Botox, Harmonyca, Power-Infusion, Relax-Infusion, Teosyal
 *   RHA 1 und 3) werden mit neu uebersetzten Texten angelegt; ein vorhandener
 *   fast leerer Entwurf wird nur ueberschrieben, wenn er der gesicherte ist.
 * - 4 bestehende Fassungen (2 Blogartikel, 2 Aerzte) bekommen Kacheln bzw.
 *   Fachgebiete wie auf Deutsch (ergaenzen), nur bei unveraendertem Entwurf.
 * Bilder sind sprachuebergreifend und bleiben unberuehrt.
 *
 * Laeuft genau einmal (Marke im Core-Store), 30 s nach dem Start, im
 * Hintergrund; Fehler einzelner Eintraege brechen nicht ab. Log: [produkte-fr-nl].
 */
import { PRODUKTE } from "./produkteDaten";

const STORE_KEY = "produkte-fr-nl-2026-10-21";
const LOG = "[produkte-fr-nl]";

function iso(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(value as any);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function runProdukte(strapi: any): Promise<void> {
  const store = strapi.store({ type: "plugin", name: "myhb-oneshot" });
  if (await store.get({ key: STORE_KEY })) {
    strapi.log.info(`${LOG} schon gelaufen, nichts zu tun`);
    return;
  }
  await store.set({ key: STORE_KEY, value: { status: "laeuft", start: new Date().toISOString() } });
  const result = { veroeffentlicht: 0, angelegt: 0, ergaenzt: 0, uebersprungen: [] as string[], fehler: [] as string[] };

  for (const { uid, documentId, locale, expectedDraftUpdatedAt, data, ergaenzen } of PRODUKTE) {
    const tag = `${documentId}:${locale}`;
    try {
      const docs = strapi.documents(uid);
      const published = await docs.findOne({ documentId, locale, status: "published", fields: ["updatedAt"] });
      if (ergaenzen) {
        // Bestehende Fassung ergaenzen: nur wenn Entwurf unveraendert und gleich alt wie live
        const draftE = await docs.findOne({ documentId, locale, status: "draft", fields: ["updatedAt"] });
        if (!published || !draftE || iso(draftE.updatedAt) !== iso(expectedDraftUpdatedAt) || iso(draftE.updatedAt) !== iso(published.updatedAt)) {
          result.uebersprungen.push(`${tag} (Entwurf offen oder geaendert)`);
          continue;
        }
        await docs.update({ documentId, locale, data });
        await docs.publish({ documentId, locale });
        result.ergaenzt += 1;
        continue;
      }
      if (published) {
        result.uebersprungen.push(`${tag} (schon veroeffentlicht)`);
        continue;
      }
      const draft = await docs.findOne({ documentId, locale, status: "draft", fields: ["updatedAt"] });
      if (iso(draft?.updatedAt) !== iso(expectedDraftUpdatedAt)) {
        result.uebersprungen.push(`${tag} (Entwurf seit Messung geaendert)`);
        continue;
      }
      if (data) {
        await docs.update({ documentId, locale, data });
        result.angelegt += 1;
      } else {
        result.veroeffentlicht += 1;
      }
      await docs.publish({ documentId, locale });
    } catch (err) {
      result.fehler.push(`${tag}: ${err}`);
    }
  }

  await store.set({ key: STORE_KEY, value: { status: "fertig", ende: new Date().toISOString(), ...result } });
  strapi.log.info(`${LOG} fertig: ${JSON.stringify(result)}`);
}

export function scheduleProdukte(strapi: any): void {
  setTimeout(() => {
    runProdukte(strapi).catch((err) => strapi.log.error(`${LOG} abgebrochen: ${err}`));
  }, 30_000);
}
