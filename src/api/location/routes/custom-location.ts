export default {
  routes: [
    {
      method: "GET",
      path: "/locations/with-calendly-url",
      handler: "api::location.location.findWithCalendlyUrl",
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "GET",
      path: "/locations/:citySlug/:locationSlug/with-treatments",
      handler: "api::location.location.findByCityAndSlugWithTreatments",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
