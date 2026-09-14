const FAQ_UID = "api::faq.faq";
const FAQ_SET_UID = "api::faq-set.faq-set";
const MASTER_LOCALE = "de";
const SYNC_ACTIONS = new Set(["create", "update", "publish"]);

const uniqueDocumentIds = (items: any[] | undefined): string[] => [
  ...new Set<string>((items ?? []).map((item) => item?.documentId).filter(Boolean)),
];

async function findSetFaqIds(strapi: any, documentId: string, locale: string) {
  const set = await strapi.documents(FAQ_SET_UID).findOne({
    documentId,
    locale,
    fields: ["documentId"],
    populate: { faqs: { fields: ["documentId"] } },
  });
  return set ? uniqueDocumentIds(set.faqs) : null;
}

export async function syncFaqSetLocales(strapi: any, documentId: string, onlyLocale?: string) {
  const masterFaqIds = await findSetFaqIds(strapi, documentId, MASTER_LOCALE);
  if (!masterFaqIds) return;

  const locales: string[] = onlyLocale
    ? [onlyLocale]
    : (await strapi.plugin("i18n").service("locales").find())
        .map((locale: any) => locale.code)
        .filter((code: string) => code !== MASTER_LOCALE);

  for (const locale of locales) {
    const translated = masterFaqIds.length
      ? await strapi.documents(FAQ_UID).findMany({
          locale,
          status: "draft",
          fields: ["documentId"],
          filters: { documentId: { $in: masterFaqIds } },
        })
      : [];
    const available = new Set(uniqueDocumentIds(translated));
    const faqs = masterFaqIds.filter((id) => available.has(id));

    const current = await findSetFaqIds(strapi, documentId, locale);
    if (current && current.join() === faqs.join()) continue;

    await strapi.documents(FAQ_SET_UID).update({ documentId, locale, data: { faqs } });
  }
}

async function syncSetsContainingFaq(strapi: any, faqDocumentId: string, locale: string) {
  const sets = await strapi.documents(FAQ_SET_UID).findMany({
    locale: MASTER_LOCALE,
    fields: ["documentId"],
    filters: { faqs: { documentId: faqDocumentId } },
  });
  for (const set of sets) {
    await syncFaqSetLocales(strapi, set.documentId, locale);
  }
}

export function createFaqSetSyncMiddleware(strapi: any) {
  return async (context: any, next: any) => {
    const result = await next();
    const { uid, action, params } = context;
    if ((uid !== FAQ_SET_UID && uid !== FAQ_UID) || !SYNC_ACTIONS.has(action)) {
      return result;
    }

    const documentId: string | undefined = params?.documentId ?? result?.documentId;
    const locale =
      params?.locale ?? (await strapi.plugin("i18n").service("locales").getDefaultLocale());
    if (!documentId || typeof locale !== "string") return result;

    try {
      if (uid === FAQ_SET_UID && locale === MASTER_LOCALE) {
        await syncFaqSetLocales(strapi, documentId);
      } else if (uid === FAQ_UID && locale !== MASTER_LOCALE) {
        await syncSetsContainingFaq(strapi, documentId, locale);
      }
    } catch (err) {
      strapi.log.error(`[faq-set-sync] ${uid} ${documentId} (${locale}): ${err}`);
    }
    return result;
  };
}
