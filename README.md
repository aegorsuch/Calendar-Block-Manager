# 🚂 Calendar Block Manager (Train Logic)

A Google Apps Script that transforms Google Calendar from a static grid into a **dynamic, relational schedule**. 

### The Problem
Traditional calendars are static. If your "Anchor" event runs late, you have to manually drag every following event. If you prefer a "no-gap" schedule, this is a tedious process.

### The Solution: "Train Logic"
This script creates a physical relationship between an **Anchor** (the engine) and **Links** (the cars). When the engine moves, the cars follow automatically, maintaining their duration and sequence with zero gaps.

---

## 🚀 Key Features
* **Multi-Routine Support:** Manage `#am`, `#commute`, and `#pm` routines separately.
* **Smart Snap:** Automatically removes gaps or overlaps between related events.
* **Config via Script Properties:** Change routines, skip tags, lookahead, and calendar target without code edits.
* **Per-Routine Enable Flags:** Turn individual routines on/off without touching code.
* **Dry-Run Mode:** Preview planned changes in logs before applying them.
* **Fixed Event Protection:** Keep events tagged `#fixed` in place.
* **Conflict Protection:** Avoid moving routine links into times occupied by non-routine events.
* **Safety Brake:** Stop after a configured number of moves in a single run.
* **Manual Color Control:** The script does not touch event colors, allowing you to use your own color-coding system manually.
* **Flexible Tagging:** Works in both **Titles** and **Descriptions**.

---

## 🛠️ Installation

1. Open [Google Apps Script](https://script.google.com/).
2. Paste the code into `Code.gs`.
3. Ensure the function is named `CalendarBlockManager`.
4. Click the **Triggers** (Clock icon) on the left sidebar.
5. Add a new trigger:
    * **Function:** `CalendarBlockManager`
    * **Source:** `Time-driven`
    * **Type:** `Minutes timer`
    * **Interval:** `Every minute`
6. (Optional, recommended) Run `setDefaultScriptProperties` once from the Apps Script editor to seed configurable defaults.

### Optional Safe Trigger

Use `CalendarBlockManagerDryRun` as a separate trigger function when you want a permanent preview-only schedule check.
This function always logs planned moves and never applies event time changes.

### Trigger Helper Functions

Instead of manually configuring triggers, run these from the Apps Script editor:

- `createProductionTrigger()`
- `createDryRunTrigger()`
- `listManagerTriggers()`
- `deleteManagerTriggers()`
- `doctor()`

`doctor()` validates key script properties and trigger state, then logs a health report with warnings/errors.

---

## 📋 How to Use

Add these shorthand hashtags to your event titles or descriptions:

| Routine | Anchor Tag (The Leader) | Link Tag (The Followers) |
| :--- | :--- | :--- |
| **Morning** | `#amanchor` | `#amlink` |
| **Commute** | `#commuteanchor` | `#commutelink` |
| **Evening** | `#pmanchor` | `#pmlink` |

> **Pro-Tip:** If you have multiple `#amlink` events, the script will sort them based on their original start times and stack them neatly in that order behind the anchor.

### Skip/Protect an Event

Add `#fixed` to an event title or description to exclude it from auto-moves.

---

## ⚙️ Script Properties

You can configure behavior in **Apps Script > Project Settings > Script properties**.

| Property | Default | Description |
| :--- | :--- | :--- |
| `CBM_CALENDAR_ID` | *(empty)* | If empty, uses default calendar. If set, uses that calendar ID. |
| `CBM_LOOKAHEAD_DAYS` | `7` | Number of days scanned ahead (`1` to `30`). |
| `CBM_DRY_RUN` | `false` | `true` logs planned moves without applying. |
| `CBM_SKIP_TAGS` | `#fixed` | Comma-separated tags that should not be moved. |
| `CBM_PROTECT_EXTERNAL_CONFLICTS` | `true` | If `true`, skips moves that would overlap non-routine events. |
| `CBM_MAX_MOVES_PER_RUN` | `50` | Safety cap for planned/applied moves per execution (`1` to `1000`). |
| `CBM_ENABLED_ROUTINES` | `am,commute,pm` | Comma-separated routine keys that are currently active. |
| `CBM_ROUTINES_JSON` | default routines | JSON array of `{ "key": "...", "anchorTag": "#...", "linkTag": "#..." }`. |

Example `CBM_ROUTINES_JSON` value:

```json
[
    { "key": "am", "anchorTag": "#amanchor", "linkTag": "#amlink" },
    { "key": "commute", "anchorTag": "#commuteanchor", "linkTag": "#commutelink" },
    { "key": "pm", "anchorTag": "#pmanchor", "linkTag": "#pmlink" }
]
```

---

## 🧪 Local Test Harness

This repo includes a small Node test harness with mock events for scheduling logic checks.

```powershell
npm test
```

---

## ✅ Stable Daily Ops (5 Lines)

1. `git pull`
2. `npm run gas:pull`
3. Make edits, then run `npm test`
4. `npm run gas:push`
5. `npm run git:sync`

---

## 🤖 Automation

- Pre-push local test gate (repo-managed git hook)
    - One-time setup: `npm run setup:hooks`
    - After setup, every `git push` runs `npm run check:full` automatically.
- One-command deploy from local
    - `npm run deploy:all`
    - Runs guarded checks: clean tree + `main` branch + clasp auth + `check:full` -> GAS push -> git push.
- GitHub CI
    - `.github/workflows/ci.yml` runs `npm test` on every push to `main` and every pull request.
    - Exposes two enforceable checks for branch protection:
        - `policy-checks`
        - `unit-tests`

---

## 📄 Rollback

If a deploy causes bad behavior, roll back quickly:

1. Inspect tags/commits and pick the last known good revision.
2. Check out that revision locally.
3. Push that revision to Apps Script.
4. Push/re-tag in GitHub if needed.

Example commands:

```powershell
git log --oneline -n 20
git checkout <good_commit_or_tag>
npm run gas:push
git checkout main
```

If you want to preserve rollback points, create tags before deploys:

```powershell
git tag v2026.03.06-1
git push origin v2026.03.06-1
```

---

## 📄 License
Distributed under the MIT License.
