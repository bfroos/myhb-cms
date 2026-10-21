/**
 * Einmaliges Aufraeumen der Sprachfassungen (myhb-store#343). Zweiter Lauf 21.10.2026: 5 leere Entwuerfe "Lachfalten" (en/fr/nl/tr/ar).
 *
 * 1. Kaputte Entwuerfe verwerfen: Uebersetzungen, deren Entwurf am 06./07./12.10.
 *    beim Speichern der deutschen Fassung geleert wurde. Live ist alles in
 *    Ordnung; wer einen solchen Entwurf veroeffentlicht, loescht die
 *    Uebersetzung live. Verworfen wird nur, wenn der Entwurf noch genau der
 *    gemessene ist (updatedAt gleich) - spaetere Aenderungen bleiben unberuehrt.
 * 2. Verwaiste Sprachfassungen zurueckziehen (unpublish, nicht loeschen):
 *    Dokumente ohne deutsche Fassung. Nur wenn es weiterhin keine gibt.
 *
 * Veroeffentlicht bewusst nichts: publish loest die pathKey-Kaskade aus, die
 * Unterseiten mitveroeffentlicht (src/index.ts, Middleware pathKey).
 *
 * Laeuft genau einmal (Marke im Core-Store), 30 s nach dem Start, im
 * Hintergrund. Fehler einzelner Eintraege brechen den Lauf nicht ab und
 * blockieren nie den Start von Strapi. Ergebnis im Log unter [sprachen-aufraeumen].
 * Sicherung aller Eintraege: ~/Projekte/strapi-sicherung-2026-10-16 (Benjamins Mac).
 */
import { DISCARD, UNPUBLISH } from "./sprachenAufraeumenDaten";

const STORE_KEY = "sprachen-aufraeumen-lachfalten-2026-10-21";
const LOG = "[sprachen-aufraeumen]";

function iso(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(value as any);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function runSprachenAufraeumen(strapi: any): Promise<void> {
  const store = strapi.store({ type: "plugin", name: "myhb-oneshot" });
  const mark = await store.get({ key: STORE_KEY });
  if (mark) {
    strapi.log.info(`${LOG} schon gelaufen (${JSON.stringify(mark)}), nichts zu tun`);
    return;
  }
  await store.set({ key: STORE_KEY, value: { status: "laeuft", start: new Date().toISOString() } });

  const result = {
    verworfen: 0,
    verwerfenUebersprungen: [] as string[],
    zurueckgezogen: 0,
    zurueckziehenUebersprungen: [] as string[],
    fehler: [] as string[],
  };

  for (const [uid, documentId, locale, expected] of DISCARD) {
    const tag = `${uid}:${documentId}:${locale}`;
    try {
      const docs = strapi.documents(uid);
      const draft = await docs.findOne({ documentId, locale, status: "draft", fields: ["updatedAt"] });
      const published = await docs.findOne({ documentId, locale, status: "published", fields: ["updatedAt"] });
      if (!draft || !published) {
        result.verwerfenUebersprungen.push(`${tag} (keine Fassung)`);
        continue;
      }
      if (iso(draft.updatedAt) !== iso(expected)) {
        result.verwerfenUebersprungen.push(`${tag} (Entwurf seit Messung geaendert)`);
        continue;
      }
      await docs.discardDraft({ documentId, locale });
      result.verworfen += 1;
    } catch (err) {
      result.fehler.push(`verwerfen ${tag}: ${err}`);
    }
  }

  for (const [uid, documentId, locale] of UNPUBLISH) {
    const tag = `${uid}:${documentId}:${locale}`;
    try {
      const docs = strapi.documents(uid);
      const german = await docs.findOne({ documentId, locale: "de", status: "draft", fields: ["documentId"] });
      if (german) {
        result.zurueckziehenUebersprungen.push(`${tag} (hat jetzt eine deutsche Fassung)`);
        continue;
      }
      const published = await docs.findOne({ documentId, locale, status: "published", fields: ["documentId"] });
      if (!published) {
        result.zurueckziehenUebersprungen.push(`${tag} (nicht veroeffentlicht)`);
        continue;
      }
      await docs.unpublish({ documentId, locale });
      result.zurueckgezogen += 1;
    } catch (err) {
      result.fehler.push(`zurueckziehen ${tag}: ${err}`);
    }
  }

  await store.set({ key: STORE_KEY, value: { status: "fertig", ende: new Date().toISOString(), ...result } });
  strapi.log.info(`${LOG} fertig: ${JSON.stringify(result)}`);
}

export function scheduleSprachenAufraeumen(strapi: any): void {
  setTimeout(() => {
    runSprachenAufraeumen(strapi).catch((err) =>
      strapi.log.error(`${LOG} abgebrochen: ${err}`),
    );
  }, 30_000);
}
