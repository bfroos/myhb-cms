import { AsyncLocalStorage } from "node:async_hooks";

/**
 * DB-Lifecycle-Delete-Guard - Hilfsfunktionen.
 *
 * Der Document-Service-Guard (src/index.ts, Middleware 3) und die Admin-RBAC
 * fangen "normale" Loeschungen ab. Die KI-Uebersetzungs-/Locale-Sync-Funktion
 * loescht Locales aber ueber einen INTERNEN Pfad, der weder RBAC noch die
 * Document-Service-Middleware durchlaeuft (bestaetigt am 14.07.2026: DE-Locale
 * "Zornesfalte" geloescht, 0 delete-Eintraege im Audit-Log, Guard nicht
 * ausgeloest). Deshalb zusaetzlich ein Guard auf db-Lifecycle-Ebene
 * (content-types/<content-type>/lifecycles.ts), der TIEFER sitzt.
 *
 * Damit legitime interne Deletes bei publish/unpublish/discardDraft nicht
 * blockiert werden, markiert eine Document-Service-Middleware diese Ops via
 * AsyncLocalStorage; der db-Guard laesst Deletes innerhalb dieses Kontexts zu.
 */
const internalOpStore = new AsyncLocalStorage<boolean>();

export function runAsInternalTreatmentPageOp<T>(
  fn: () => Promise<T>
): Promise<T> {
  return internalOpStore.run(true, fn);
}

export function isInternalTreatmentPageOp(): boolean {
  return internalOpStore.getStore() === true;
}

/**
 * true, wenn ein Delete einer treatment-page erlaubt ist:
 *  - explizit per ENV-Flag (bewusste, temporaere Loeschung), ODER
 *  - innerhalb einer internen publish/unpublish/discardDraft-Operation.
 */
export function isTreatmentPageDeleteAllowed(): boolean {
  return (
    process.env.ALLOW_TREATMENT_PAGE_DELETE === "1" ||
    isInternalTreatmentPageOp()
  );
}
