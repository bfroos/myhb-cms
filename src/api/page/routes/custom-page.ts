export default {
  routes: [
    {
      method: 'GET',
      path: '/pages/by-slug/:slug',
      handler: 'api::page.page.findBySlug',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};

