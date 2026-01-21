export default {
  routes: [
    {
      method: "GET",
      path: "/locations-page/with-locations",
      handler: "api::locations-page.locations-page.findWithLocations",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
