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

const records = fs
  .readFileSync(FILE, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line))
  .filter((r) => !ONLY_LOCALES.length || ONLY_LOCALES.includes(r.locale))
  .filter((r) => !ONLY_TYPES.length || ONLY_TYPES.includes(r.uid))
  .filter((r) => r.locale !== "de")
  .slice(0, LIMIT === Infinity ? undefined : LIMIT);

if (!records.length) {
  console.error(`No records to import from ${FILE}.`);
  process.exit(1);
}

const wantedMedia = new Set();
const walk = (value, visit) => {
  if (Array.isArray(value)) return value.forEach((v) => walk(v, visit));
  if (!value || typeof value !== "object") return;
  visit(value);
  Object.values(value).forEach((v) => walk(v, visit));
};
for (const record of records) {
  walk(record.data, (node) => {
    if (typeof node.__media === "string") wantedMedia.add(node.__media);
  });
}

// The same asset has a different numeric id in every instance; only the
// documentId is stable. Resolving it here is what keeps the images correct.
const mediaMap = new Map();
if (wantedMedia.size) {
  const ids = [...wantedMedia];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const query = chunk
      .map((id, n) => `filters[documentId][$in][${n}]=${encodeURIComponent(id)}`)
      .join("&");
    const { ok, status, body } = await api(
      `/api/upload/files?${query}&pagination[pageSize]=100`,
    );
    if (!ok) {
      console.error(
        `Could not read media (${status}). The token needs find on Upload.`,
      );
      process.exit(1);
    }
    for (const file of Array.isArray(body) ? body : (body?.results ?? [])) {
      if (file?.documentId && file?.id) mediaMap.set(file.documentId, file.id);
    }
  }
}

const unresolvedMedia = [...wantedMedia].filter((id) => !mediaMap.has(id));
console.log(
  `media: ${mediaMap.size}/${wantedMedia.size} resolved` +
    (unresolvedMedia.length
      ? `, ${unresolvedMedia.length} missing on the destination`
      : ""),
);

let droppedMedia = 0;
function resolve(value) {
  if (Array.isArray(value)) {
    return value.map(resolve).filter((v) => v !== undefined);
  }
  if (!value || typeof value !== "object") return value;

  if (typeof value.__media === "string") {
    const id = mediaMap.get(value.__media);
    if (id === undefined) {
      droppedMedia += 1;
      return undefined;
    }
    return id;
  }
  if (typeof value.__relation === "string") return value.__relation;

  const out = {};
  for (const [key, item] of Object.entries(value)) {
    const next = resolve(item);
    if (next !== undefined) out[key] = next;
  }
  return out;
}

const report = {
  created: [],
  updated: [],
  skippedDrift: [],
  skippedMissingDoc: [],
  blocked: [],
  failed: [],
};
let pricesOmitted = 0;

console.log(
  `\n${APPLY ? "APPLYING" : "DRY RUN"} ${records.length} records -> ${URL_BASE}\n`,
);

for (const record of records) {
  const { apiPath, documentId, locale, name, snapshotAt } = record;
  const label = `${locale} ${name ?? apiPath}`;
  const target =
    record.kind === "singleType" ? `/api/${apiPath}` : `/api/${apiPath}/${documentId}`;

  const current = await api(
    `${target}?locale=${locale}&status=published&populate[blocks]=true`,
  );

  if (current.status === 404) {
    const german = await api(`${target}?locale=de&status=published`);
    if (!german.ok) {
      report.skippedMissingDoc.push(label);
      continue;
    }
  } else if (!current.ok) {
    // A denied read must never be mistaken for "absent": that would skip the
    // drift check and overwrite an edited entry as if it were new.
    report.blocked.push(`${label} (${current.status} reading destination)`);
    continue;
  }

  const existing = current.ok ? current.body?.data : null;

  if (existing && !FORCE && snapshotAt && existing.updatedAt) {
    if (new Date(existing.updatedAt) > new Date(snapshotAt)) {
      report.skippedDrift.push(
        `${label} (destination ${existing.updatedAt} > snapshot ${snapshotAt})`,
      );
      continue;
    }
  }

  const shapeChange =
    existing &&
    record.fingerprint &&
    (existing.blocks ?? []).map((b) => b.__component).join(">") !==
      record.fingerprint;

  const data = resolve(record.data);
  pricesOmitted += record.prices?.length ?? 0;

  if (!APPLY) {
    (existing ? report.updated : report.created).push(label);
    for (const price of record.prices ?? []) {
      console.log(`  price kept on destination  ${label}  ${price.path}`);
    }
    if (shapeChange) {
      console.log(`  shape  ${label}  block layout will be replaced`);
    }
    continue;
  }

  const put = await api(
    `${target}?locale=${locale}&status=published`,
    { method: "PUT", body: JSON.stringify({ data }) },
  );

  if (!put.ok) {
    const detail = put.body?.error?.message ?? put.body?.raw ?? "";
    report.failed.push(
      `${label} (${put.status}) ${String(detail).slice(0, 120)}`,
    );
    continue;
  }
  (existing ? report.updated : report.created).push(label);
}

const counts = Object.fromEntries(
  Object.entries(report).map(([key, value]) => [key, value.length]),
);
console.log(
  `\nRESULT ${JSON.stringify({ mode: APPLY ? "APPLY" : "DRY-RUN", ...counts, pricesOmitted, droppedMedia })}`,
);

for (const key of ["skippedDrift", "skippedMissingDoc", "blocked", "failed"]) {
  if (!report[key].length) continue;
  console.log(`\n${key}:`);
  for (const line of report[key]) console.log(`  ${line}`);
}
if (!APPLY) console.log("\nNothing was written. Re-run with --apply.");
