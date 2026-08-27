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

const isMedia = (v) =>
  !!v && typeof v === "object" && typeof v.mime === "string" && "url" in v;
const isRelation = (v) =>
  !!v && typeof v === "object" && typeof v.documentId === "string";

function portable(value, path, prices, isRoot = false) {
  if (Array.isArray(value)) {
    return value.map((item, i) => portable(item, `${path}[${i}]`, prices));
  }
  if (!value || typeof value !== "object") return value;

  if (!isRoot) {
    if (isMedia(value)) return { __media: value.documentId };
    if (isRelation(value) && !value.__component) {
      return { __relation: value.documentId };
    }
  }

  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (SYSTEM_KEYS.has(key) && key !== "__component") continue;
    if (PRICE_KEY.test(key) && (typeof item === "number" || typeof item === "string")) {
      prices.push({ path: path ? `${path}.${key}` : key, value: item });
    }
    out[key] = portable(item, path ? `${path}.${key}` : key, prices);
  }
  return out;
}

const fingerprint = (entry) =>
  Array.isArray(entry?.blocks)
    ? entry.blocks.map((b) => b.__component).join(">")
    : "";

const app = await createStrapi(await compileStrapi()).load();
const populateBuilder = app.plugin("content-manager").service("populate-builder");

const out = fs.createWriteStream(OUT, { encoding: "utf8" });
let records = 0;
let priceFields = 0;

for (const uid of TYPES) {
  const populate = await populateBuilder(uid).populateDeep(Infinity).build();
  const docs = app.documents(uid);

  const apiPath = app.contentType(uid)?.info?.pluralName;
  if (!apiPath) {
    console.error(`No pluralName for ${uid}; skipping.`);
    continue;
  }

  const german = await docs.findMany({
    locale: SOURCE_LOCALE,
    status: "published",
    fields: ["name"],
    limit: 5000,
  });
  const scope = LIMIT === Infinity ? german : german.slice(0, LIMIT);

  for (const locale of LOCALES) {
    let written = 0;
    let missing = 0;

    for (const source of scope) {
      const entry = await docs
        .findOne({ documentId: source.documentId, locale, status: "published", populate })
        .catch(() => null);

      if (!entry) { missing += 1; continue; }

      const prices = [];
      const data = portable(entry, "", prices, true);
      priceFields += prices.length;

      out.write(JSON.stringify({
        uid,
        apiPath,
        documentId: source.documentId,
        locale,
        name: source.name ?? null,
        snapshotAt: entry.updatedAt,
        fingerprint: fingerprint(entry),
        prices,
        data,
      }) + "\n");

      written += 1;
      records += 1;
    }

    console.log(`${locale}  ${uid}  exported=${written}  noTranslation=${missing}`);
  }
}

out.end();
await new Promise((resolve) => out.on("finish", resolve));

console.log(`\nRESULT ${JSON.stringify({ records, priceFields, out: OUT })}`);

await app.destroy();
