# Development

The public profile is `profile/README.md`. Use absolute image URLs because GitHub also renders it at the organization root. Keep the featured-project table short and add only public repositories.

## Checks and CI

Run `node scripts/check.mjs` with Node.js 22 or newer. No dependency installation is needed. CI runs on UbiCloud with `ubicloud-standard-2-ubuntu-2404`. GitHub Actions schedules the jobs; the UbiCloud integration must have access to this repository. Check actual job labels and runner names before claiming a UbiCloud pass.

PRs follow [the shared standard](pull-request-standard.md). The metadata workflow executes trusted base code only. It activates after these files reach the default branch. Merge blocking also requires separately configured repository protection; a status alone does not enable it. The PR standard and dependencies were copied from JibHQ/jib-factory at `89bebabdf024f9124ec0166f52f6e9217a7c7610`.

## Worktrees

The worktree toolkit was installed with `node install.mjs /path/to/this/repo` from FantasticDevHQ/convex-worktrees at `f385065e8355a2ef103bcb9206602a490e2fb9a7`. All exported modules and tests are included. The configuration disables Convex and the frontend because this repository contains Markdown and assets. No backend, account or credentials are needed.

From a clean checkout, run `node scripts/worktree/cli.mjs setup` before work. Use `start`, `stop` and `teardown` for the lifecycle. `stop` preserves state; `teardown` releases reservations while preserving data; explicit `cleanup --yes` deletes only owned state. `prune` removes stale reservations.

To create a checkout, run `node scripts/worktree/cli.mjs setup --path ../profile-worktree --branch docs/profile-update`. Setup discovers and fetches the live origin default branch unless `baseBranch` is explicitly configured. It uses the fetched commit and stops on unsafe Git states.

The real Convex backend integration test is intentionally not run here. This profile repository has no application backend.
