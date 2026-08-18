/**
 * Location-Treatment-Page-Overrides - Ermittlung der ueberschreibbaren Bloecke.
 *
 * Statt einer handgepflegten Key-Liste im Controller (die zwangslaeufig
 * gegenueber schema.json auseinanderlaeuft) werden die ueberschreibbaren Keys
 * zur Laufzeit aus dem Content-Type-Schema abgeleitet: alles, was Component
 * oder Dynamic Zone ist - ausser den Steuerfeldern (blockOrder, hiddenBlocks).
 *
 * Damit ist schema.json die einzige Quelle der Wahrheit. Wer dem Content-Type
 * ein neues Block-Feld hinzufuegt, muss den Controller nicht mehr anfassen.
 *
 * Hinweis: Die Enum-Werte in components/location-treatment-page/block-ref.json
 * sind bewusst eine OBERMENGE dieser Keys - sortiert und ausgeblendet werden
 * koennen auch Bloecke, die vom Standort selbst kommen (locationContact,
 * aboutLocation, locationDirections) und daher nicht ueberschreibbar sind.
 */

export const LOCATION_TREATMENT_PAGE_UID =
  "api::location-treatment-page.location-treatment-page";

/**
 * Steuerfelder: gleiche Component wie ein Block-Ref, aber KEIN Inhaltsblock.
 * Duerfen nie als Override auf die Basisseite gemappt werden.
 */
const NON_BLOCK_COMPONENT_KEYS = new Set<string>([
  "blockOrder",
  "hiddenBlocks",
]);

let cachedKeys: string[] | null = null;

/**
 * Alle Keys des Override-Content-Types, die einen Block der Basisseite
 * ersetzen koennen. Ergebnis wird prozessweit gecacht (Schema ist statisch).
 */
export function getOverridableBlockKeys(strapi: any): string[] {
  if (cachedKeys) return cachedKeys;

  const attributes =
    strapi?.contentType?.(LOCATION_TREATMENT_PAGE_UID)?.attributes ?? {};

  cachedKeys = Object.entries(attributes)
    .filter(([key, attribute]: [string, any]) => {
      if (NON_BLOCK_COMPONENT_KEYS.has(key)) return false;
      return (
        attribute?.type === "component" || attribute?.type === "dynamiczone"
      );
    })
    .map(([key]) => key);

  return cachedKeys;
}

/**
 * Ein Wert gilt nur dann als "ueberschrieben", wenn er tatsaechlich Inhalt hat.
 *
 * Wichtig fuer Dynamic Zones und repeatable Components: Strapi liefert dort ein
 * LEERES ARRAY (nicht null), wenn nichts gepflegt wurde. Ohne diese Pruefung
 * wuerde ein Override-Datensatz, der nur den Hero anpasst, die Bloecke der
 * Basisseite mit [] ueberschreiben - die Seite waere danach leer.
 */
export function isOverridden(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Wandelt ein block-ref-Repeatable (blockOrder / hiddenBlocks) in eine flache
 * Key-Liste. Leere Listen werden zu null normalisiert, damit das Frontend sie
 * nicht als "keine Bloecke anzeigen" bzw. "nichts ausblenden" verwechselt -
 * null heisst eindeutig "nicht gepflegt".
 */
export function toBlockRefKeys(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const keys = Array.from(
    new Set(
      value
        .map((entry: any) => entry?.key)
        .filter(
          (key: any): key is string =>
            typeof key === "string" && key.length > 0
        )
    )
  );

  return keys.length > 0 ? keys : null;
}
