/**
 * treatment-page(-ads) lifecycles - DB-Ebene Delete-Guard (2026-07-14)
 *
 * Ergaenzt den Document-Service-Delete-Guard (src/index.ts) um eine TIEFERE
 * Ebene. db-Lifecycles feuern fuer Loeschungen ueber die Query-Engine
 * (Document Service, Entity Service, Admin, KI-Uebersetzung/Locale-Sync) und
 * fangen damit auch Loeschpfade ab, die RBAC UND die Document-Service-
 * Middleware umgehen.
 *
 * Fail-closed: jedes Delete wird blockiert, ausser es ist erlaubt
 * (ENV-Flag ALLOW_TREATMENT_PAGE_DELETE=1 oder interne publish/unpublish/
 * discardDraft-Operation, siehe utils/treatmentPageDeleteGuard.ts).
 *
 * Grenze: greift nur ueber die Query-Engine. Direkter knex-Rohzugriff und
 * "strapi transfer/import" umgehen db-Lifecycles weiterhin.
 */
import { isTreatmentPageDeleteAllowed } from "../../../../utils/treatmentPageDeleteGuard";

function guardDelete(event: any): void {
  if (isTreatmentPageDeleteAllowed()) return;

  let where = "";
  try {
    where = JSON.stringify(event?.params?.where ?? {});
  } catch {
    where = String(event?.params?.where);
  }

  throw new Error(
    "[delete-guard/db] Loeschen einer treatment-page ist blockiert " +
      "(DB-Lifecycle-Guard). Faengt auch Loeschungen ab, die RBAC und den " +
      "Document-Service umgehen (z.B. KI-Uebersetzung). Bewusstes Loeschen nur " +
      "mit ALLOW_TREATMENT_PAGE_DELETE=1 (temporaer/lokal). where=" + where
  );
}

export default {
  beforeDelete(event: any) {
    guardDelete(event);
  },
  beforeDeleteMany(event: any) {
    guardDelete(event);
  },
};
