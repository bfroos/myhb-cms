export default {
  routes: [
    {
      method: "GET",
      path: "/prices-page/with-product-categories",
      handler: "api::prices-page.prices-page.findWithProductCategories",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};

