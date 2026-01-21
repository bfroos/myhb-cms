/**
 * menu routes
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/menu",
      handler: "api::menu.menu.getMenus",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
