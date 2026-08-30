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
node scripts/inject-translations.mjs --file=translations-full.ndjson --apply
```

### Flags

| flag | effect |
|---|---|
| `--apply` | actually write; without it nothing is sent |
| `--locales=en,fr` | restrict to these locales |
| `--types=api::faq.faq` | restrict to these content types |
| `--limit=20` | first N records, for a trial run |
| `--force` | ignore the drift check (see below) |

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

  Without `--baseline` it falls back to each record's own timestamp, which is
  weaker: that timestamp moves whenever the translation is edited locally, so it
  can sit after a destination change it should have caught. `--force` disables
  the check entirely — read the skip list first.

## Prices

Prices are stripped at export and never travel. The destination keeps whatever
it already holds, and a locale with no price of its own falls back to the German
one in the frontend. The dry run lists the fields it left alone as
`pricesOmitted`.

## Exporting

Run against the source instance, never against production:

```
node scripts/export-translations.mjs \
  --types=api::faq.faq,api::treatment.treatment \
  --locales=en,tr,ar,fr,nl \
  --out=../_local/translations-full.ndjson
```

`api::price.price` is never exported, and price-like fields are stripped from
every other type.
