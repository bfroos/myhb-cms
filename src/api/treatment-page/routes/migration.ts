/**
 * One-time migration route. Remove together with controllers/migration.ts
 * once the parent-relation migration has run.
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/migrate-treatment-parents",
      handler: "api::treatment-page.migration.migrateParents",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
