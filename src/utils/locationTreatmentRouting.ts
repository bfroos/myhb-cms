/**
 * Standort-Konsolidierung innerhalb einer Stadt (Ticket "Standortarchitektur
 * Köln konsolidieren").
 *
 * Problem vorher: `/treatment-pages/:city/:location/:pathKey` lieferte JEDE
 * Behandlung an JEDEM Standort mit 200 aus. In Köln gab es dadurch jede
 * nichtoperative Behandlung doppelt (Köln Arcaden + MediaPark Klinik) und
 * jede Schönheits-OP doppelt (MediaPark + Köln Arcaden).
 *
 * Regel (zentral, datengetrieben, keine URL-Listen):
 *
 *   Innerhalb einer Stadt bedient eine Behandlungsart genau der Standort mit
 *   dem "kleinsten" Standorttyp, der diese Behandlungsart anbieten darf.
 *
 *     lounge  < center < clinic
 *     minimally-invasive -> lounge   (Köln Arcaden)
 *     abulatory          -> center, sonst clinic (MediaPark Klinik)
 *     operational        -> clinic   (MediaPark Klinik)
 *
 * Ein Standort, der eine Behandlungsart NICHT bedient, leitet per 301 auf den
 * bedienenden Standort derselben Stadt um - aber nur, wenn es genau EINEN
 * bedienenden Standort gibt (eindeutiges Ziel). Gibt es in der Stadt keinen
 * anderen passenden Standort, bleibt alles wie bisher ("unchanged"). Damit
 * aendert sich heute ausschliesslich Köln (einzige Stadt mit Lounge + Klinik).
 *
 * Behandlungsart einer Seite ("effektiver Typ"): der Typ der eigenen
 * Behandlung. Ist eine Seite als minimally-invasive gepflegt, liegt aber in
 * einer Hauptkategorie (pathKey-Segment 1) mit (ambulant-)operativen
 * Behandlungen, gilt sie mindestens als deren kleinster operativer Typ.
 * Hintergrund: In Strapi stehen "Facelift" und der Kategorie-Hub
 * "Schönheits-OPs" auf minimally-invasive; ohne diese Kategorie-Regel landete
 * das Facelift in der Lounge. Die Regel macht die Zuordnung robust gegen
 * einzelne falsch gepflegte Typen; die Typen sollten trotzdem korrigiert
 * werden (siehe docs/koeln-konsolidierung).
 *
 * Diese Datei ist bewusst frei von Strapi-Abhaengigkeiten (reine Funktionen,
 * Unit-Tests in locationTreatmentRouting.test.ts).
 */

export type LocationType = "lounge" | "center" | "clinic";
export type TreatmentType = "minimally-invasive" | "abulatory" | "operational";

// Which treatment types a location type may offer at all.
export const LOCATION_TYPE_TO_TREATMENT_TYPES: Record<
  LocationType,
  TreatmentType[]
> = {
  lounge: ["minimally-invasive"],
  center: ["minimally-invasive", "abulatory"],
  clinic: ["minimally-invasive", "abulatory", "operational"],
};

const LOCATION_RANK: Record<LocationType, number> = {
  lounge: 0,
  center: 1,
  clinic: 2,
};

const TREATMENT_RANK: Record<TreatmentType, number> = {
  "minimally-invasive": 0,
  abulatory: 1,
  operational: 2,
};

export type CityLocationRef = {
  documentId: string;
  slug: string;
  name?: string;
  type: LocationType | string | null | undefined;
  citySlug: string;
  /** false = coming soon (no opening date) - never a redirect target. */
  isOpen?: boolean;
};

export type TreatmentPageTypeRef = {
  pathKey: string;
  type: TreatmentType | string | null | undefined;
};

export type LocationTreatmentDecision =
  | { kind: "served" }
  | { kind: "redirect"; target: CityLocationRef }
  | { kind: "unchanged" };

function isLocationType(value: unknown): value is LocationType {
  return value === "lounge" || value === "center" || value === "clinic";
}

function isTreatmentType(value: unknown): value is TreatmentType {
  return (
    value === "minimally-invasive" ||
    value === "abulatory" ||
    value === "operational"
  );
}

export function locationAllowsTreatmentType(
  locationType: unknown,
  treatmentType: unknown,
): boolean {
  if (!isLocationType(locationType) || !isTreatmentType(treatmentType)) {
    return false;
  }
  return LOCATION_TYPE_TO_TREATMENT_TYPES[locationType].includes(treatmentType);
}

export function topCategoryOf(pathKey: string): string {
  return (pathKey || "").split("/").filter(Boolean)[0] ?? "";
}

/**
 * pathKey -> effektiver Behandlungstyp (Kategorie-Regel, siehe Kopfkommentar).
 * Seiten ohne gueltigen Typ bekommen den Typ ihrer Kategorie; Kategorien ohne
 * jeden gueltigen Typ fehlen in der Map (=> keine Konsolidierung).
 */
export function buildEffectiveTypeIndex(
  pages: TreatmentPageTypeRef[],
): Map<string, TreatmentType> {
  // Kleinster NICHT-minimalinvasive Typ je Hauptkategorie (z. B.
  // "schoenheitsoperationen" -> abulatory, weil dort Haartransplantation
  // (abulatory) und Fettabsaugung (operational) liegen).
  const categoryInvasive = new Map<string, TreatmentType>();
  for (const page of pages) {
    if (!page?.pathKey || !isTreatmentType(page.type)) continue;
    if (page.type === "minimally-invasive") continue;
    const category = topCategoryOf(page.pathKey);
    const current = categoryInvasive.get(category);
    if (!current || TREATMENT_RANK[page.type] < TREATMENT_RANK[current]) {
      categoryInvasive.set(category, page.type);
    }
  }

  const index = new Map<string, TreatmentType>();
  for (const page of pages) {
    if (!page?.pathKey) continue;
    const own = isTreatmentType(page.type) ? page.type : undefined;
    const invasive = categoryInvasive.get(topCategoryOf(page.pathKey));
    // Eigener (ambulant-)operativer Typ bleibt. Eine als minimalinvasiv (oder
    // gar nicht) gepflegte Seite in einer OP-Kategorie gilt mindestens als
    // deren kleinster operativer Typ (Facelift, Kategorie-Hub "Schönheits-OPs").
    const effective =
      own && own !== "minimally-invasive" ? own : invasive ?? own;
    if (effective) index.set(page.pathKey, effective);
  }
  return index;
}

/**
 * Standorte einer Stadt, die eine Behandlungsart bedienen: alle geoeffneten
 * Standorte mit dem kleinsten Rang, deren Typ die Behandlungsart erlaubt.
 */
export function servingLocations(
  cityLocations: CityLocationRef[],
  treatmentType: TreatmentType,
): CityLocationRef[] {
  const candidates = cityLocations.filter(
    (location) =>
      location.isOpen !== false &&
      locationAllowsTreatmentType(location.type, treatmentType),
  );
  if (candidates.length === 0) return [];
  const minRank = Math.min(
    ...candidates.map((location) => LOCATION_RANK[location.type as LocationType]),
  );
  return candidates.filter(
    (location) => LOCATION_RANK[location.type as LocationType] === minRank,
  );
}

/**
 * Entscheidung fuer "Behandlung X am Standort L":
 *   served    -> L bedient X (Seite 200, in Karten/Sitemap)
 *   redirect  -> genau ein anderer Standort derselben Stadt bedient X
 *   unchanged -> keine eindeutige Alternative in der Stadt; Verhalten wie
 *                bisher (bewusst: keine Aenderung an anderen Staedten)
 */
export function decideLocationTreatment(
  location: CityLocationRef,
  cityLocations: CityLocationRef[],
  treatmentType: TreatmentType | null | undefined,
): LocationTreatmentDecision {
  if (!treatmentType || !isTreatmentType(treatmentType)) {
    return { kind: "unchanged" };
  }
  const sameCity = cityLocations.filter(
    (candidate) => candidate.citySlug === location.citySlug,
  );
  const serving = servingLocations(sameCity, treatmentType);
  if (serving.some((candidate) => candidate.documentId === location.documentId)) {
    return { kind: "served" };
  }
  if (serving.length === 1) {
    return { kind: "redirect", target: serving[0] };
  }
  return { kind: "unchanged" };
}

/**
 * Filtert eine Liste von pathKeys auf die, die an `location` NICHT an einen
 * anderen Standort abgegeben werden (served + unchanged).
 */
export function keepPathKeysForLocation(
  pathKeys: string[],
  location: CityLocationRef,
  cityLocations: CityLocationRef[],
  typeIndex: Map<string, TreatmentType>,
): string[] {
  return pathKeys.filter(
    (pathKey) =>
      decideLocationTreatment(location, cityLocations, typeIndex.get(pathKey))
        .kind !== "redirect",
  );
}

/**
 * pathKey -> "citySlug/locationSlug" fuer alle Behandlungen, die in der Stadt
 * von einem ANDEREN Standort bedient werden. Grundlage fuer Querverlinkung
 * (relatedTreatments) und den Hinweis auf der Standortseite.
 */
export function siblingLocationPathKeys(
  pathKeys: string[],
  location: CityLocationRef,
  cityLocations: CityLocationRef[],
  typeIndex: Map<string, TreatmentType>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pathKey of pathKeys) {
    const decision = decideLocationTreatment(
      location,
      cityLocations,
      typeIndex.get(pathKey),
    );
    if (decision.kind === "redirect") {
      result[pathKey] = `${decision.target.citySlug}/${decision.target.slug}`;
    }
  }
  return result;
}
