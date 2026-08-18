/**
 * Eindeutigkeit der Standort-Overrides: EIN Datensatz je Standort x
 * Behandlungsseite.
 *
 * Das Schema kann das nicht ausdruecken (unique gilt nur je Einzelfeld, nicht
 * ueber zwei Relationen). Ohne Guard koennen Redakteure zwei Overrides fuer
 * dieselbe Kombination anlegen; die Auslieferung wuerde dann willkuerlich einen
 * davon nehmen.
 *
 * Der Guard sitzt auf db-Lifecycle-Ebene und greift damit fuer Admin-UI, REST
 * und Document-Service gleichermassen. Verschiedene Locales und Draft/Published-
 * Versionen desselben Dokuments teilen sich die documentId und zaehlen NICHT
 * als Duplikat.
 *
 * Grenze: Lassen sich die Relationen aus dem Payload nicht aufloesen (z.B. bei
 * Teil-Updates ohne Relationsfelder), laesst der Guard die Operation durch.
 * Deshalb sortiert der Controller die Override-Abfrage zusaetzlich
 * deterministisch (createdAt:asc), damit ein evtl. durchgerutschtes Duplikat
 * wenigstens stabil und reproduzierbar aufgeloest wird.
 */

import { LOCATION_TREATMENT_PAGE_UID } from "./locationTreatmentPageBlocks";

type RelationRef = { documentId: string } | { id: number } | null;

function scalarToRef(value: string | number): RelationRef {
  if (typeof value === "number") return { id: value };
  // Reine Ziffernfolgen sind DB-IDs; documentIds sind alphanumerisch.
  return /^\d+$/.test(value) ? { id: Number(value) } : { documentId: value };
}

/**
 * Normalisiert die vielen Formen, in denen eine manyToOne-Relation im
 * Lifecycle-Payload ankommen kann (documentId, id, Array, connect/set).
 */
function toRelationRef(value: any): RelationRef {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number") {
    return scalarToRef(value);
  }
  if (Array.isArray(value)) return toRelationRef(value[0]);
  if (typeof value === "object") {
    if (Array.isArray(value.set)) return toRelationRef(value.set[0]);
    if (Array.isArray(value.connect)) return toRelationRef(value.connect[0]);
    if (typeof value.documentId === "string") {
      return { documentId: value.documentId };
    }
    if (typeof value.id === "string" || typeof value.id === "number") {
      return scalarToRef(value.id);
    }
  }
  return null;
}

async function loadCurrentRow(strapi: any, rowId: number) {
  try {
    return await strapi.db.query(LOCATION_TREATMENT_PAGE_UID).findOne({
      where: { id: rowId },
      select: ["id", "documentId"],
      populate: {
        location: { select: ["id"] },
        treatmentPage: { select: ["id"] },
      },
    });
  } catch {
    return null;
  }
}

/**
 * Wirft, wenn fuer dieselbe Kombination aus Standort und Behandlungsseite
 * bereits ein ANDERES Dokument existiert.
 */
export async function assertNoDuplicateOverride(event: any): Promise<void> {
  const strapi = (global as any).strapi;
  if (!strapi?.db) return;

  const data = event?.params?.data ?? {};
  const whereId =
    typeof event?.params?.where?.id === "number"
      ? event.params.where.id
      : undefined;

  let locationRef = toRelationRef(data.location);
  let treatmentPageRef = toRelationRef(data.treatmentPage);
  let documentId: string | undefined =
    typeof data.documentId === "string" ? data.documentId : undefined;

  // Bei Updates stehen Relationen/documentId oft nicht im Payload -> aus der
  // bestehenden Zeile nachladen.
  if (whereId !== undefined && (!locationRef || !treatmentPageRef || !documentId)) {
    const current = await loadCurrentRow(strapi, whereId);
    if (current) {
      locationRef = locationRef ?? toRelationRef(current.location);
      treatmentPageRef = treatmentPageRef ?? toRelationRef(current.treatmentPage);
      documentId =
        documentId ??
        (typeof current.documentId === "string" ? current.documentId : undefined);
    }
  }

  // Nicht bestimmbar -> nicht blockieren (fail-open, aber nur fuer diesen
  // Komfort-Guard; es geht hier nicht um Datenverlust).
  if (!locationRef || !treatmentPageRef) return;

  const rows = await strapi.db.query(LOCATION_TREATMENT_PAGE_UID).findMany({
    select: ["id", "documentId"],
    where: {
      location: locationRef,
      treatmentPage: treatmentPageRef,
    },
    limit: 100,
  });

  const conflicts = (rows ?? []).filter((row: any) => {
    if (documentId && typeof row?.documentId === "string") {
      return row.documentId !== documentId;
    }
    return row?.id !== whereId;
  });

  if (conflicts.length === 0) return;

  const conflictLabel = String(conflicts[0]?.documentId ?? conflicts[0]?.id);

  throw new Error(
    "[location-treatment-page] Fuer diese Kombination aus Standort und " +
      "Behandlungsseite existiert bereits ein Override (" +
      conflictLabel +
      "). Pro Standort x Behandlungsseite ist nur EIN Datensatz erlaubt - " +
      "bitte den bestehenden Eintrag bearbeiten statt einen neuen anzulegen."
  );
}
