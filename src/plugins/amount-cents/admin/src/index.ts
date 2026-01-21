import type { StrapiApp } from '@strapi/strapi/admin';

export default {
  register(app: StrapiApp) {
    app.customFields.register({
      name: 'price',
      pluginId: 'amount-cents',
      type: 'integer', // stored as integer cents
      intlLabel: {
        id: 'amount-cents.price.label',
        defaultMessage: 'Preis (in €)',
      },
      intlDescription: {
        id: 'amount-cents.price.description',
        defaultMessage: 'Preis mit Cent (z. B. 12,99 €)',
      },
      components: {
        Input: async () =>
          import('./components/PriceInput').then((module) => ({
            default: module.Input,
          })),
      },
      options: {
        base: [],
        advanced: [],
      },
    });
  },
};
