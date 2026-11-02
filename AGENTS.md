# Organization profile

Edit `profile/README.md` for the public organization overview. Preserve the official logo unchanged and keep image URLs absolute. Do not add private repository information or release automation here.

Use `node scripts/check.mjs`. Worktree implementation and tests belong in `scripts/worktree/`; this repository is backend-free. Run setup from a clean checkout, and teardown/cleanup when finished. Follow `docs/pull-request-standard.md`. CI uses UbiCloud only, and metadata enforcement must execute trusted base code.
