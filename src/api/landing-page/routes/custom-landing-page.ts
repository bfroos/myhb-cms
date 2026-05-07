export default {
  routes: [
    {
      method: "GET",
      path: "/landing-pages/by-slug/:slug",
      handler: "landing-page.findBySlug",
    },
  ],
};
