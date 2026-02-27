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
* **Manual Color Control:** The script does not touch event colors, allowing you to use your own color-coding system manually.
* **Flexible Tagging:** Works in both **Titles** and **Descriptions**.

---

## 🛠️ Installation

1. Open [Google Apps Script](https://script.google.com/).
2. Paste the code into `Code.gs`.
3. Ensure the function is named `calendarBlockManager`.
4. Click the **Triggers** (Clock icon) on the left sidebar.
5. Add a new trigger:
    * **Function:** `calendarBlockManager`
    * **Source:** `Time-driven`
    * **Type:** `Minutes timer`
    * **Interval:** `Every minute`

---

## 📋 How to Use

Add these shorthand hashtags to your event titles or descriptions:

| Routine | Anchor Tag (The Leader) | Link Tag (The Followers) |
| :--- | :--- | :--- |
| **Morning** | `#amanchor` | `#amlink` |
| **Commute** | `#commuteanchor` | `#commutelink` |
| **Evening** | `#pmanchor` | `#pmlink` |

> **Pro-Tip:** If you have multiple `#amlink` events, the script will sort them based on their original start times and stack them neatly in that order behind the anchor.

---

## 📄 License
Distributed under the MIT License.
