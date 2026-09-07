# Develop: git handling (read only when git integration is on)

Read this only when the nearest `AGENTS.md` `## Git` block says `integration: on`. Absent or `off` → do no active git; the engineer manages branches and commits, and the read only freshness checks still apply, skipping silently if there is no repo at all (nothing to check freshness against). That "skip when no repo" only covers `off`/absent: with `integration: on`, a missing repo is not a reason to skip, it is a reason to create one first, before any branch or commit step runs (see "Ensure a repo exists first" below).

Read the setting: `integration`, `branch prefix` (default `feat/`), `commit` (`per-milestone` default, `end-of-build`, or `manual`), and an optional `co-author` (exact commit trailer text; absent → detect, see Commit below). Local ops (branch, commit) are offers with a recommendation; **push and PR always confirm** (outward) and PR is `/document`'s job, not this skill's.

**Ensure a repo exists first.** If integration is on and the project is not yet a git repo (`git rev-parse` fails), run `git init` before any branch or commit. Never stage the whole working tree blindly: run `git status --short` and look at what is actually sitting there. A project that reached a build without git may hold `.env*` files, credential or key files, a local database, `node_modules`/build output, or other unrelated work that must never enter history. Add or extend `.gitignore` to cover those first, then list the specific files you'd stage for the initial commit and show that exact list to the engineer; only stage and commit on their explicit go ahead, never on the default "offer, then proceed" pattern this file uses elsewhere, since a first commit's mistakes are the hardest to undo. `/audit` normally does this the moment integration is turned on; this is the backup for a project that reached a build without it.

## Branch (before building, in the freshness & collaboration check)

- On the default branch (`main`/`master`) → **offer to branch** (recommended): `<prefix><feature-slug>` from the scope feature name (kebab case; e.g. `feat/accounts-sign-in`). Never build on the default branch.
- On a feature branch already → reuse it; do not create another.
- Resuming a half built feature (Step 3) → check out that feature's branch first if it exists and you are not on it.
- Use the change type for the prefix when it is not a feature (`fix/`, `refine/`), else the setting's default.

## Commit (as milestones land, per the `commit` setting)

- `per-milestone` (default) → when a milestone lands and its typecheck is green, **offer to commit** just that milestone's files.
- `end-of-build` → one commit when the build lands.
- `manual` → never commit; the engineer does.

Message: a **one line Conventional Commit subject**, no prose body, plus a `Co-Authored-By` trailer (required). Type from the work (`feat`, `fix`, `refactor`, `test`, `chore`), optional scope from the feature, summary in the imperative:

```
feat(auth): add session persistence

Co-Authored-By: <detected client/model> <its noreply address>
```

**Trailer author, client neutral.** This skill runs on Codex and other Agent Skills clients (`agents/openai.yaml`), not just Claude Code, so never hardcode one assistant's identity, name whoever actually authored the commit:
1. An explicit `co-author` value recorded in the nearest `AGENTS.md` `## Git` block (an engineer set repository setting) always wins; use it verbatim, no detection needed.
2. Otherwise detect the active client/model, the same best effort check `/check review` Step 1a uses: `ANTHROPIC_MODEL` / `.claude/settings*.json` on Claude Code (trailer `Claude <model family> <noreply@anthropic.com>`); `OPENAI_MODEL` / `CODEX_MODEL` / `~/.codex/config.toml` on Codex (trailer `Codex <noreply@openai.com>`, or the reported model name); that client's own settings for anything else.
3. Nothing resolves (an unrecognized client): use `AI Assistant <noreply@localhost>` and say so in the report, rather than fabricate a Claude identity for a client that isn't one.

The why lives in the spec and the PR, never in the commit body (single source). Commit only what actually landed and typechecks; never commit a half done milestone. Never `git push` here (that is `/document` at PR time, confirmed).

## Report

Add one line to the `/develop` summary: the branch you are on, and what you committed (`feat(auth): … · 3 commits`) or that commits are `manual`. If integration is off or absent, say nothing about git.
