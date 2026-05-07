export default {
  routes: [
    {
      method: "GET",
      path: "/price-teasers/context",
      handler: "api::price-teaser.price-teaser.findContext",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
