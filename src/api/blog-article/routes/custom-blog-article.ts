/**
 * Custom blog-article routes
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/blog-articles/by-slug/:slug",
      handler: "api::blog-article.blog-article.findBySlug",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
