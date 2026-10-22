export default {
  routes: [
    {
      method: "GET",
      path: "/landing-pages/by-slug/:slug",
      handler: "landing-page.findBySlug",
      // Die Website liest Strapi ohne Token. Ohne diese Freigabe antwortet die
      // Route mit 403 und /lp/<slug> bricht ab (E28, 23.10.2026).
      config: {
        auth: false,
      },
    },
  ],
};
