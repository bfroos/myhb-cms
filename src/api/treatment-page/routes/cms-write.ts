/**
 * Route for the in-place write endpoint (prevention for delete+recreate).
 * Requires a valid Strapi API token (default auth). Restricted uid allowlist
 * is enforced in the controller.
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
  ],
};
