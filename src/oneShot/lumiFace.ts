/**
 * Einmalig: Lumi Face in en/fr/nl/tr/ar anlegen (myhb-store#343, 21.10.2026).
 *
 * Legt die Behandlungsseite und die Behandlung Lumi Face in den fuenf Sprachen
 * an (Modus neu: nur wenn es weder Entwurf noch Live-Fassung gibt) und
 * veroeffentlicht sie. Die Texte enthalten die Aktion bis 31.10.; die Umstellung
 * am 01.11. macht die geplante Aufgabe lumi-face-normalpreis-0111 auch fuer
 * diese Sprachen.
 *
 * Laeuft genau einmal (Marke im Core-Store), 30 s nach dem Start, im
 * Hintergrund; Fehler einzelner Eintraege brechen nicht ab. Log: [lumi-face-sprachen].
 */
import { SCHRITTE } from "./lumiFaceDaten";

const STORE_KEY = "lumi-face-sprachen-2026-10-21";
const LOG = "[lumi-face-sprachen]";

function iso(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(value as any);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function runLumiFace(strapi: any): Promise<void> {
  const store = strapi.store({ type: "plugin", name: "myhb-oneshot" });
  if (await store.get({ key: STORE_KEY })) {
    strapi.log.info(`${LOG} schon gelaufen, nichts zu tun`);
    return;
  }
  await store.set({ key: STORE_KEY, value: { status: "laeuft", start: new Date().toISOString() } });
  const result = { neu: 0, entwurf: 0, ergaenzt: 0, uebersprungen: [] as string[], fehler: [] as string[] };

  for (const { uid, documentId, locale, expectedDraftUpdatedAt, data, mode } of SCHRITTE) {
    const tag = `${uid.split(".").pop()}:${documentId}:${locale}`;
    try {
      const docs = strapi.documents(uid);
      const published = await docs.findOne({ documentId, locale, status: "published", fields: ["updatedAt"] });
      const draft = await docs.findOne({ documentId, locale, status: "draft", fields: ["updatedAt"] });
      if (mode === "neu") {
        if (published || draft) {
          result.uebersprungen.push(`${tag} (gibt es schon)`);
          continue;
        }
      } else if (mode === "entwurf") {
        if (!draft || iso(draft.updatedAt) !== iso(expectedDraftUpdatedAt)) {
          result.uebersprungen.push(`${tag} (Entwurf seit Messung geaendert)`);
          continue;
        }
      } else {
        if (!published || !draft || iso(draft.updatedAt) !== iso(expectedDraftUpdatedAt) || iso(draft.updatedAt) !== iso(published.updatedAt)) {
          result.uebersprungen.push(`${tag} (Entwurf offen oder geaendert)`);
          continue;
        }
      }
      if (data) await docs.update({ documentId, locale, data });
      await docs.publish({ documentId, locale });
      if (mode === "neu") result.neu += 1;
      else if (mode === "entwurf") result.entwurf += 1;
      else result.ergaenzt += 1;
    } catch (err) {
      result.fehler.push(`${tag}: ${err}`);
    }
  }

  await store.set({ key: STORE_KEY, value: { status: "fertig", ende: new Date().toISOString(), ...result } });
  strapi.log.info(`${LOG} fertig: ${JSON.stringify(result)}`);
}

export function scheduleLumiFace(strapi: any): void {
  setTimeout(() => {
    runLumiFace(strapi).catch((err) => strapi.log.error(`${LOG} abgebrochen: ${err}`));
  }, 30_000);
}
