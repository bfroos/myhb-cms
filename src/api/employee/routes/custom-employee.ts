/**
 * Custom employee routes
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/employees/by-slug/:slug",
      handler: "api::employee.employee.findBySlug",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
