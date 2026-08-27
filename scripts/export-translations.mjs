/**
 * Exports translated entries from THIS Strapi instance into a portable bundle
 * that scripts/inject-translations.mjs can replay into another instance.
 *
 * Run it against the local copy, never against production:
 *   node scripts/export-translations.mjs --out=../_local/translations.ndjson
 *
 * Why a bundle instead of `strapi transfer`: transfer only moves data with
 * `--to`, which wipes the destination. This carries a narrow, reviewable slice
 * - non-German locales of documents that already exist on both sides - and can
 * never delete or create anything.
 *
 * The one thing that does NOT survive a move between instances is a numeric
 * media id. Local `files` ids run 912-1822 where production's start at 377,
 * while the media documentId is identical on both. So every media reference is
 * written out as its documentId and re-resolved on the far side; sending the
 * local number would silently attach the wrong image to every hero and teaser.
 */
import fs from "node:fs";
import { createRequire } from "node:module";

// @strapi/core ships an ESM build that directory-imports lodash/fp, which Node
// refuses to resolve. Its CommonJS build is fine, so load that one instead.
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

// Strapi manages these; sending them back would either be rejected or would
// overwrite the destination's own bookkeeping.
const SYSTEM_KEYS = new Set([
  "id", "documentId", "createdAt", "updatedAt", "publishedAt", "locale",
  "createdBy", "updatedBy", "localizations", "strapi_stage", "strapi_assignee",
]);

// Reported, never silently trusted. A price is a legal exposure on a German
// commercial site, so the injector prints every one it is about to write.
const PRICE_KEY = /(^|[a-z])(price|amount|cents)/i;

const isMedia = (v) =>
  !!v && typeof v === "object" && typeof v.mime === "string" && "url" in v;
const isRelation = (v) =>
  !!v && typeof v === "object" && typeof v.documentId === "string";

/**
 * Rewrites a populated entry into something portable: system keys dropped,
 * media and relations reduced to their documentId. Returns the cleaned value
 * plus every price path seen, so the caller can surface them.
 *
 * isRoot matters: a related document is recognised by carrying a documentId,
 * and the entry being exported carries one too. Without the guard the whole
 * entry collapses into a single relation sentinel.
 */
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
    // __component must survive: it tells the destination which component to
    // build for each dynamic-zone entry.
    if (SYSTEM_KEYS.has(key) && key !== "__component") continue;
    if (PRICE_KEY.test(key) && (typeof item === "number" || typeof item === "string")) {
      prices.push({ path: path ? `${path}.${key}` : key, value: item });
    }
    out[key] = portable(item, path ? `${path}.${key}` : key, prices);
  }
  return out;
}

// A dynamic zone that has drifted apart between the two instances would make
// this bundle apply the wrong text to the wrong section, so record the shape
// and let the injector refuse when it no longer matches.
const fingerprint = (entry) =>
  Array.isArray(entry?.blocks)
    ? entry.blocks.map((b) => b.__component).join(">")
    : "";

const app = await createStrapi(await compileStrapi()).load();
const populateBuilder = app.plugin("content-manager").service("populate-builder");

const out = fs.createWriteStream(OUT, { encoding: "utf8" });
const summary = {};
let records = 0;
let priceFields = 0;

for (const uid of TYPES) {
  const populate = await populateBuilder(uid).populateDeep(Infinity).build();
  const docs = app.documents(uid);

  // The REST path is the plural name, not the uid, and the injector has no
  // Strapi instance to look it up with - so resolve it here and ship it.
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

      // No published translation is not an error - it is simply nothing to
      // carry across. The injector never creates a locale that does not exist.
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
        // The destination compares its own updatedAt against this to detect an
        // edit made after the snapshot was taken.
        snapshotAt: entry.updatedAt,
        fingerprint: fingerprint(entry),
        prices,
        data,
      }) + "\n");

      written += 1;
      records += 1;
    }

    summary[`${uid} ${locale}`] = { written, noTranslation: missing };
    console.log(`${locale}  ${uid}  exported=${written}  noTranslation=${missing}`);
  }
}

out.end();
await new Promise((resolve) => out.on("finish", resolve));

console.log(`\nRESULT ${JSON.stringify({ records, priceFields, out: OUT })}`);
console.log("This bundle is content data. It belongs in _local/, never in git.");

await app.destroy();
