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
* **Dry-Run Mode:** Preview planned changes in logs before applying them.
* **Fixed Event Protection:** Keep events tagged `#fixed` in place.
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
| `CBM_ROUTINES_JSON` | default routines | JSON array of `{ "anchorTag": "#...", "linkTag": "#..." }`. |

Example `CBM_ROUTINES_JSON` value:

```json
[
    { "anchorTag": "#amanchor", "linkTag": "#amlink" },
    { "anchorTag": "#commuteanchor", "linkTag": "#commutelink" },
    { "anchorTag": "#pmanchor", "linkTag": "#pmlink" }
]
```

---

## 🧪 Local Test Harness

This repo includes a small Node test harness with mock events for scheduling logic checks.

```powershell
npm test
```

---

## 📄 License
Distributed under the MIT License.
