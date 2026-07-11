/**
 * One-off migration: create a `Price` entry for every existing `Treatment`.
 *
 * For each treatment (default locale, published version):
 *   - basePrice     = priceInEuroCent / 100
 *   - startingPrice = isStartingPrice ? basePrice : null
 *   - title         = treatment.name
 *   - order         = 0
 *   - isActive      = true
 *   - treatmentCategory = <treatment documentId>
 *
 * Safety characteristics:
 *   - Idempotent: treatments that already have at least one linked price are skipped.
 *   - Treatments whose priceInEuroCent is missing or <= 0 are skipped and reported,
 *     because the Price lifecycle enforces basePrice > 0 (a 0 EUR price would be
 *     rejected). Review these manually.
 *
 * IMPORTANT: Run this ONLY after the schema changes in this PR are deployed,
 * so that the `api::price.price` content-type actually exists.
 *
 * Usage (from the project root):
 *   npx tsx ./scripts/migrate-treatment-prices.ts
 * or compile and run with the Strapi runtime available.
 */

import { compileStrapi, createStrapi } from '@strapi/strapi';

// Default content locale. Adjust if your primary locale differs.
const LOCALE = 'de';

async function migrate(): Promise<void> {
  const app = await createStrapi(await compileStrapi()).load();

  const created: string[] = [];
  const skippedExisting: string[] = [];
  const skippedNoPrice: string[] = [];

  try {
    const treatments = await app.documents('api::treatment.treatment').findMany({
      locale: LOCALE,
      status: 'published',
      fields: ['name', 'priceInEuroCent', 'isStartingPrice'],
      populate: { prices: { fields: ['documentId'] } },
      // -1 => no pagination limit (return all)
      pagination: { limit: -1 },
    } as any);

    app.log.info(`Found ${treatments.length} treatment(s) in locale "${LOCALE}".`);

    for (const treatment of treatments as any[]) {
      const label = `${treatment.name ?? '(no name)'} [${treatment.documentId}]`;

      // Idempotency guard.
      if (Array.isArray(treatment.prices) && treatment.prices.length > 0) {
        skippedExisting.push(label);
        continue;
      }

      const cents = Number(treatment.priceInEuroCent ?? 0);
      if (!Number.isFinite(cents) || cents <= 0) {
        skippedNoPrice.push(label);
        continue;
      }

      const basePrice = cents / 100;
      const startingPrice = treatment.isStartingPrice ? basePrice : null;

      await app.documents('api::price.price').create({
        locale: LOCALE,
        status: 'published',
        data: {
          title: treatment.name,
          basePrice,
          startingPrice,
          order: 0,
          isActive: true,
          treatmentCategory: treatment.documentId,
        },
      } as any);

      created.push(label);
    }

    app.log.info('--- Migration summary ---');
    app.log.info(`Created:          ${created.length}`);
    app.log.info(`Skipped (exists): ${skippedExisting.length}`);
    app.log.info(`Skipped (no/<=0 price): ${skippedNoPrice.length}`);

    if (skippedNoPrice.length > 0) {
      app.log.warn(`Treatments skipped due to missing/zero price:\n  - ${skippedNoPrice.join('\n  - ')}`);
    }
  } finally {
    await app.destroy();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
