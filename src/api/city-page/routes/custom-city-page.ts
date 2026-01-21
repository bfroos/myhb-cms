export default {
  routes: [
    {
      method: "GET",
      path: "/city-page/:citySlug/with-locations",
      handler: "api::city-page.city-page.findByCitySlugWithLocations",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
