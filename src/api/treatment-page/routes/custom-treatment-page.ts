/**
 * Custom treatment-page routes
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/treatment-pages/listed-grouped",
      handler:
        "api::treatment-page.treatment-page.findListedGroupedByTopParent",
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "GET",
      path: "/treatment-pages/by-path/:path(.*)",
      handler: "api::treatment-page.treatment-page.findByPath",
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "GET",
      path: "/treatment-pages/:citySlug/:locationSlug/:treatmentPathKey(.*)",
      handler: "api::treatment-page.treatment-page.findByLocationAndPath",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
