# Moving translations between Strapi instances

`export-translations.mjs` reads translated entries out of one instance into an
NDJSON bundle. `inject-translations.mjs` replays that bundle into another.

The bundle is content data, not code. It is delivered separately and must never
be committed.

## Injecting

Needs a Content API token with **findOne** and **update** on the imported
content types, **find** on Upload, and **find** on every content type those
entries link to (treatments, employees, cities, locations, faqs, reviews,
stories, products). The script checks each relation target before sending it
and refuses to write if it cannot read one.

`findOne` matters: it is how the script reads the destination entry to decide
whether it exists and whether it has been edited since the snapshot. Production
denies `findOne` anonymously on some types, and without it every record is
reported as `blocked` rather than written.

Dry run first — it writes nothing and prints every change it would make:

```
STRAPI_URL=https://your-instance.strapiapp.com \
STRAPI_API_TOKEN=xxx \
node scripts/inject-translations.mjs --file=translations-full.ndjson
```

Then apply:

```
STRAPI_URL=https://your-instance.strapiapp.com \
STRAPI_API_TOKEN=xxx \
node scripts/inject-translations.mjs --file=translations-full.ndjson --apply \
  --baseline=2026-08-29T17:00:00Z
```

### Flags

| flag | effect |
|---|---|
| `--apply` | actually write; without it nothing is sent |
| `--locales=en,fr` | restrict to these locales |
| `--types=api::faq.faq` | restrict to these content types |
| `--limit=20` | first N records, for a trial run |
| `--force` | ignore the drift check entirely (see below) |
| `--baseline=<iso date>` | required for `--apply`: when the destination was copied |
| `--skip-price-records` | leave out the 314 entries that carry a price field |
| `--state=<file>` | record what was written, so a later pass knows its own work |

Start each destination with a fresh, empty state file. A file left over from
staging or an earlier run names documents whose recorded `updatedAt` no longer
matches, and those entries fall back to normal drift protection.

`partialRelations` in the result counts relation fields left untouched because
some of their targets did not exist yet; a later pass sets them once the targets
are imported. `idsAttached` counts the destination components preserved rather
than recreated.

Roll out in batches: one content type and one locale at a time, check the site,
then widen. Records the script could not read on the destination are counted as
`blocked` and never written - a denied read is never treated as "does not
exist".

## What it will not do

- **Touch German.** German is the source and is not in the bundle.
- **Create or delete a document.** It only writes a locale of a document the
  destination already has. Anything else is reported as `skippedMissingDoc`.
- **Carry a numeric media id across.** The same asset has a different numeric id
  in every instance, so media travels as a documentId and is re-resolved on
  arrival. An asset the destination does not have is left empty rather than
  guessed at, and counted as `droppedMedia`.
- **Revert an editor's work**, given a correct `--baseline`. Pass the time you
  copied the destination, e.g. `--baseline=2026-08-29T17:00:00Z`. Anything the
  destination changed after that is skipped and listed under `skippedDrift`.
  The check reads the draft, so unpublished edits count too.

  `--apply` refuses without it. `--force` disables the check entirely and is the
  only way to apply without a baseline — read the skip list before using it.

  A second pass would otherwise see its own first-pass writes as drift. Pass
  `--state=<file>` to both passes: the importer records what it wrote and
  recognises that later, while anything changed *after* that write is still
  skipped. Keep the file between passes - without it the second pass cannot tell
  its own work from an editor's, and `--force` becomes the only option.

  `--force` remains the blunt instrument: it overwrites editor changes too. With
  `--state` you should not need it.

## Prices

No price records and no products are exported, so no monetary amount can be
overwritten. Price-like fields on other types are stripped too, and counted as
`pricesOmitted`.

Stripping alone is not what protects them. Strapi deletes and recreates a
component sent without its id, which would take the destination's price with it,
so the injector reads the destination's draft and sends its component ids back.
Verify it on the first run: count non-null price columns before and after, and
confirm nothing decreased.

This reaches nested components too. The bundle records which attributes are
components, the importer populates those on the destination and carries their
ids down, so a repeatable component inside a component keeps whatever the
destination holds. `idsAttached` in the result shows how many were preserved.

## Exporting

Run against the source instance, never against production:

```
node scripts/export-translations.mjs \
  --types=api::faq.faq,api::treatment.treatment \
  --locales=en,tr,ar,fr,nl \
  --out=../_local/translations-full.ndjson
```

Price and Product types are deliberately left out of the bundle, which is why no
monetary amount can travel. The exporter itself has no such prohibition - it
exports whatever `--types` asks for - so that exclusion lives in how it is
invoked, not in the script.
