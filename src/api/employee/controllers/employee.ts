/**
 * employee controller
 */

import { factories } from "@strapi/strapi";
import type { Context } from "koa";
import { mediaPopulate } from "../../../utils/queries/strapi";
import {
  locationTeaserPopulate,
  reviewTeaserPopulate,
  treatmentTeaserPopulate,
} from "../../../utils/queries/ui";
import { getPreviewStatus } from "../../../utils/previewStatus";

export default factories.createCoreController(
  "api::employee.employee",
  ({ strapi }) => ({
    async findBySlug(ctx: Context) {
      const { slug } = ctx.params as { slug: string };
      const { locale } = ctx.query as { locale?: string };
      const status = getPreviewStatus(ctx);

      const employee = await strapi
        .documents("api::employee.employee")
        .findFirst({
          locale,
          status,
          filters: {
            slug: {
              $eq: slug,
            },
            hideFromPublic: {
              $eq: false,
            },
          },
          fields: [
            "firstName",
            "lastName",
            "slug",
            "academicTitle",
            "role",
            "department",
            "employeeType",
            "aboutText",
            "isActive",
            "hideFromPublic",
          ],
          populate: {
            localizations: {
              fields: ["locale", "slug"],
            },
            photo: mediaPopulate as object,
            qualificationGroups: {
              populate: "*",
            },
            vitaEntries: {
              populate: "*",
            },
            locations: {
              ...(locationTeaserPopulate as object),
            },
            reviews: {
              ...(reviewTeaserPopulate as object),
            },
            treatmentSpecialties: {
              ...(treatmentTeaserPopulate as object),
            },
          },
        });

      if (!employee) {
        ctx.notFound("Employee not found");
        return;
      }

      return { data: employee };
    },
  })
);
