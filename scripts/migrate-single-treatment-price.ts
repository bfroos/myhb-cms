/**
 * SAFE SINGLE-TREATMENT test of the price migration.
 *
 * Creates exactly one `Price` entry for ONE treatment, so you can verify the
 * result in the admin/API before running the full migration over all 71.
 *
 * Defaults to the "Stirnfalte" treatment. Change TARGET_DOCUMENT_ID to test a
 * different one, or set DRY_RUN = true to only print what WOULD be created
 * without writing anything.
 *
 * Mapping (same as the full migration):
 *   basePrice     = priceInEuroCent / 100
 *   startingPrice = isStartingPrice ? basePrice : null
 *   title         = treatment.name
 *   order         = 0
 *   isActive      = true
 *   treatmentCategory = <treatment documentId>
 *
 * IMPORTANT: Run ONLY after the schema changes are deployed (the
 * `api::price.price` content-type must exist).
 *
 * Usage (from the project root):
 *   npx tsx ./scripts/migrate-single-treatment-price.ts
 */

import { compileStrapi, createStrapi } from '@strapi/strapi';

// Which treatment to migrate. Default: "Stirnfalte".
const TARGET_DOCUMENT_ID = 'pa5y0e7q6la1s5s8qf6snabi';

// Default content locale.
const LOCALE = 'de';

// Set to true to preview only, without writing anything.
const DRY_RUN = false;

async function migrateOne(): Promise<void> {
  const app = await createStrapi(await compileStrapi()).load();

  try {
    const treatment = await app.documents('api::treatment.treatment').findOne({
      documentId: TARGET_DOCUMENT_ID,
      locale: LOCALE,
      status: 'published',
      fields: ['name', 'priceInEuroCent', 'isStartingPrice'],
      populate: { prices: { fields: ['documentId'] } },
    } as any);

    if (!treatment) {
      app.log.error(`No treatment found for documentId "${TARGET_DOCUMENT_ID}" (locale "${LOCALE}").`);
      return;
    }

    const label = `${(treatment as any).name ?? '(no name)'} [${TARGET_DOCUMENT_ID}]`;

    // Idempotency guard.
    if (Array.isArray((treatment as any).prices) && (treatment as any).prices.length > 0) {
      app.log.warn(`Skipped: ${label} already has a linked price. Nothing to do.`);
      return;
    }

    const cents = Number((treatment as any).priceInEuroCent ?? 0);
    if (!Number.isFinite(cents) || cents <= 0) {
      app.log.warn(`Skipped: ${label} has no valid price (priceInEuroCent = ${cents}).`);
      return;
    }

    const basePrice = cents / 100;
    const startingPrice = (treatment as any).isStartingPrice ? basePrice : null;

    const payload = {
      title: (treatment as any).name,
      basePrice,
      startingPrice,
      order: 0,
      isActive: true,
      treatmentCategory: TARGET_DOCUMENT_ID,
    };

    if (DRY_RUN) {
      app.log.info(`[DRY RUN] Would create Price for ${label}:`);
      app.log.info(JSON.stringify(payload, null, 2));
      return;
    }

    const created = await app.documents('api::price.price').create({
      locale: LOCALE,
      status: 'published',
      data: payload,
    } as any);

    app.log.info(`Created Price for ${label}:`);
    app.log.info(JSON.stringify(created, null, 2));
  } finally {
    await app.destroy();
  }
}

migrateOne()
  .then(() => process.exit(0))
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
