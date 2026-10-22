/**
 * Einmalig: Adressen und Restfehler der Sprachfassungen korrigieren
 * (myhb-store#343, 22.10.2026).
 *
 * - 55 Behandlungsseiten (en/fr/nl/tr/ar): pathKey und ancestorSlugs passend
 *   zur Oberkategorie und zum Slug; 16 davon bekommen dadurch eine neue Adresse.
 * - 16 Weiterleitungen (301) von der alten auf die neue Adresse, nur wenn es
 *   fuer die alte Adresse noch keine gibt.
 * - Deutsche Textreste auf 3 Seiten uebersetzt, Titelbild Fettwegspritze wie
 *   auf Deutsch.
 * Seiten nur, wenn Entwurf = Live-Fassung und unveraendert (ergaenzen) bzw.
 * der Entwurf noch der gemessene ist (entwurf, 1 Seite).
 *
 * Laeuft genau einmal (Marke im Core-Store), 30 s nach dem Start, im
 * Hintergrund; Fehler einzelner Eintraege brechen nicht ab. Log: [adressen].
 */
import { SCHRITTE } from "./adressenDaten";

const STORE_KEY = "sprachen-adressen-2026-10-22";
const LOG = "[adressen]";

function iso(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(value as any);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function runAdressen(strapi: any): Promise<void> {
  const store = strapi.store({ type: "plugin", name: "myhb-oneshot" });
  if (await store.get({ key: STORE_KEY })) {
    strapi.log.info(`${LOG} schon gelaufen, nichts zu tun`);
    return;
  }
  await store.set({ key: STORE_KEY, value: { status: "laeuft", start: new Date().toISOString() } });
  const result = { seiten: 0, weiterleitungen: 0, uebersprungen: [] as string[], fehler: [] as string[] };

  for (const { uid, documentId, locale, expectedDraftUpdatedAt, data, mode } of SCHRITTE) {
    const tag = mode === "weiterleitung" ? `redirect:${data.from}` : `${documentId}:${locale}`;
    try {
      const docs = strapi.documents(uid);
      if (mode === "weiterleitung") {
        const vorhanden = await docs.findMany({ filters: { from: data.from }, fields: ["from"] });
        if (vorhanden.length) {
          result.uebersprungen.push(`${tag} (gibt es schon)`);
          continue;
        }
        await docs.create({ data });
        result.weiterleitungen += 1;
        continue;
      }
      const published = await docs.findOne({ documentId, locale, status: "published", fields: ["updatedAt"] });
      const draft = await docs.findOne({ documentId, locale, status: "draft", fields: ["updatedAt"] });
      const ok =
        mode === "entwurf"
          ? draft && iso(draft.updatedAt) === iso(expectedDraftUpdatedAt)
          : published && draft && iso(draft.updatedAt) === iso(expectedDraftUpdatedAt) && iso(draft.updatedAt) === iso(published.updatedAt);
      if (!ok) {
        result.uebersprungen.push(`${tag} (Entwurf offen oder geaendert)`);
        continue;
      }
      await docs.update({ documentId, locale, data });
      await docs.publish({ documentId, locale });
      result.seiten += 1;
    } catch (err) {
      result.fehler.push(`${tag}: ${err}`);
    }
  }

  await store.set({ key: STORE_KEY, value: { status: "fertig", ende: new Date().toISOString(), ...result } });
  strapi.log.info(`${LOG} fertig: ${JSON.stringify(result)}`);
}

export function scheduleAdressen(strapi: any): void {
  setTimeout(() => {
    runAdressen(strapi).catch((err) => strapi.log.error(`${LOG} abgebrochen: ${err}`));
  }, 30_000);
}
