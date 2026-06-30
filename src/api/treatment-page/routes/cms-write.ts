/**
 * Routes for the in-place write endpoints (prevention + media propagation).
 * Requires a valid Strapi API token (default auth). uid allowlist enforced in
 * the controller.
 */

export default {
  routes: [
    {
      method: "POST",
      path: "/cms-update-entry",
      handler: "api::treatment-page.cms-write.updateEntry",
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/cms-propagate-media",
      handler: "api::treatment-page.cms-write.propagateMedia",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
