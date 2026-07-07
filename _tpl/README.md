# `_tpl/` · shared-template build system

This is the build system for the site. It regenerates the three language pages (`index.html`,
`es.html`, `ru.html`) from **one shared template plus per-language content files**, so a structural
or CSS change is made once and propagates to all three languages.

Background and the adopt-vs-park verdict that led to adopting it:
`_build/template-system-experiment/REPORT.md` in the main project repo (not in `_site`).

**Maintenance workflow:** edit `template.html` or `content/*.json`, run `node _tpl/build.js --strict`,
then commit the source change together with the regenerated `index.html` / `es.html` / `ru.html`.
`_tpl/` is underscore-prefixed, so GitHub Pages (Jekyll) ignores it and never serves it.

## Files

- `build.js` · zero-dependency Node.js builder + a ~120-line Mustache-ish template engine
  (`{{var}}`, `{{#if}}/{{else}}`, `{{#unless}}`, `{{#each}}`, standalone-line stripping). Has a
  built-in `--selftest`.
- `template.html` · the single shared page template (structure + CSS), parameterized at every
  point where the three current pages diverge.
- `content/en.json`, `content/es.json`, `content/ru.json` · per-language content, now essentially
  pure translatable text after the normalization collapsed the cross-language style/drift knobs.
  (`en.json` keeps one structural flag, `practice_squiggle`, for its decorative squiggle.)
- `content/reviews_cards.{en,es,ru}.html`, `content/nav_lang.{en,es,ru}.html` · raw HTML fragments
  (testimonial cards, language switcher) auto-loaded as `ctx.reviews_cards` / `ctx.nav_lang`. Kept
  out of JSON so their quote/attribute-heavy markup is never hand-escaped.
- `extract-fragments.js` · one-off helper that sliced those fragments out of the original pages.
- `verify.sh` · self-tests the engine, asserts the committed pages are in sync with the template +
  content (a fresh build changes nothing), and guards against em/en dashes. Wire into CI / pre-push.

## Run

```bash
node _tpl/build.js            # regenerate index.html, es.html, ru.html into the site root
node _tpl/build.js en         # regenerate only one language
node _tpl/build.js --check    # build in memory, print sizes, write nothing
node _tpl/build.js --strict   # fail loud on a missing/typo'd {{key}} (use this for commits)
node _tpl/build.js --selftest # run the engine unit tests
bash _tpl/verify.sh           # selftest + output-in-sync check + dash guard
```

## Status

Adopted as the maintenance model for the site. Phase 1 landed the pipeline with output
byte-identical to the then-live pages (a no-op for visitors). Phase 2 then ran the one-time CSS
normalization: it collapsed the two hand-drifted CSS generations into one shared stylesheet, fixed
the latent cross-language inconsistencies, and reduced the content files to essentially pure text.
See the report for the full rationale.
