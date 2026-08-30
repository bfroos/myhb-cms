import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { compileStrapi, createStrapi } = require("@strapi/core");

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const OUT = arg("out", "../_local/translations.ndjson");
const LOCALES = arg("locales", "en,tr,ar,fr,nl").split(",").filter(Boolean);
const LIMIT = Number(arg("limit", "0")) || Infinity;
const TYPES = arg("types", "api::treatment-page.treatment-page")
  .split(",")
  .filter(Boolean);
const SOURCE_LOCALE = "de";

if (LOCALES.includes(SOURCE_LOCALE)) {
  console.error("German is the source locale and is never exported.");
  process.exit(1);
}

const SYSTEM_KEYS = new Set([
  "id", "documentId", "createdAt", "updatedAt", "publishedAt", "locale",
  "createdBy", "updatedBy", "localizations", "strapi_stage", "strapi_assignee",
]);

const PRICE_KEY = /(^|[a-z])(price|amount|cents)/i;

const app = await createStrapi(await compileStrapi()).load();
const populateBuilder = app.plugin("content-manager").service("populate-builder");

// uid -> { path, localized }. The injector needs this to check whether a
// relation target exists in the destination locale before sending it.
const legend = {};
const noteTarget = (uid) => {
  if (legend[uid] || !uid) return;
  const ct = app.contentType(uid);
  if (!ct) return;
  legend[uid] = {
    path: ct.kind === "singleType" ? ct.info.singularName : ct.info.pluralName,
    localized: !!ct.pluginOptions?.i18n?.localized,
  };
};

const refRelation = (x, target) =>
  x && typeof x === "object" && x.documentId
    ? { __relation: x.documentId, __t: target }
    : undefined;
const refMedia = (x) =>
  x && typeof x === "object" && x.documentId ? { __media: x.documentId } : undefined;

function portableAttr(item, attr, path, prices) {
  if (item === null || item === undefined) return item;

  switch (attr.type) {
    case "relation": {
      noteTarget(attr.target);
      return Array.isArray(item)
        ? item.map((x) => refRelation(x, attr.target)).filter(Boolean)
        : refRelation(item, attr.target);
    }
    case "media":
      return Array.isArray(item)
        ? item.map(refMedia).filter(Boolean)
        : refMedia(item);
    case "component": {
      const schema = app.components[attr.component];
      return Array.isArray(item)
        ? item.map((x, i) => portable(x, schema, `${path}[${i}]`, prices))
        : portable(item, schema, path, prices);
    }
    case "dynamiczone":
      if (!Array.isArray(item)) return undefined;
      return item.map((x, i) =>
        portable(x, app.components[x.__component], `${path}[${i}]`, prices),
      );
    default:
      return item;
  }
}

function portable(value, schema, path, prices) {
  if (!value || typeof value !== "object") return value;
  const out = {};
  if (typeof value.__component === "string") out.__component = value.__component;
  for (const [key, item] of Object.entries(value)) {
    if (key === "__component") continue;
    if (SYSTEM_KEYS.has(key)) continue;

    const attr = schema?.attributes?.[key];
    if (!attr) continue;

    const next = path ? `${path}.${key}` : key;

    if (PRICE_KEY.test(key) && (typeof item === "number" || typeof item === "string")) {
      prices.push({ path: next, value: item });
      continue;
    }

    const built = portableAttr(item, attr, next, prices);
    if (built !== undefined) out[key] = built;
  }
  return out;
}

const fingerprint = (entry) =>
  Array.isArray(entry?.blocks)
    ? entry.blocks.map((b) => b.__component).join(">")
    : "";

const rows = [];
let records = 0;
let priceFields = 0;

for (const uid of TYPES) {
  const populate = await populateBuilder(uid).populateDeep(Infinity).build();
  const docs = app.documents(uid);

  const contentType = app.contentType(uid);
  const isSingle = contentType?.kind === "singleType";
  const apiPath = isSingle
    ? contentType?.info?.singularName
    : contentType?.info?.pluralName;
  if (!apiPath) {
    console.error(`No REST path for ${uid}; skipping.`);
    continue;
  }

  const german = isSingle
    ? [await docs.findFirst({ locale: SOURCE_LOCALE, status: "published" })].filter(Boolean)
    : await docs.findMany({ locale: SOURCE_LOCALE, status: "published", limit: 5000 });
  const scope = LIMIT === Infinity ? german : german.slice(0, LIMIT);

  for (const locale of LOCALES) {
    let written = 0;
    let missing = 0;

    for (const source of scope) {
      // findOne returns null when the locale simply does not exist. Anything
      // that throws is a real fault and must not be filed as "no translation".
      let entry;
      try {
        entry = await docs.findOne({
          documentId: source.documentId,
          locale,
          status: "published",
          populate,
        });
      } catch (error) {
        throw new Error(
          `export failed on ${uid} ${source.documentId} (${locale}): ${error.message}`,
        );
      }

      if (!entry) { missing += 1; continue; }

      const prices = [];
      const data = portable(entry, contentType, "", prices);
      priceFields += prices.length;

      rows.push(JSON.stringify({
        uid,
        apiPath,
        kind: contentType.kind,
        documentId: source.documentId,
        locale,
        name: source.name ?? null,
        snapshotAt: entry.updatedAt,
        fingerprint: fingerprint(entry),
        prices,
        data,
      }));

      written += 1;
      records += 1;
    }

    console.log(`${locale}  ${uid}  exported=${written}  noTranslation=${missing}`);
  }
}

const out = fs.createWriteStream(OUT, { encoding: "utf8" });
out.write(
  JSON.stringify({ __legend: legend, __exportedAt: new Date().toISOString() }) + "\n",
);
for (const row of rows) out.write(row + "\n");
out.end();
await new Promise((resolve) => out.on("finish", resolve));

console.log(`\nRESULT ${JSON.stringify({ records, priceFields, targets: Object.keys(legend).length, out: OUT })}`);

await app.destroy();
