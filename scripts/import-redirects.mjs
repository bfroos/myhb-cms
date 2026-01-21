import fs from "node:fs/promises";

const args = process.argv.slice(2);
const fileArg = args.find((arg) => arg.startsWith("--file=")) || args[0];
const isDryRun = args.includes("--dry-run");

if (!fileArg) {
  console.error(
    "Usage: node scripts/import-redirects.mjs --file=path/to/redirects.csv [--dry-run]",
  );
  process.exit(1);
}

const filePath = fileArg.startsWith("--file=") ? fileArg.slice(7) : fileArg;
const csv = await fs.readFile(filePath, "utf8");

const rows = parseCsv(csv);
if (!rows.length) {
  console.error("CSV ist leer oder unlesbar.");
  process.exit(1);
}

const headers = rows[0].map((value) => value.trim().toLowerCase());
const fromIndex = headers.indexOf("from");
const toIndex = headers.indexOf("to");
const codeIndex = headers.indexOf("code");

if (fromIndex === -1 || toIndex === -1) {
  console.error('CSV braucht Spalten "from" und "to".');
  process.exit(1);
}

const entries = rows
  .slice(1)
  .map((row) => ({
    from: row[fromIndex]?.trim(),
    to: row[toIndex]?.trim(),
    code: codeIndex >= 0 ? Number(row[codeIndex]) : undefined,
  }))
  .filter((row) => row.from && row.to);

if (!entries.length) {
  console.error("Keine gueltigen Zeilen gefunden.");
  process.exit(1);
}

const normalizedEntries = entries
  .map((entry) => {
    const normalizedFrom = normalizeFrom(entry.from);
    const normalizedToInternal = normalizeToInternal(entry.to);
    return {
      ...entry,
      normalizedFrom,
      normalizedToInternal,
    };
  })
  .filter((entry) => entry.normalizedFrom);

if (!normalizedEntries.length) {
  console.error("Keine gueltigen Zeilen nach Normalisierung gefunden.");
  process.exit(1);
}

const { invalidEntries, entriesToImport } =
  filterRedirectLoops(normalizedEntries);

if (invalidEntries.length > 0) {
  console.warn(
    "Warnung: Folgende Redirects wurden wegen Schleifen ausgeschlossen:",
  );
  for (const entry of invalidEntries) {
    console.warn(`- ${entry.from} -> ${entry.to}`);
  }
}

if (!entriesToImport.length) {
  console.error("Keine gueltigen Redirects zum Import.");
  process.exit(1);
}

const strapiUrl = (process.env.STRAPI_URL || "http://localhost:1337").replace(
  /\/+$/,
  "",
);
const apiToken = process.env.STRAPI_API_TOKEN;

if (!apiToken && !isDryRun) {
  console.error("Bitte STRAPI_API_TOKEN setzen (Content API Token in Strapi).");
  process.exit(1);
}

console.log(
  `Importiere ${entriesToImport.length} Redirects nach ${strapiUrl} ${
    isDryRun ? "(dry-run)" : ""
  }`,
);

let successCount = 0;
for (const entry of entriesToImport) {
  const payload = {
    data: {
      from: entry.normalizedFrom,
      to: entry.normalizedToInternal || entry.to,
      code: sanitizeCode(entry.code),
    },
  };

  if (isDryRun) {
    console.log("[dry-run]", payload.data);
    successCount += 1;
    continue;
  }

  const response = await fetch(`${strapiUrl}/api/redirects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(
      `Fehler bei ${entry.from} -> ${entry.to}: ${response.status} ${body}`,
    );
    continue;
  }

  successCount += 1;
}

console.log(`Fertig. Erfolgreich: ${successCount}/${entriesToImport.length}`);

function sanitizeCode(code) {
  if (code === 302 || code === 307 || code === 308) return code;
  return 301;
}

function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const nextChar = input[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }
      row.push(field);
      field = "";
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.length > 0)) {
    rows.push(row);
  }

  return rows;
}

function normalizePath(input) {
  let path = input || "/";
  try {
    path = decodeURI(path);
  } catch {
    // Ignore invalid URI sequences.
  }
  const queryIndex = path.indexOf("?");
  if (queryIndex >= 0) path = path.slice(0, queryIndex);
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path;
}

function normalizeFrom(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const parsed = new URL(trimmed);
      return normalizePath(parsed.pathname);
    }
  } catch {
    // Fallback to plain normalization below.
  }
  return normalizePath(trimmed);
}

function normalizeToInternal(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return "";
  }
  return normalizePath(trimmed);
}

function filterRedirectLoops(entries) {
  const invalidEntries = [];
  const edges = new Map();

  for (const entry of entries) {
    if (entry.normalizedToInternal) {
      if (entry.normalizedFrom === entry.normalizedToInternal) {
        invalidEntries.push(entry);
        continue;
      }
      edges.set(entry.normalizedFrom, entry.normalizedToInternal);
    }
  }

  const leadsToLoop = buildLoopLookup(edges);
  const entriesToImport = entries.filter((entry) => {
    if (!entry.normalizedToInternal) return true;
    if (leadsToLoop(entry.normalizedFrom)) {
      invalidEntries.push(entry);
      return false;
    }
    return true;
  });

  return { invalidEntries, entriesToImport };
}

function buildLoopLookup(edges) {
  const visiting = new Set();
  const visited = new Set();
  const loopNodes = new Set();

  function dfs(node, stack) {
    if (visiting.has(node)) {
      const loopStartIndex = stack.indexOf(node);
      const loopNodesInPath =
        loopStartIndex >= 0 ? stack.slice(loopStartIndex) : [node];
      for (const loopNode of loopNodesInPath) {
        loopNodes.add(loopNode);
      }
      return;
    }
    if (visited.has(node)) return;

    visiting.add(node);
    const next = edges.get(node);
    if (next) {
      dfs(next, [...stack, node]);
    }
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of edges.keys()) {
    dfs(node, []);
  }

  const memo = new Map();
  const active = new Set();

  function leadsToLoop(node) {
    if (memo.has(node)) return memo.get(node);
    if (loopNodes.has(node)) {
      memo.set(node, true);
      return true;
    }
    if (active.has(node)) {
      memo.set(node, true);
      return true;
    }
    const next = edges.get(node);
    if (!next) {
      memo.set(node, false);
      return false;
    }
    active.add(node);
    const result = leadsToLoop(next);
    active.delete(node);
    memo.set(node, result);
    return result;
  }

  return leadsToLoop;
}
