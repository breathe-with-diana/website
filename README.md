# Breathe with Diana · website

Source for the live site at **https://breathe-with-diana.com**.

A small, static, multilingual marketing site (English, Spanish, Russian) for Diana's breathwork
practice. Served by GitHub Pages from the `main` branch of this repo. No framework, no runtime
dependencies, no build step for the pages themselves: the committed HTML is what ships.

## How the site is built

The three language pages (`index.html`, `es.html`, `ru.html`) are hand-maintained and
self-contained, one file per language, each carrying its own CSS and script. A structural or CSS
change has to be made in all three.

`_tpl/` generates the breath-reset emails and listening pages from a shared template.

```bash
node _tpl/build.js --strict   # regenerate the reset emails and pages (fails loud on a bad key)
bash  _tpl/verify.sh          # self-test the engine, assert output is in sync, guard against dashes
```

Full details live in [`_tpl/README.md`](_tpl/README.md).

## Layout

- `index.html`, `es.html`, `ru.html` · the three language pages, hand-maintained.
- `_tpl/` · the reset-email build system and the logo generator.
- `review.html`, `health-form.html`, `media-consent.html`, `partnership/` · standalone pages.
- `feedback.js`, `tokens.css`, `review.css` · shared script and styles.
- `img/` · images and logo assets.
- `CNAME` · pins the custom domain (`breathe-with-diana.com`). Do not remove.

## Deploy

Push to `main`. GitHub Pages rebuilds and serves the custom domain over HTTPS automatically.

## Conventions

- No em dashes or en dashes anywhere (they read as an AI tell). Use a comma, period, colon,
  parentheses, or a middle dot. `_tpl/verify.sh` enforces this.
- See [`AGENT.md`](AGENT.md) for the working rules an automated agent should follow in this repo.
