# AGENT.md · working rules for this repo

Operational map for any automated agent (or human) making changes here. Read it before editing.
This is the public website repo only. It intentionally holds no private business context.

## What this repo is

The static website for **https://breathe-with-diana.com**, served by GitHub Pages from `main`.
English, Spanish, and Russian.

## The one rule that trips everyone up

`index.html`, `es.html`, and `ru.html` are three separate hand-maintained pages, each fully
self-contained: its own CSS in a `<style>` block, its own script. There is no generator behind
them, so **a structural or CSS change has to be made in all three**, and a change made in one only
is how the languages drift apart.

`index.html` is the public page. `es.html` and `ru.html` are `noindex` and carry the feedback
widget so Diana can comment on them; the public page deliberately does not.

`_tpl/` still generates the breath-reset emails and listening pages. Those are build output and the
rules in [`_tpl/README.md`](_tpl/README.md) apply to them. `bash _tpl/verify.sh` checks that output
is in sync and guards every page we ship against dashes.

Standalone pages (`review.html`, `health-form.html`, `media-consent.html`, `for-diana/`,
`partnership/`) are edited directly.

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
