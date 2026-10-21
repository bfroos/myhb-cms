/**
 * Einmalig: restliche Sprachluecken schliessen (myhb-store#343, 21.10.2026).
 *
 * Drei Arten von Schritten, in dieser Reihenfolge:
 * - neu: Fassung anlegen und veroeffentlichen (Profhilo als Behandlung,
 *   B-Komplex-Infusion auf Tuerkisch). Nur wenn es weder Entwurf noch Live-Fassung gibt.
 * - entwurf: vorhandenen, vollstaendig uebersetzten Entwurf (optional ergaenzt um
 *   Bilder, Kacheln, FAQ) veroeffentlichen. Nur wenn der Entwurf noch der gemessene ist.
 * - ergaenzen: bestehende Live-Fassung um fehlende Abschnitte, Bilder und
 *   Verknuepfungen ergaenzen (Blog, Karriereseite, freie Seiten, Produkte,
 *   Behandlungen, Aerzte). Nur wenn Entwurf = Live-Fassung und unveraendert.
 * Lumi Face ist bewusst nicht dabei (Aktion bis 31.10., Uebersetzung ab 02.11.).
 *
 * Laeuft genau einmal (Marke im Core-Store), 30 s nach dem Start, im
 * Hintergrund; Fehler einzelner Eintraege brechen nicht ab. Log: [restluecken].
 */
import { SCHRITTE } from "./restlueckenDaten";

const STORE_KEY = "restluecken-2026-10-21";
const LOG = "[restluecken]";

function iso(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(value as any);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function runRestluecken(strapi: any): Promise<void> {
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

export function scheduleRestluecken(strapi: any): void {
  setTimeout(() => {
    runRestluecken(strapi).catch((err) => strapi.log.error(`${LOG} abgebrochen: ${err}`));
  }, 30_000);
}
