# `_tpl/` · shared-template build system (experiment)

This is an **architecture experiment** (branch `template-system-experiment`), not a live change.
It regenerates the three language pages (`index.html`, `es.html`, `ru.html`) from **one shared
template plus per-language content files**, byte-for-byte identical to the current `origin/main`.

Full write-up and the adopt/park/abandon verdict:
`_build/template-system-experiment/REPORT.md` in the main project repo (not in `_site`).

## Files

- `build.js` · zero-dependency Node.js builder + a ~120-line Mustache-ish template engine
  (`{{var}}`, `{{#if}}/{{else}}`, `{{#unless}}`, `{{#each}}`, standalone-line stripping). Has a
  built-in `--selftest`.
- `template.html` · the single shared page template (structure + CSS), parameterized at every
  point where the three current pages diverge.
- `content/en.json`, `content/es.json`, `content/ru.json` · per-language content + a small number
  of style/drift-config keys (see the report's "drift tax" section).
- `content/reviews_cards.{en,es,ru}.html`, `content/nav_lang.{en,es,ru}.html` · raw HTML fragments
  (testimonial cards, language switcher) auto-loaded as `ctx.reviews_cards` / `ctx.nav_lang`. Kept
  out of JSON so their quote/attribute-heavy markup is never hand-escaped.
- `extract-fragments.js` · one-off helper that sliced those fragments out of the pristine originals.
- `_orig/{index,es,ru}.html` · pristine `origin/main` snapshots, used only as the byte-identity oracle.
- `verify.sh` · rebuilds and proves each output is byte-identical to `_orig/`, plus a no-dashes guard.

## Run

```bash
node _tpl/build.js            # regenerate index.html, es.html, ru.html into the site root
node _tpl/build.js en         # regenerate only one language
node _tpl/build.js --check    # build in memory, print sizes, write nothing
node _tpl/build.js --selftest # run the engine unit tests
bash _tpl/verify.sh           # rebuild + assert byte-identity vs _orig + dash guard
```

## Status

Proven: all three generated files match the `origin/main` originals by SHA256. See the report.
This branch is intentionally left **unmerged** for inspection; `main` is untouched.
