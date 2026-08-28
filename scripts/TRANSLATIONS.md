# Moving translations between Strapi instances

`export-translations.mjs` reads translated entries out of one instance into an
NDJSON bundle. `inject-translations.mjs` replays that bundle into another.

The bundle is content data, not code. It is delivered separately and must never
be committed.

## Injecting

Needs a Content API token with **update** on the imported content types and
**find** on Upload.

Dry run first — it writes nothing and prints every change it would make,
including every price:

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

Roll out in stages with `--types` and `--locales` rather than all at once.

## What it will not do

- **Touch German.** German is the source and is not in the bundle.
- **Create or delete a document.** It only writes a locale of a document the
  destination already has. Anything else is reported as `skippedMissingDoc`.
- **Carry a numeric media id across.** The same asset has a different numeric id
  in every instance, so media travels as a documentId and is re-resolved on
  arrival. An asset the destination does not have is left empty rather than
  guessed at, and counted as `droppedMedia`.
- **Revert an editor's work.** Every record carries the `updatedAt` it was
  captured at. If the destination entry has been edited since, it is skipped and
  listed under `skippedDrift`. `--force` overrides this — check the list first.

## Prices

Prices travel with the content. The dry run prints every one it would write, and
the drift check stops anything edited after the snapshot. Read that list before
applying: a wrong price on the live site is a legal exposure, not a cosmetic bug.

## Exporting

Run against the source instance, never against production:

```
node scripts/export-translations.mjs \
  --types=api::faq.faq,api::treatment.treatment \
  --locales=en,tr,ar,fr,nl \
  --out=../_local/translations-full.ndjson
```

`api::price.price` is deliberately never exported.
