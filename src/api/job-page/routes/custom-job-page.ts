/**
 * Custom job-page routes
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/job-pages/:jobSlug",
      handler: "api::job-page.job-page.findByJobSlug",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
