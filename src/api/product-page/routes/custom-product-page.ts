/**
 * Custom product-page routes
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/product-pages/:productSlug",
      handler: "api::product-page.product-page.findByProductSlug",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
