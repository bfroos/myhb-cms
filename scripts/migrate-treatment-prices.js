'use strict';

/**
 * Einmalige Datenmigration: Legacy-Preisfelder -> Price Collection-Type
 * ---------------------------------------------------------------------
 * Ueberfuehrt die DEPRECATED-Felder `treatment.priceInEuroCent`
 * (Custom-Field amount-cents, Wert in Cent, Integer) und
 * `treatment.isStartingPrice` (boolean) in je einen Eintrag der neuen
 * `price` Collection und verknuepft ihn ueber die Relation
 * `treatmentCategory` mit der Behandlung.
 *
 * Eigenschaften:
 *   - Idempotent: Behandlungen, die bereits >=1 verknuepften Preis haben,
 *     werden uebersprungen. Das Skript kann gefahrlos mehrfach laufen.
 *   - i18n-fest: erzeugt den Preis in der Default-Locale (de) und legt
 *     Lokalisierungen fuer alle weiteren Locales an (Titel = Name der
 *     Behandlung in der jeweiligen Sprache). Nicht-lokalisierte Felder
 *     (basePrice, order, isActive, Relation) gelten sprachuebergreifend.
 *   - DRY_RUN: mit `DRY_RUN=1` wird nichts geschrieben, nur geloggt.
 *
 * Ausfuehrung (im CMS-Projektverzeichnis):
 *   DRY_RUN=1 node scripts/migrate-treatment-prices.js   # Testlauf
 *   node scripts/migrate-treatment-prices.js             # echte Migration
 *
 * Voraussetzung: Das price-Schema + die treatment.prices-Relation muessen
 * bereits deployed/migriert sein (Strapi einmal gebaut/gestartet haben).
 *
 * WICHTIG: Die alten Felder werden NICHT geloescht. Sie bleiben als
 * DEPRECATED erhalten, bis das Frontend vollstaendig auf die Relation
 * umgestellt ist. Entfernung erst in einem spaeteren, separaten Schritt.
 */

const { createStrapi, compileStrapi } = require('@strapi/strapi');

const TREATMENT_UID = 'api::treatment.treatment';
const PRICE_UID = 'api::price.price';

const DEFAULT_LOCALE = 'de';
const LOCALES = ['de', 'fr', 'nl'];
const PAGE_SIZE = 100;
const DRY_RUN = process.env.DRY_RUN === '1';

async function migrate(app) {
  const docs = app.documents;
  let created = 0;
  let skipped = 0;
  let start = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const treatments = await docs(TREATMENT_UID).findMany({
      locale: DEFAULT_LOCALE,
      status: 'published',
      fields: ['name', 'priceInEuroCent', 'isStartingPrice'],
      populate: { prices: { fields: ['id'] } },
      start,
      limit: PAGE_SIZE,
    });

    if (!treatments || treatments.length === 0) break;

    for (const t of treatments) {
      const cents = t.priceInEuroCent;

      // Kein Legacy-Preis vorhanden -> nichts zu migrieren
      if (cents === null || cents === undefined) {
        skipped++;
        continue;
      }

      // Bereits migriert (hat schon Preise) -> ueberspringen (idempotent)
      if (Array.isArray(t.prices) && t.prices.length > 0) {
        skipped++;
        continue;
      }

      const basePrice = Number((cents / 100).toFixed(2));
      const priceSuffix = t.isStartingPrice ? 'ab' : null;

      if (DRY_RUN) {
        strapi.log.info(
          `[DRY] Price fuer ${t.documentId} "${t.name}": ${basePrice} EUR` +
            (priceSuffix ? ` (Suffix "${priceSuffix}")` : '')
        );
        created++;
        continue;
      }

      // 1) Preis in Default-Locale anlegen + Relation setzen
      const price = await docs(PRICE_UID).create({
        locale: DEFAULT_LOCALE,
        data: {
          title: t.name,
          basePrice,
          priceSuffix,
          order: 0,
          isActive: true,
          treatmentCategory: { connect: [{ documentId: t.documentId }] },
        },
      });

      await docs(PRICE_UID).publish({
        documentId: price.documentId,
        locale: DEFAULT_LOCALE,
      });

      // 2) Lokalisierungen fuer weitere Sprachen
      for (const locale of LOCALES) {
        if (locale === DEFAULT_LOCALE) continue;

        const tl = await docs(TREATMENT_UID).findOne({
          documentId: t.documentId,
          locale,
          fields: ['name'],
        });
        if (!tl) continue; // keine Uebersetzung der Behandlung vorhanden

        await docs(PRICE_UID).update({
          documentId: price.documentId,
          locale,
          data: { title: tl.name, priceSuffix },
        });

        await docs(PRICE_UID).publish({
          documentId: price.documentId,
          locale,
        });
      }

      created++;
    }

    start += PAGE_SIZE;
  }

  return { created, skipped };
}

async function run() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  try {
    const { created, skipped } = await migrate(app);
    strapi.log.info(
      `Migration abgeschlossen. angelegt=${created} uebersprungen=${skipped} dryRun=${DRY_RUN}`
    );
  } catch (err) {
    strapi.log.error('Migration fehlgeschlagen:');
    strapi.log.error(err);
    await app.destroy();
    process.exit(1);
  }

  await app.destroy();
  process.exit(0);
}

run();
