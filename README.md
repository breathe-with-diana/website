# Breathe with Diana · website

Source for the live site at **https://breathe-with-diana.com**.

A small, static, multilingual marketing site (English, Spanish, Russian) for Diana's breathwork
practice. Served by GitHub Pages from the `main` branch of this repo. No framework, no runtime
dependencies: the pages are plain HTML/CSS built by a tiny zero-dependency Node script.

## How the site is built

The three language pages (`index.html`, `es.html`, `ru.html`) are **generated**, never hand-edited.
They come from one shared template plus per-language content files under `_tpl/`. A structural or
CSS change is made once in the template and propagates to all three languages.

```bash
node _tpl/build.js --strict   # regenerate index.html / es.html / ru.html (fails loud on a bad key)
bash  _tpl/verify.sh          # self-test the engine, assert output is in sync, guard against dashes
```

Full details of the build system live in [`_tpl/README.md`](_tpl/README.md).

> Do not edit `index.html`, `es.html`, or `ru.html` directly. The next build overwrites your change.
> Edit `_tpl/template.html` or `_tpl/content/*` instead, then rebuild and commit source plus output
> together.

## Layout

- `index.html`, `es.html`, `ru.html` · generated language pages (build output).
- `_tpl/` · the build system (template, per-language content, builder, verify script).
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
