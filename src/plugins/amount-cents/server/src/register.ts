import type { Core } from '@strapi/strapi';

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  // Register custom field on server side
  strapi.customFields.register({
    name: 'price',
    plugin: 'amount-cents',
    type: 'integer', // stored as integer cents
  });
};

export default register;
