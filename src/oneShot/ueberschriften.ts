/**
 * Einmalig: Ueberschriften und FAQ-Fragen der Behandlungsseiten auf richtiges
 * Deutsch (myhb-store#396, 05.11.2026, Freigabe Benjamin).
 *
 * Viele Vorlagen haengten Behandlung und Stadt einfach an ("Alle Details zur
 * Lip Flip Botox Köln"). 490 Rohtexte (mit Platzhaltern wie {{ cityPhrase }})
 * wurden sprachlich korrigiert. Ersetzt wird je Feld NUR bei exakt gleichem
 * alten Text, in Entwurf und Live-Fassung gleichermassen (die Komponentenzeilen
 * beider Fassungen tragen denselben Text). Es wird nichts veroeffentlicht,
 * also werden keine fremden Entwuerfe mitgenommen. FAQ-Fragen nur locale=de.
 *
 * Laeuft genau einmal (Marke im Core-Store), 30 s nach dem Start, im
 * Hintergrund; Fehler einzelner Eintraege brechen nicht ab. Log: [ueberschriften].
 */
import { KORREKTUREN } from "./ueberschriftenDaten";

const STORE_KEY = "ueberschriften-deutsch-2026-11-05";
const LOG = "[ueberschriften]";

export async function runUeberschriften(strapi: any): Promise<void> {
  const store = strapi.store({ type: "plugin", name: "myhb-oneshot" });
  if (await store.get({ key: STORE_KEY })) {
    strapi.log.info(`${LOG} schon gelaufen, nichts zu tun`);
    return;
  }
  await store.set({ key: STORE_KEY, value: { status: "laeuft", start: new Date().toISOString() } });
  const result = { zeilen: 0, korrekturen: 0, ohneTreffer: [] as string[], fehler: [] as string[] };

  for (const k of KORREKTUREN) {
    try {
      const where: Record<string, unknown> = { [k.field]: k.from };
      if (k.uid === "api::faq.faq") where.locale = "de";
      const res = await strapi.db.query(k.uid).updateMany({ where, data: { [k.field]: k.to } });
      const n = Number(res?.count ?? 0);
      result.zeilen += n;
      if (n > 0) result.korrekturen += 1;
      else result.ohneTreffer.push(`${k.uid}: ${k.from}`);
    } catch (err) {
      result.fehler.push(`${k.uid}: ${k.from}: ${err}`);
    }
  }

  await store.set({ key: STORE_KEY, value: { status: "fertig", ende: new Date().toISOString(), ...result } });
  strapi.log.info(`${LOG} fertig: ${JSON.stringify({ ...result, ohneTreffer: result.ohneTreffer.length })}`);
}

export function scheduleUeberschriften(strapi: any): void {
  setTimeout(() => {
    runUeberschriften(strapi).catch((err) => strapi.log.error(`${LOG} abgebrochen: ${err}`));
  }, 30_000);
}
