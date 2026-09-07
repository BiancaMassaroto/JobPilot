# /check review (fresh model code review)

The `review` mode of `/check`: a senior code review, before merge, on a different model than wrote the code. Follow it fully.

## What this skill does

Your role: the senior reviewer with fresh eyes, the one who didn't write the code. Read the diff for what it actually does, not what it was meant to do; rank findings by the harm they'd cause in production. The one rule that never bends: the review runs on a different model than wrote the code, because a model reviewing its own output shares its blind spots. Write severity ranked findings.

- Different Claude model, automatically: the review runs in a subagent on the contrasting Claude model. No API keys, no external setup.
- Read only on code: produces findings, never edits the code under review.
- Want a different provider? For the most independent review, switch your active model (`/model`, or your other AI tool) and run the review there; a recommendation, not machinery. The skill never sends your code anywhere itself.

Owns review findings (`docs/reviews/`). Does not write code, tests, specs, or the `AGENTS.md`/`CLAUDE.md` context files.

## Asks vs acts

Acts, with one deliberate exception: it confirms which model wrote the code before reviewing (a single MCQ, with the detected value selected by default), because the model can't reliably detect itself and a wrong guess silently breaks the cross model guarantee (see Step 1). Everything else (scoping, reviewing, writing findings) it does without asking. It states which model is reviewing so you can still redirect, and pauses if there is nothing to review (clean tree, no branch diff). The confirm is skipped when you pass an explicit `with <model>` override and detection was unambiguous.

Steering: `/check review` (default contrasting model), `/check review with opus` (force a reviewer), or `/check review uncommitted` (scope to working tree changes only).

## Artifact ownership

`docs/reviews/<YYYY-MM-DD>-<branch-slug>.md`, created by this skill only (`<branch-slug>` is `BRANCH_SLUG`, see Step 2: the current branch with `/` and other unsafe characters replaced by `-`, so a slash based branch name never turns into a nested, uncreated directory). The subagent writes it; the main model relays a summary.

Artifact base: findings live under `docs/` by default. If `docs/` is a published docs site (`docusaurus.config.*`, `.vitepress/`, `mkdocs.yml`, Astro Starlight, or Nextra detected), use `.workflow/` instead (`.workflow/reviews/`). Always follow whichever base, `docs/` or `.workflow/`, already exists (paths here assume `docs/`).

---

## Portability (any OS, any agent)

Any Agent Skills client on macOS, Linux, or Windows:
- Commands: `git` is the only required CLI and behaves the same on every OS; run the `git` lines as shown. Other shell snippets are POSIX reference, not literal scripts: don't assume `find`, `grep`, `sed`, `cat`, `test`/`[ ]`, `ls`, `xargs`, or `for` exist. Use your agent's cross-platform file tools (read, search/glob, write) for those, and apply branching logic yourself rather than via shell `if`/variables/redirects.
- Bundled files: referenced by paths relative to this skill's folder. The main agent resolves the folder to an absolute path (it already resolves these relative paths, so it knows the folder) and passes absolute file paths in the subagent prompt; it must not read the bundled files' contents into the main context; the subagent reads them by path. Fallback: if your client's subagents cannot read files, read and inline the contents instead.
- No subagent support? The cross-model benefit then needs you to switch your active model (or open the diff in another assistant) and run the review there; otherwise run it inline, noting the reviewer shares the author model's blind spots.

## Execution

### 1. Determine the author model, then pick a DIFFERENT reviewer

Do not rely on self-introspection or the "You are powered by…" system prompt line (written at session start, stale the moment the user switches with `/model`): the model cannot reliably name itself. Detect from durable config, then confirm.

**1a: Detect the author model (best effort), provider neutral.** The author model is whatever is generating code in this session, on whatever provider is active; this skill is exposed to Codex and other Agent Skills clients (`agents/openai.yaml`), not just Claude Code, so detection must not assume `ANTHROPIC_MODEL` is the only source. Using your file tools, in order:
- **Claude Code / Claude family clients**: read `ANTHROPIC_MODEL` from the env if set, and check `.claude/settings.local.json`, `.claude/settings.json`, and the user-level `.claude/settings.json` in the home directory for a `"model"` value. Map ids to families: `claude-opus-*` → `opus`, `claude-sonnet-*` → `sonnet`, `claude-haiku-*` → `haiku`, `claude-fable-*` → `fable`.
- **Codex / OpenAI-based clients**: check the `OPENAI_MODEL` / `CODEX_MODEL` env vars, then `~/.codex/config.toml` and any project `.codex/config.toml` for a `model = "..."` value. Keep the family name as reported (e.g. `gpt-5`, `o4-mini`); do not force it into a Claude family name.
- **Any other client** (Cursor, Windsurf, Gemini CLI, etc.): check that tool's own documented settings file or env var for a model id, if one exists.
- Use the system-prompt "You are powered by…" line only as a last-resort weak hint, possibly stale, regardless of provider.

No source resolves (unrecognized client, none of the above files or vars present): don't guess. Go to 1b with no option pre-selected and let the user name the author model themselves.

**1b: Confirm the author model (one question).** A wrong guess silently reviews code with the same model and defeats the skill, so confirm before spawning. Pre-select the detected family as the recommended option; if 1a resolved nothing, list the strong models available on the active client with none pre-selected, and require an explicit pick. Present via your agent's interactive option picker (`AskUserQuestion` on Claude Code), or as plain-text options with the same choices if it has none:

```
"Which model wrote this code? I'll review on a different one."
  header: "Author model"
  options:
    - label: "<detected> (detected, recommended)"   # e.g. "opus (detected, recommended)"
      description: "I'll review with <contrasting model> for a fresh perspective"
    - label: "<next strong model>"
      description: "Review will run on <its contrast>"
    - label: "<another strong model>"
      description: "Review will run on <its contrast>"
```

Skip the question only when detection was unambiguous and the user passed an explicit `with <model>` reviewer override (the override settles which model reviews). Otherwise ask.

**1c: Map to a contrasting reviewer.** On a client that can spawn a subagent pinned to a specific Claude model (Claude Code, or any adapter whose `Agent`/Task spawn accepts a `model` override): no API keys, no external setup; a subagent spawns a different-model reviewer and that model does the review:

| Author model | Reviewer model to spawn |
|---|---|
| `opus` | `sonnet` |
| `sonnet` | `opus` |
| `fable` | `opus` |
| `haiku` | `sonnet` |

Rules:
- The reviewer must never be the same family as the author, the one invariant this skill exists to guarantee.
- Never review with `haiku`; review is high-value reasoning, use a strong model.
- If no differing strong model is available (an org `availableModels`/`enforceAvailableModels` restriction, or a client whose subagents inherit the parent's model, e.g. Antigravity's `invoke_subagent`, which runs on the parent model), fall back to the strongest available model that differs from the author. If none differs, run the review inline on the author's model and say so plainly: a degraded review that shares the author's blind spots, not the cross-model guarantee. When independence matters, prefer switching your active model (below) over accepting the same-model review.
- If the user passed `with <model>`: honor it only if it differs from the author. If they named the author's own model, refuse and explain: "That's the model that wrote the code. Reviewing with it shares its blind spots. Using `<contrast>` instead."

**Non Claude adapters (e.g. Codex via `agents/openai.yaml`), a deliberate degraded path:** the table above and the mapping to Claude families only apply where the author or the reviewer (or both) is a Claude model spawned by a client that honors a subagent `model` override. When the author model is a non-Claude family (detected in 1a, e.g. `gpt-5`) or the active client has no way to pin a subagent to a different model, this skill cannot enforce the cross-model guarantee by spawning; say so plainly rather than silently reviewing same-model: "This client/model combination can't spawn a genuinely different-model reviewer, so the cross-model guarantee can't be enforced here. Switch your active model (see below) and re-run for an independent review; proceeding now reviews on the author's own model and shares its blind spots." Proceed inline only with the user's explicit go ahead, and label the result as same-model, not a cross-model review.

State the final choice plainly before spawning:
> "Author on `opus`; running the review on `sonnet`, a second model catches what the author model is blind to."

Want a different provider (GPT, Gemini)? Don't wire up API keys; switch your active model in your AI tool (`/model` for a different Claude, or open the change in your other assistant) and run the review there. The skill recommends this in its closing note for high-stakes changes; it never sends your code anywhere itself.

### 2. Scope the change set (cheap, names only, let the subagent read the diff)

Keep the main context lean: gather file names and the base ref only. The subagent runs the actual `git diff` and reads files. Choose a mode (apply the branching logic yourself, not via shell `if`/variables):
<!-- BASE-BRANCH-RESOLUTION:START (identical in check/modes/verify.md; edit both or neither) -->
- Base branch `BASE`: resolve the repository's real default branch, don't assume `main`/`master`:
  1. `git symbolic-ref --short refs/remotes/origin/HEAD`, strip the `origin/` prefix. The local cache of the remote's default branch; works offline, no network call.
  2. Empty or no `origin` remote: `git remote show origin`, read the `HEAD branch:` line (this one hits the network; skip it if there's no `origin` remote configured at all).
  3. Still unresolved (a local only repo with no remote): `git config init.defaultBranch` if set, else the first of `main` / `master` for which `git rev-parse --verify <name>` succeeds.
  4. Still nothing (a brand new repo with no commits on any candidate): there is no base to diff against yet; treat this as `MODE=uncommitted` and say so in the report rather than guessing a branch name.
<!-- BASE-BRANCH-RESOLUTION:END -->
- Current branch `CUR`: `git rev-parse --abbrev-ref HEAD`.
- Filename-safe `BRANCH_SLUG`: `CUR` with every `/` (a slash based name like `feature/login` would otherwise nest into a directory the write step never creates) and any other filesystem-unsafe character (`\ : * ? " < > |` and spaces) replaced with `-`. Use `CUR` verbatim in prose and report text; use `BRANCH_SLUG` only in file paths.
- If `CUR` equals `BASE` (working directly on the base branch) → `MODE=uncommitted`. Gather changed names with `git diff --name-only HEAD` plus untracked files via `git ls-files --others --exclude-standard`.
- Otherwise (feature branch: review everything that differs from the base, the PR-equivalent) → `MODE=branch`. Resolve the merge base with `git merge-base "$BASE" HEAD`, then gather names with `git diff --name-only <merge-base>` (committed-since-branch + uncommitted) plus untracked files via `git ls-files --others --exclude-standard`.

If the user passed `uncommitted`, force `MODE=uncommitted` regardless of branch.

De-duplicate the file list. Exclude lock files and generated output (`dist/`, `build/`, `.next/`, `coverage/`) from the count, but the subagent still sees the full diff.

If the change set is empty: stop and tell the engineer there's nothing to review (make a change first, or point /check review at a branch). Do not spawn.

### 3. Gather lightweight pointers (do NOT read heavy files here)

Paths and cheap signals only; the subagent reads on demand. Using your file tools: list the 3 most-recent spec files under `docs/specs/` (paths only), and resolve the test signal, one of three states, not a yes/no:
- `TESTS = configured`: `test-preferences.json` sets `"tool"` to a framework (a runner is set up). Judge test adequacy normally.
- `TESTS = none-by-design`: `test-preferences.json` has `"tool": null` and a `"gate"` (e.g. `"typecheck+verify"`), or the nearest `AGENTS.md`/governing spec states a "no test runner" convention. Deliberate: the gate is typecheck + `/check verify`, not a suite.
- `TESTS = none-yet`: no `test-preferences.json` at all, and no stated convention. A genuine gap.

Pass to the subagent: project-context contents inline (read `AGENTS.md`, canonical, or `CLAUDE.md` as fallback; short), the 3 recent spec paths, the base ref / merge-base, and the diff scope. The subagent reads a governing spec's **build-spec sections only** (`index.md`: Requirements, Decision, the design section, Consequences), the contract to review against; not `rationale.md` (decision history), unless a specific finding hinges on the reasoning. It runs `git diff` itself and reads the changed files and their tests.

### 4. Spawn the review subagent: on the contrasting Claude model

Resolve this skill's folder to an absolute path (you, the main agent, already resolve these relative paths, so you know the folder) and pass the absolute paths of two bundled files in the spawn prompt: `review-agent-prompt.md` (the spawn template) and `review-guide.md` (the rubric). Do not read their contents into the main context; the subagent's first action is to `Read` `review-agent-prompt.md` by path and follow it. Pass the dynamic values as a labeled list in the spawn prompt (`Placeholder values: ...`). Fallback: if your client's subagents cannot read files, read both files and inline their contents into a filled prompt instead (the old behavior). Then spawn:

- `model`: the reviewer model chosen in Step 1 (different family from the author)
- `description`: `"Review: <N> changed files on <reviewer-model>"`
- Tools: `Read`, `Bash`, `Grep`, `Glob`, `Write`, no `Edit` (the reviewer reports, it does not change code)
- `prompt`: the absolute path to `review-agent-prompt.md` (Read it first, then follow it), plus `Placeholder values:`, a labeled list supplying:
  1. `REVIEW_GUIDE`: the absolute path to `review-guide.md` (the subagent reads it as its rubric)
  2. Diff scope: `MODE`, `BASE`, `MERGE_BASE`, and the changed-file list with the exact `git diff` command to run
  3. Project-context contents (inline), `AGENTS.md` or `CLAUDE.md` fallback, the conventions the review must enforce
  4. Recent spec paths (read if relevant), or inline the relevant spec text if your client gives subagents no file access
  5. The test signal (`configured` / `none-by-design` / `none-yet`) so it judges test adequacy correctly; never nag for tests on a `none-by-design` project
  6. Output path for findings: `docs/reviews/<date>-<branch-slug>.md` (use `BRANCH_SLUG`, not `CUR`, so a slash based branch name like `feature/login` can't produce a path with a nested directory this skill never creates)

### 5. Relay the result

If the subagent errored or wrote no findings file, report the failure and offer to re-run; don't relay an empty or fabricated review. Otherwise it writes the findings file and returns a compact summary. Relay:

```
## /check review <feature> · <Approve | Approve with nits | Changes requested | Blocked>

Blockers (<count>) · fix before merge:
- <file:line · one line>
Major (<count>):
- <file:line · one line>
<count> minor/nits · strengths: <one line> · reviewed by <reviewer-model> over <N> files. Full findings in docs/reviews/<date>-<branch-slug>.md.
```

Lead with the verdict; show every blocker and major (they are the action); collapse minors/nits, strengths, and the reviewer/scope to the one tail line plus the file pointer. Zero blockers and zero majors → just the verdict line and the tail, nothing more.

For a high-stakes change (verdict was Blocked or Changes requested, or the change is high/critical severity), append one line:
> "For an independent second opinion from a different provider, switch your model with `/model` (or paste the diff into another assistant) and re-run /check review, no API keys needed."

**Tick the scope box (closing gate).** If the reviewed feature has a row in `docs/scope/`, tick its `Review it` box (the review ran; the box marks that, not that it passed) and confirm it in the report: "Scope: ticked `Review it`." No matching row → say so ("no scope row matched `<feature>`, tick it manually or enroll it"). This is the only scope edit review makes; it writes no code, tests, or specs.

This skill is complete after relaying. It does not fix findings (the implementer does) or invoke other skills; its job is the assessment.

---

## Reference files (in this skill's folder; relative paths)

- `review-agent-prompt.md`: lean spawn template; the main model passes its absolute path in the spawn prompt and the subagent reads and follows it
- `review-guide.md`: rubric, severity, findings format. The main model passes its absolute path in the subagent prompt; the subagent reads it (inline its text only if your client's subagents cannot read files).
