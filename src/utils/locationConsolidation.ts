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
  return (locations || [])
    .map(toCityLocationRef)
    .filter((location: CityLocationRef | null): location is CityLocationRef =>
      Boolean(location),
    );
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

export async function loadConsolidationContext(
  strapi: any,
  params: LoadParams,
): Promise<ConsolidationContext> {
  const [cityLocations, typeIndex] = await Promise.all([
    loadCityLocations(strapi, params),
    loadEffectiveTypeIndex(strapi, params),
  ]);
  return { cityLocations, typeIndex };
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
