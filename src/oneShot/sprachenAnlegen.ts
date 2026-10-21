/**
 * Einmalig: 8 Behandlungsseiten auf Franzoesisch und Niederlaendisch anlegen
 * (myhb-store#343, 21.10.2026). Brustvergroesserung, Bruststraffung, Haende,
 * Plisseefalten, Kostenlose Haaranalyse, Full Face Botox, Zaehneknirschen,
 * PROFHILO. Inhalt: deutsche Fassung mit uebersetzten Texten, denselben
 * Bildern und nur den Verknuepfungen, die es in der Sprache gibt.
 *
 * Gibt es schon einen (unvollstaendigen) Entwurf, wird er nur ueberschrieben,
 * wenn er noch genau der gesicherte ist (updatedAt gleich). Danach wird
 * veroeffentlicht; pathKey setzt die vorhandene Middleware beim ersten
 * Veroeffentlichen. Die Seiten haben keine Unterseiten, die Kaskade bleibt leer.
 *
 * Laeuft genau einmal (Marke im Core-Store), 30 s nach dem Start, im
 * Hintergrund; Fehler einzelner Eintraege brechen nicht ab. Log: [sprachen-anlegen].
 */
import { NEUE_FASSUNGEN } from "./sprachenAnlegenDaten";

const UID = "api::treatment-page.treatment-page";
const STORE_KEY = "sprachen-anlegen-2026-10-21";
const LOG = "[sprachen-anlegen]";

function iso(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(value as any);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function runSprachenAnlegen(strapi: any): Promise<void> {
  const store = strapi.store({ type: "plugin", name: "myhb-oneshot" });
  if (await store.get({ key: STORE_KEY })) {
    strapi.log.info(`${LOG} schon gelaufen, nichts zu tun`);
    return;
  }
  await store.set({ key: STORE_KEY, value: { status: "laeuft", start: new Date().toISOString() } });
  const result = { angelegt: 0, uebersprungen: [] as string[], fehler: [] as string[] };
  const docs = strapi.documents(UID);

  for (const { documentId, locale, expectedDraftUpdatedAt, data } of NEUE_FASSUNGEN) {
    const tag = `${documentId}:${locale}`;
    try {
      const published = await docs.findOne({ documentId, locale, status: "published", fields: ["documentId"] });
      if (published) {
        result.uebersprungen.push(`${tag} (schon veroeffentlicht)`);
        continue;
      }
      const draft = await docs.findOne({ documentId, locale, status: "draft", fields: ["updatedAt"] });
      if (iso(draft?.updatedAt) !== iso(expectedDraftUpdatedAt)) {
        result.uebersprungen.push(`${tag} (Entwurf seit Sicherung geaendert)`);
        continue;
      }
      await docs.update({ documentId, locale, data });
      await docs.publish({ documentId, locale });
      result.angelegt += 1;
    } catch (err) {
      result.fehler.push(`${tag}: ${err}`);
    }
  }

  await store.set({ key: STORE_KEY, value: { status: "fertig", ende: new Date().toISOString(), ...result } });
  strapi.log.info(`${LOG} fertig: ${JSON.stringify(result)}`);
}

export function scheduleSprachenAnlegen(strapi: any): void {
  setTimeout(() => {
    runSprachenAnlegen(strapi).catch((err) => strapi.log.error(`${LOG} abgebrochen: ${err}`));
  }, 30_000);
}
