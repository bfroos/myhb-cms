/**
 * Routes for in-place write + media propagation + translation audit.
 */

export default {
  routes: [
    {
      method: "POST",
      path: "/cms-update-entry",
      handler: "api::treatment-page.cms-write.updateEntry",
      config: { policies: [], middlewares: [] },
    },
    {
      method: "POST",
      path: "/cms-propagate-media",
      handler: "api::treatment-page.cms-write.propagateMedia",
      config: { policies: [], middlewares: [] },
    },
    {
      method: "GET",
      path: "/cms-audit-translations",
      handler: "api::treatment-page.cms-write.auditTranslations",
      config: { auth: false, policies: [], middlewares: [] },
    },
  ],
};
