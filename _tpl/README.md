# `_tpl/` · shared-template build system

Generates the breath-reset emails and listening pages in all three languages from one shared
template plus per-language content, so a change is made once and propagates to EN, ES and RU.

`_tpl/` is underscore-prefixed, so GitHub Pages (Jekyll) ignores it and never serves it.

The three language pages (`index.html`, `es.html`, `ru.html`) are **not** built from here. They are
hand-maintained: one page per language, each self-contained. A structural or CSS change has to be
made in all three.

**Maintenance workflow:** edit `reset/page.html`, `reset/email.html` or `reset/content/*.json`, run
`node _tpl/build.js --strict`, then commit the source change together with the regenerated output.

## Files

- `build.js` · zero-dependency Node.js builder + a ~120-line Mustache-ish template engine
  (`{{var}}`, `{{#if}}/{{else}}`, `{{#unless}}`, `{{#each}}`, standalone-line stripping). Has a
  built-in `--selftest`.
- `reset/page.html`, `reset/email.html` · the templates for the listening page and the delivery
  email. `reset/review.json` overlays the email with the feedback widget so Diana can review it
  without the script reaching a real inbox.
- `reset/content/{en,es,ru}.json` · per-language content.
- `logo/` · the pristine static logo sources and the generator that stamps the seed animation into
  the three live SVGs. See the project CLAUDE.md.
- `verify.sh` · self-tests the engine, asserts the committed output is in sync with its sources (a
  fresh build changes nothing), and guards every page we ship against em/en dashes. Wire into CI /
  pre-push.

## Run

```bash
node _tpl/build.js            # regenerate the reset emails and pages
node _tpl/build.js en         # regenerate only one language
node _tpl/build.js --check    # build in memory, print sizes, write nothing
node _tpl/build.js --strict   # fail loud on a missing/typo'd {{key}} (use this for commits)
node _tpl/build.js --selftest # run the engine unit tests
bash _tpl/verify.sh           # selftest + output-in-sync check + dash guard
```
