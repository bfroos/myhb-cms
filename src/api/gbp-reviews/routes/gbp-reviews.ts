export default {
  routes: [
    {
      method: "GET",
      path: "/gbp-reviews",
      handler: "gbp-reviews.index",
      config: {
        auth: false,
      },
    },
  ],
};
