/**
 * Einmalig: Lachfalten und Kraehenfuesse in en/fr/nl/tr trennen
 * (myhb-store#343, 22.10.2026).
 *
 * Die Lachfalten-Seite hiess dort wie die Kraehenfuesse-Seite und belegte deren
 * Adresse. Je Sprache, strikt in dieser Reihenfolge:
 * 1. Lachfalten neu uebersetzt (laugh lines, rides du sourire, lachrimpels,
 *    guelme cizgileri) mit eigener Adresse veroeffentlichen.
 * 2. Nur wenn 1. live ist: Kraehenfuesse auf die frei gewordene Adresse.
 * 3. Nur wenn 2. live ist: die abgeschaltete Weiterleitung von der alten
 *    Kraehenfuesse-Adresse wieder einschalten (bzw. neu anlegen).
 * Seiten nur, wenn Entwurf = Live-Fassung und unveraendert.
 *
 * Laeuft genau einmal (Marke im Core-Store), 30 s nach dem Start, im
 * Hintergrund; Fehler einzelner Eintraege brechen nicht ab. Log: [lachfalten].
 */
import { SCHRITTE } from "./lachfaltenDaten";

const STORE_KEY = "lachfalten-kraehenfuesse-2026-10-22";
const LOG = "[lachfalten]";

function iso(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(value as any);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function runLachfalten(strapi: any): Promise<void> {
  const store = strapi.store({ type: "plugin", name: "myhb-oneshot" });
  if (await store.get({ key: STORE_KEY })) {
    strapi.log.info(`${LOG} schon gelaufen, nichts zu tun`);
    return;
  }
  await store.set({ key: STORE_KEY, value: { status: "laeuft", start: new Date().toISOString() } });
  const erledigt = new Set<string>();
  const result = { erledigt: [] as string[], uebersprungen: [] as string[], fehler: [] as string[] };

  for (const s of SCHRITTE as any[]) {
    const tag = s.key ?? `redirect:${s.data.from}`;
    try {
      if (s.wenn && !erledigt.has(s.wenn)) {
        result.uebersprungen.push(`${tag} (${s.wenn} nicht erledigt)`);
        continue;
      }
      const docs = strapi.documents(s.uid);
      if (s.mode === "weiterleitung") {
        const alt = await docs.findMany({ filters: { from: s.deaktiviert }, fields: ["from"] });
        const schon = await docs.findMany({ filters: { from: s.data.from }, fields: ["from"] });
        if (schon.length) {
          result.uebersprungen.push(`${tag} (gibt es schon)`);
        } else if (alt.length) {
          await docs.update({ documentId: alt[0].documentId, data: s.data });
          result.erledigt.push(tag);
        } else {
          await docs.create({ data: s.data });
          result.erledigt.push(tag);
        }
        continue;
      }
      const { documentId, locale, expectedDraftUpdatedAt, data } = s;
      const published = await docs.findOne({ documentId, locale, status: "published", fields: ["updatedAt"] });
      const draft = await docs.findOne({ documentId, locale, status: "draft", fields: ["updatedAt"] });
      if (!published || !draft || iso(draft.updatedAt) !== iso(expectedDraftUpdatedAt) || iso(draft.updatedAt) !== iso(published.updatedAt)) {
        result.uebersprungen.push(`${tag} (Entwurf offen oder geaendert)`);
        continue;
      }
      await docs.update({ documentId, locale, data });
      await docs.publish({ documentId, locale });
      const live = await docs.findOne({ documentId, locale, status: "published", fields: ["pathKey"] });
      if (live?.pathKey !== s.pruefPathKey) {
        result.fehler.push(`${tag}: live pathKey ${live?.pathKey}, erwartet ${s.pruefPathKey}`);
        continue;
      }
      erledigt.add(s.key);
      result.erledigt.push(tag);
    } catch (err) {
      result.fehler.push(`${tag}: ${err}`);
    }
  }

  await store.set({ key: STORE_KEY, value: { status: "fertig", ende: new Date().toISOString(), ...result } });
  strapi.log.info(`${LOG} fertig: ${JSON.stringify(result)}`);
}

export function scheduleLachfalten(strapi: any): void {
  setTimeout(() => {
    runLachfalten(strapi).catch((err) => strapi.log.error(`${LOG} abgebrochen: ${err}`));
  }, 30_000);
}
