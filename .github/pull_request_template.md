## Summary

Describe what changed and why.

## Type of Change

- [ ] Feature
- [ ] Fix
- [ ] Refactor
- [ ] Docs
- [ ] Chore

## Validation

- [ ] `npm run check:full` passes locally
- [ ] `policy-checks` is green in GitHub Actions
- [ ] `unit-tests` is green in GitHub Actions
- [ ] `doctor()` run (or not needed for this change)

## Apps Script Impact

- [ ] No Apps Script runtime impact
- [ ] Requires `npm run gas:push`
- [ ] Trigger/config changes required

If trigger/config changes are required, describe them:

## Rollback Plan

If this causes issues, how will you roll back quickly?

- [ ] Revert commit
- [ ] Restore known-good tag/commit and run `npm run gas:push`

Details:

## Checklist

- [ ] Branch protection checks are passing (`policy-checks`, `unit-tests`)
- [ ] Docs updated (`README.md` and/or `CONTRIBUTING.md`) if behavior changed
- [ ] No secrets added (`.clasprc.json` remains untracked)
