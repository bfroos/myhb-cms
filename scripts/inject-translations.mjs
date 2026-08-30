import fs from "node:fs";

const args = process.argv.slice(2);
const has = (name) => args.includes(`--${name}`);
const arg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const FILE = arg("file", "../_local/translations.ndjson");
const APPLY = has("apply");
const FORCE = has("force");
const LIMIT = Number(arg("limit", "0")) || Infinity;
const ONLY_LOCALES = arg("locales", "").split(",").filter(Boolean);
const ONLY_TYPES = arg("types", "").split(",").filter(Boolean);
const BASELINE = arg("baseline", "");
const SKIP_PRICE_RECORDS = has("skip-price-records");
const STATE = arg("state", "");

const URL_BASE = (process.env.STRAPI_URL || "").replace(/\/+$/, "");
const TOKEN = process.env.STRAPI_API_TOKEN;

if (!URL_BASE) {
  console.error("Set STRAPI_URL to the destination Strapi.");
  process.exit(1);
}
if (!TOKEN && APPLY) {
  console.error("Set STRAPI_API_TOKEN (Content API token with update rights).");
  process.exit(1);
}

const baselineAt = BASELINE ? new Date(BASELINE) : null;
if (BASELINE && Number.isNaN(baselineAt.getTime())) {
  console.error(`--baseline is not a valid date: ${BASELINE}`);
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

async function api(path, init = {}) {
  const response = await fetch(`${URL_BASE}${path}`, { ...init, headers });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { ok: response.ok, status: response.status, body };
}

if (!fs.existsSync(FILE)) {
  console.error(`No bundle at ${FILE}. Produce one with export-translations.mjs.`);
  process.exit(1);
}

const lines = fs
  .readFileSync(FILE, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l));

const legend = lines[0]?.__legend ?? {};
const records = lines
  .filter((r) => !r.__legend)
  .filter((r) => !ONLY_LOCALES.length || ONLY_LOCALES.includes(r.locale))
  .filter((r) => !ONLY_TYPES.length || ONLY_TYPES.includes(r.uid))
  .filter((r) => r.locale !== "de")
  .slice(0, LIMIT === Infinity ? undefined : LIMIT);

if (!records.length) {
  console.error(`No records to import from ${FILE}.`);
  process.exit(1);
}

const walk = (value, visit) => {
  if (Array.isArray(value)) return value.forEach((v) => walk(v, visit));
  if (!value || typeof value !== "object") return;
  visit(value);
  Object.values(value).forEach((v) => walk(v, visit));
};

const chunk = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

const idFilter = (ids) =>
  ids.map((id, n) => `filters[documentId][$in][${n}]=${encodeURIComponent(id)}`).join("&");

const wantedMedia = new Set();
for (const record of records) {
  walk(record.data, (node) => {
    if (typeof node.__media === "string") wantedMedia.add(node.__media);
  });
}

// The same asset has a different numeric id in every instance; only the
// documentId is stable. Resolving it here is what keeps the images correct.
const mediaMap = new Map();
for (const ids of chunk([...wantedMedia], 50)) {
  const { ok, status, body } = await api(
    `/api/upload/files?${idFilter(ids)}&pagination[pageSize]=100`,
  );
  if (!ok) {
    console.error(`Could not read media (${status}). The token needs find on Upload.`);
    process.exit(1);
  }
  for (const file of Array.isArray(body) ? body : (body?.results ?? [])) {
    if (file?.documentId && file?.id) mediaMap.set(file.documentId, file.id);
  }
}
console.log(`media: ${mediaMap.size}/${wantedMedia.size} resolved`);

// Strapi resolves a relation inside the target locale and rejects the whole
// write if the target has no such locale, so check first and drop the misses.
const wantedRelations = new Map();
for (const record of records) {
  walk(record.data, (node) => {
    if (typeof node.__relation !== "string" || !node.__t) return;
    const key = `${node.__t}|${record.locale}`;
    if (!wantedRelations.has(key)) wantedRelations.set(key, new Set());
    wantedRelations.get(key).add(node.__relation);
  });
}

const resolvableRelations = new Map();
const unlistableTargets = new Set();
for (const [key, ids] of wantedRelations) {
  const [uid, locale] = key.split("|");
  const meta = legend[uid];
  if (!meta || !meta.localized) continue;

  const found = new Set();
  let listable = true;
  for (const part of chunk([...ids], 50)) {
    const { ok, body } = await api(
      `/api/${meta.path}?locale=${locale}&fields[0]=documentId&pagination[pageSize]=100&${idFilter(part)}`,
    );
    if (!ok || !Array.isArray(body?.data)) { listable = false; break; }
    for (const row of body.data) if (row?.documentId) found.add(row.documentId);
  }
  if (listable) resolvableRelations.set(key, found);
  else unlistableTargets.add(key);
}

const relationTotal = [...wantedRelations.values()].reduce((n, s) => n + s.size, 0);
const relationFound = [...resolvableRelations.values()].reduce((n, s) => n + s.size, 0);
console.log(`relations: ${relationFound}/${relationTotal} resolvable in their locale`);

// A target we cannot inspect must stop the run rather than be sent unchecked:
// writing an unverified relation is exactly what this preflight exists to avoid.
if (unlistableTargets.size) {
  console.error("");
  console.error("Could not check these relation targets on the destination:");
  for (const key of unlistableTargets) {
    const [uid, locale] = key.split("|");
    console.error(`  ${uid} (locale ${locale}) - token needs find on ${legend[uid]?.path ?? uid}`);
  }
  if (APPLY) {
    console.error("Refusing to write. Grant the missing read permission and re-run.");
    process.exit(1);
  }
  console.error("Dry run continues, but --apply would refuse.");
}

let droppedMedia = 0;
let droppedRelations = 0;

// Nothing this bundle cannot carry may erase what the destination holds. An
// empty array clears a relation, a null clears a field, and an empty object
// empties a component - so all three are omitted instead of sent, and the
// destination keeps its own value.
let partialRelations = 0;

function resolve(value, locale) {
  if (Array.isArray(value)) {
    // Setting a relation replaces the whole set, so sending only the members we
    // could resolve would silently drop the rest. If any member is missing the
    // field is omitted entirely and the destination keeps what it has; a later
    // pass sets it once every target exists.
    const before = droppedRelations;
    const items = value.map((v) => resolve(v, locale)).filter((v) => v !== undefined);
    if (droppedRelations > before && items.length) {
      partialRelations += 1;
      return undefined;
    }
    return items.length ? items : undefined;
  }
  if (value === null) return undefined;
  if (typeof value !== "object") return value;

  if (typeof value.__media === "string") {
    const id = mediaMap.get(value.__media);
    if (id === undefined) { droppedMedia += 1; return undefined; }
    return id;
  }
  if (typeof value.__relation === "string") {
    const set = resolvableRelations.get(`${value.__t}|${locale}`);
    if (set && !set.has(value.__relation)) { droppedRelations += 1; return undefined; }
    return value.__relation;
  }

  // Strapi's validator reads a dynamic-zone item's __component before the rest
  // of its keys and rejects the item outright when it comes last.
  const out = {};
  if (typeof value.__component === "string") out.__component = value.__component;
  for (const [key, item] of Object.entries(value)) {
    if (key === "__component") continue;
    const next = resolve(item, locale);
    if (next !== undefined) out[key] = next;
  }
  const meaningful = Object.keys(out).filter((k) => k !== "__component");
  return meaningful.length ? out : undefined;
}

// Strapi deletes and recreates any component sent without its id, taking with
// it every field this bundle does not carry - prices among them. Sending the
// destination's own component ids makes it update in place instead, so those
// fields survive. The ids belong to the draft: the published rows are separate
// component instances and using those is rejected as "not related to the
// entity".
// Strapi deletes and recreates any component sent without its id, taking with
// it every field this bundle does not carry. Sending the destination's own ids
// makes it update in place instead. The ids come from the draft: published rows
// are separate component instances and Strapi rejects those as "not related to
// the entity".
//
// Only keys that actually hold objects are populated - asking Strapi to
// populate a plain string array is rejected outright.
const populateFor = (record) => {
  const keys = record.componentKeys ?? [];
  return keys
    .map((k) => `populate[${encodeURIComponent(k)}][populate]=*`)
    .join("&");
};

let idsAttached = 0;

let zonesPreserved = 0;
let relationsRestored = 0;

function withDestinationId(value, dest) {
  if (Array.isArray(value)) {
    if (!Array.isArray(dest)) return value;
    // A dynamic zone or repeatable component is replaced wholesale on write.
    // Where the destination holds more entries than this bundle carries, the
    // extras would simply be deleted along with anything they link to, so the
    // whole field is left alone instead.
    // Components carry a numeric id from the destination; rich text and other
    // object arrays do not, and omitting those breaks required fields.
    const destHoldsComponents =
      dest.length > 0 &&
      dest.every((d) => d && typeof d === "object" && typeof d.id === "number");
    if (destHoldsComponents) {
      // Writing replaces the whole list, and entries are matched by position.
      // Any difference in length or in the component at a given position means
      // something the destination has would be dropped, so leave it alone and
      // let an editor or a later pass deal with it.
      const shapeDiffers =
        dest.length !== value.length ||
        value.some((v, i) => (v?.__component ?? null) !== (dest[i]?.__component ?? null));
      if (shapeDiffers) {
        zonesPreserved += 1;
        return undefined;
      }
    }
    return value.map((item, i) => withDestinationId(item, dest[i]));
  }
  if (!value || typeof value !== "object") return value;
  if (!dest || typeof dest !== "object" || Array.isArray(dest)) return value;
  if (value.__component && dest.__component && value.__component !== dest.__component) {
    return value;
  }

  const out = {};
  if (typeof value.__component === "string") out.__component = value.__component;
  if (typeof dest.id === "number") {
    out.id = dest.id;
    idsAttached += 1;
  }
  for (const [key, item] of Object.entries(value)) {
    if (key === "__component") continue;
    const next = withDestinationId(item, dest[key]);
    if (next !== undefined) out[key] = next;
  }

  // Supplying a component's id preserves the scalars we leave out, but not its
  // relations: those are replaced, so a relation this bundle omits would be
  // cleared. Put the destination's own back.
  const asRef = (v) =>
    v && typeof v === "object" && typeof v.documentId === "string" ? v.documentId : undefined;
  for (const [key, item] of Object.entries(dest)) {
    if (key in out || key === "id" || key === "__component") continue;
    if (Array.isArray(item)) {
      const refs = item.map(asRef).filter(Boolean);
      if (refs.length === item.length && refs.length) {
        out[key] = refs;
        relationsRestored += 1;
      }
    } else {
      const ref = asRef(item);
      if (ref) {
        out[key] = ref;
        relationsRestored += 1;
      }
    }
  }
  return out;
}

function attachIds(payload, dest) {
  if (!payload || typeof payload !== "object" || !dest) return payload;
  const out = {};
  for (const [key, value] of Object.entries(payload)) {
    const next = withDestinationId(value, dest[key]);
    if (next !== undefined) out[key] = next;
  }
  return out;
}

// A second pass would otherwise see its own first-pass writes as editor drift.
// Recording what this importer wrote lets pass two recognise its own work while
// still protecting anything a person changed - which a blanket --force cannot.
const priorWrites = new Map();
if (STATE && fs.existsSync(STATE)) {
  for (const line of fs.readFileSync(STATE, "utf8").split(String.fromCharCode(10)).filter(Boolean)) {
    try {
      const e = JSON.parse(line);
      priorWrites.set(`${e.uid}|${e.documentId}|${e.locale}`, e.at);
    } catch {}
  }
  console.log(`state: ${priorWrites.size} entries written by a previous pass`);
}
// Store the updatedAt Strapi itself returned. Comparing against that exactly
// removes both clock skew and the race where an edit lands moments after ours.
const recordWrite = (record, updatedAt) => {
  if (!STATE || !updatedAt) return;
  fs.appendFileSync(
    STATE,
    JSON.stringify({
      uid: record.uid,
      documentId: record.documentId,
      locale: record.locale,
      at: updatedAt,
    }) + String.fromCharCode(10),
  );
};

const report = {
  created: [], updated: [], skippedDrift: [], skippedMissingDoc: [], blocked: [],
  skippedPrice: [], failed: [],
};
let pricesOmitted = 0;

// Applying without a baseline silently downgrades the drift check to each
// record's own updatedAt, which can sit after a destination change it should
// have caught. Make the safe path the default and --force the explicit opt-out.
if (APPLY && !BASELINE && !FORCE) {
  console.error("--apply requires --baseline=<when you copied the destination>.");
  console.error("Use --force only if you deliberately want no drift protection.");
  process.exit(1);
}
if (!BASELINE && !FORCE) {
  console.log(
    "warning: no --baseline given, falling back to each record's own updatedAt.",
  );
}

console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} ${records.length} records -> ${URL_BASE}\n`);

for (const record of records) {
  const { apiPath, documentId, locale, name, snapshotAt } = record;
  const label = `${locale} ${name ?? apiPath}`;

  // Component ids are now carried over, so a price the destination holds is no
  // longer lost when its component is written. Skipping these is available for
  // a cautious first run, but it would leave out 89% of treatment pages.
  if ((record.prices?.length ?? 0) > 0 && SKIP_PRICE_RECORDS) {
    report.skippedPrice.push(`${label} (${record.prices.length} price field(s))`);
    continue;
  }
  const target =
    record.kind === "singleType" ? `/api/${apiPath}` : `/api/${apiPath}/${documentId}`;

  // The draft holds the most recent edit, so reading only the published
  // version would miss an editor's unpublished work and overwrite it.
  const populate = populateFor(record);
  const deep = populate ? `&${populate}` : "&populate=*";
  let current = await api(`${target}?locale=${locale}&status=draft${deep}`);
  if (current.status === 404 || (current.ok && !current.body?.data)) {
    current = await api(`${target}?locale=${locale}&status=published${deep}`);
  }

  if (current.status === 404) {
    const german = await api(`${target}?locale=de&status=published`);
    if (!german.ok) { report.skippedMissingDoc.push(label); continue; }
  } else if (!current.ok) {
    report.blocked.push(`${label} (${current.status} reading destination)`);
    continue;
  }

  const existing = current.ok ? current.body?.data : null;

  // Compare against when the destination was copied locally, not against the
  // record's own updatedAt: that timestamp moves every time the translation is
  // edited locally, which would mask a destination change made in between.
  const against = baselineAt ?? (snapshotAt ? new Date(snapshotAt) : null);
  if (existing && !FORCE && against && existing.updatedAt) {
    // Our own earlier write is not drift. Anything changed after that write is,
    // so an editor who touched it since is still protected.
    const ours = priorWrites.get(`${record.uid}|${documentId}|${locale}`);
    if (ours && existing.updatedAt === ours) {
      // fall through and write
    } else if (new Date(existing.updatedAt) > against) {
      report.skippedDrift.push(
        `${label} (destination ${existing.updatedAt} > ${baselineAt ? "baseline" : "snapshot"} ${against.toISOString()})`,
      );
      continue;
    }
  }

  let data = resolve(record.data, locale);
  if (existing) data = attachIds(data, existing);
  pricesOmitted += record.prices?.length ?? 0;

  if (!APPLY) {
    (existing ? report.updated : report.created).push(label);
    continue;
  }

  const put = await api(`${target}?locale=${locale}&status=published`, {
    method: "PUT",
    body: JSON.stringify({ data }),
  });

  if (!put.ok) {
    const detail = put.body?.error?.message ?? put.body?.raw ?? "";
    report.failed.push(`${label} (${put.status}) ${String(detail).slice(0, 120)}`);
    continue;
  }
  (existing ? report.updated : report.created).push(label);
  recordWrite(record, put.body?.data?.updatedAt);
}

const counts = Object.fromEntries(
  Object.entries(report).map(([key, value]) => [key, value.length]),
);
console.log(
  `\nRESULT ${JSON.stringify({ mode: APPLY ? "APPLY" : "DRY-RUN", ...counts, pricesOmitted, droppedMedia, droppedRelations, partialRelations, zonesPreserved, relationsRestored, idsAttached })}`,
);

for (const key of ["skippedDrift", "skippedMissingDoc", "blocked", "skippedPrice", "failed"]) {
  if (!report[key].length) continue;
  console.log(`\n${key}:`);
  for (const line of report[key].slice(0, 40)) console.log(`  ${line}`);
  if (report[key].length > 40) console.log(`  ... and ${report[key].length - 40} more`);
}
if (!APPLY) console.log("\nNothing was written. Re-run with --apply.");
