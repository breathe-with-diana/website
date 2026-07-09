# AGENT.md · working rules for this repo

Operational map for any automated agent (or human) making changes here. Read it before editing.
This is the public website repo only. It intentionally holds no private business context.

## What this repo is

The static website for **https://breathe-with-diana.com**, served by GitHub Pages from `main`.
English, Spanish, and Russian, generated from a shared template.

## The one rule that trips everyone up

`index.html`, `es.html`, and `ru.html` are **build output**. They are regenerated from
`_tpl/template.html` plus `_tpl/content/*` by `node _tpl/build.js`. Editing them by hand is a trap:
the next build silently overwrites the change.

To change the site:

1. Edit `_tpl/template.html` (structure plus CSS, shared by all three languages), or
   `_tpl/content/<lang>.json` (per-language text), or the raw fragments in `_tpl/content/`
   (review cards, language switcher).
2. Run `node _tpl/build.js --strict` from the repo root (fails loud on a typo'd `{{key}}` instead
   of emitting a silent blank).
3. Commit the source change **together with** the regenerated `index.html` / `es.html` / `ru.html`.
4. `bash _tpl/verify.sh` asserts the committed pages match a fresh build and guards against dashes.

Standalone pages (`review.html`, `health-form.html`, `media-consent.html`, `partnership/`) are not
template-generated and are edited directly.

## House conventions

- **No em dashes or en dashes** anywhere (copy, comments, commit messages). They read as an AI
  tell. Use a comma, period, colon, parentheses, or a middle dot. `_tpl/verify.sh` enforces this.
- Keep `CNAME` intact. It pins the custom domain; removing it detaches `breathe-with-diana.com`.
- `_tpl/` is underscore-prefixed so GitHub Pages (Jekyll) ignores it. Keep it that way.

## Working safely in a shared clone

The working tree may be shared by more than one session. Never leave uncommitted edits in the main
checkout: an uncommitted change can get swept into an unrelated commit. Work in your own worktree.

```bash
git fetch
git worktree add -b <branch> ../site-wt-<name> origin/main
# edit, build, verify, commit in the worktree
git push origin <branch>        # or push straight to main for a small, self-contained change
git worktree remove ../site-wt-<name>
```

## Deploy

Push to `main`. GitHub Pages rebuilds and serves the custom domain over HTTPS automatically. There
is no separate build/deploy pipeline: the committed HTML is what ships.
