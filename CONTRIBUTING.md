# Contributing

## Purpose
This project syncs code between:
- Local folder (`C:\Projects\Calendar-Block-Manager`)
- GitHub repo (`aegorsuch/Calendar-Block-Manager`)
- Google Apps Script project (bound via `.clasp.json`)

## Prerequisites
- Git installed
- Node.js + npm installed
- `clasp` installed (`npm install -g @google/clasp`)
- Logged in to Google for Apps Script access (`clasp login`)

## 30-Second Daily Workflow
1. Pull latest GitHub changes:

```powershell
git pull
```

2. Pull latest Apps Script changes:

```powershell
npm run gas:pull
```

3. Make edits locally.

4. Push to Apps Script:

```powershell
npm run gas:push
```

5. Commit and push to GitHub:

```powershell
npm run git:sync
```

## NPM Helper Commands
- `npm run gas:status` - Show clasp-tracked files
- `npm run gas:pull` - Pull from Apps Script to local
- `npm run gas:push` - Push local to Apps Script
- `npm run gas:open` - Open Apps Script project in browser
- `npm run git:status` - Show git status
- `npm run git:sync` - Add, commit, and push local changes
- `npm test` - Run local mock scheduling tests

## Configuration Workflow
1. In Apps Script editor, run `setDefaultScriptProperties` once.
2. Open Project Settings and adjust any `CBM_*` script properties.
3. Use `CBM_DRY_RUN=true` when validating new routine/tag setups.
4. Set `CBM_DRY_RUN=false` after logs look correct.
5. Keep `CBM_PROTECT_EXTERNAL_CONFLICTS=true` unless you explicitly want routine moves to ignore non-routine event overlap.
6. Keep `CBM_MAX_MOVES_PER_RUN` at a safe value (default `50`) to limit blast radius from bad config.
7. Use `CBM_ENABLED_ROUTINES` to selectively enable routine keys.
8. Run `doctor()` after property edits to validate configuration and trigger health.

## Trigger Options
- `CalendarBlockManager` - normal runtime (respects `CBM_DRY_RUN` property)
- `CalendarBlockManagerDryRun` - always preview mode (ignores and overrides property to dry-run)

## Trigger Management Helpers
- `createProductionTrigger()` - creates minute trigger for `CalendarBlockManager`
- `createDryRunTrigger()` - creates minute trigger for `CalendarBlockManagerDryRun`
- `listManagerTriggers()` - logs/returns trigger metadata for both manager handlers
- `deleteManagerTriggers()` - deletes manager triggers if you need a clean reset
- `doctor()` - validates config shape, calendar binding access, routine toggles, and trigger presence

## Safe Sync Rules
- Run `npm run gas:pull` before editing if you made script changes in the Apps Script web editor.
- Run `git pull` before `npm run git:sync` when collaborating.
- Never commit `.clasprc.json` (already ignored in `.gitignore`).
- Treat `.clasp.json` as project config and keep it in Git.

## If Push Fails
1. Git push rejected:

```powershell
git pull --rebase
git push
```

2. Apps Script push error:

```powershell
npm run gas:status
npm run gas:pull
npm run gas:push
```
