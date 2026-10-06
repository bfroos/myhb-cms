/**
 * Strapi-Anbindung der Standort-Konsolidierung (Regel und Tests:
 * ./locationTreatmentRouting.ts).
 *
 * Laedt pro Request einmal
 *   - alle Standorte (Typ, Stadt, Eroeffnungsstatus) und
 *   - alle Behandlungen mit Behandlungsseite (pathKey + Typ),
 * und entscheidet daraus, welcher Standort einer Stadt eine Behandlung
 * bedient. Beides sind kleine Collections (~15 Standorte, ~80 Behandlungen).
 */

import { getLocationStatus } from "./locationStatus";
import {
  buildEffectiveTypeIndex,
  decideLocationTreatment,
  keepPathKeysForLocation,
  siblingLocationPathKeys,
  type CityLocationRef,
  type LocationTreatmentDecision,
  type TreatmentType,
} from "./locationTreatmentRouting";

type LoadParams = {
  locale?: string;
  status?: "published" | "draft";
};

export type ConsolidationContext = {
  cityLocations: CityLocationRef[];
  typeIndex: Map<string, TreatmentType>;
};

export function toCityLocationRef(location: any): CityLocationRef | null {
  const citySlug = location?.city?.slug;
  if (!location?.documentId || !location?.slug || !citySlug) return null;
  return {
    documentId: location.documentId,
    slug: location.slug,
    name: location.name,
    type: location.type,
    citySlug,
    isOpen:
      getLocationStatus(
        location.newOpeningDate,
        location.timezone || "Europe/Berlin",
      ) !== "comingSoon",
  };
}

export async function loadCityLocations(
  strapi: any,
  { locale, status }: LoadParams,
): Promise<CityLocationRef[]> {
  const locations = await strapi.documents("api::location.location").findMany({
    locale,
    status,
    fields: ["name", "slug", "type", "newOpeningDate", "timezone"],
    populate: { city: { fields: ["slug"] } },
    limit: 500,
  });
  // Je documentId nur ein Eintrag: Doppelte Zeilen (bei einer Abfrage ueber
  // REST mit locale=en kamen die Köln Arcaden sechsmal) liessen sonst zwei
  // "bedienende" Standorte entstehen, und die Umleitung fiele still weg.
  const byDocumentId = new Map<string, CityLocationRef>();
  for (const location of locations || []) {
    const ref = toCityLocationRef(location);
    if (ref && !byDocumentId.has(ref.documentId)) {
      byDocumentId.set(ref.documentId, ref);
    }
  }
  return Array.from(byDocumentId.values());
}

export async function loadEffectiveTypeIndex(
  strapi: any,
  { locale, status }: LoadParams,
): Promise<Map<string, TreatmentType>> {
  const treatments = await strapi.documents("api::treatment.treatment").findMany({
    locale,
    status,
    fields: ["type"],
    filters: { treatmentPage: { id: { $notNull: true } } },
    populate: { treatmentPage: { fields: ["pathKey"] } },
    limit: 1000,
  });
  return buildEffectiveTypeIndex(
    (treatments || [])
      .map((treatment: any) => ({
        pathKey: treatment?.treatmentPage?.pathKey,
        type: treatment?.type,
      }))
      .filter((page: any) => typeof page.pathKey === "string" && page.pathKey),
  );
}

// Kurzer Cache je locale/status: Der Kontext wird bei jeder Standort-
// Behandlungsseite, with-treatments und jedem Oeffnen des Buchungsdialogs
// (bookable) gebraucht, aendert sich aber nur bei Redaktionsarbeit.
const CONTEXT_TTL_MS = 60_000;
const contextCache = new Map<
  string,
  { expiresAt: number; value: Promise<ConsolidationContext> }
>();

export async function loadConsolidationContext(
  strapi: any,
  params: LoadParams,
): Promise<ConsolidationContext> {
  const key = `${params.locale ?? ""}:${params.status ?? ""}`;
  const cached = contextCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const value = Promise.all([
    loadCityLocations(strapi, params),
    loadEffectiveTypeIndex(strapi, params),
  ]).then(([cityLocations, typeIndex]) => ({ cityLocations, typeIndex }));
  contextCache.set(key, { expiresAt: Date.now() + CONTEXT_TTL_MS, value });
  // Fehlgeschlagene Ladungen nicht cachen.
  value.catch(() => contextCache.delete(key));
  return value;
}

export function decideForLocation(
  ctx: ConsolidationContext,
  location: any,
  pathKey: string,
): LocationTreatmentDecision {
  const ref = toCityLocationRef(location);
  if (!ref) return { kind: "unchanged" };
  return decideLocationTreatment(
    ref,
    ctx.cityLocations,
    ctx.typeIndex.get(pathKey),
  );
}

export function filterPathKeysForLocation(
  ctx: ConsolidationContext,
  location: any,
  pathKeys: string[],
): string[] {
  const ref = toCityLocationRef(location);
  if (!ref) return pathKeys;
  return keepPathKeysForLocation(pathKeys, ref, ctx.cityLocations, ctx.typeIndex);
}

export function siblingPathKeysForLocation(
  ctx: ConsolidationContext,
  location: any,
  pathKeys: string[],
): Record<string, string> {
  const ref = toCityLocationRef(location);
  if (!ref) return {};
  return siblingLocationPathKeys(pathKeys, ref, ctx.cityLocations, ctx.typeIndex);
}
