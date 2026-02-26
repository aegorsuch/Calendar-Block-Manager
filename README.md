# 🚂 Calendar Block Manager (Train Logic)

A Google Apps Script that transforms Google Calendar from a static grid into a **dynamic, relational schedule**. 

### The Problem
Traditional calendars are brittle. If your "Anchor" event (like a morning workout or a meeting) runs late, you have to manually drag every following block to fix your day. If you prefer a "zero-gap" schedule, this is a tedious, manual process.

### The Solution: "Train Logic"
This script creates a physical relationship between an **Anchor** (the engine) and **Links** (the cars). When the engine moves, the cars follow automatically—maintaining their duration and sequence with zero gaps in between.

[Image of a sequence diagram showing a calendar anchor event moving and following link events snapping to its end]

---

## 🚀 Key Features
* **Multi-Routine Support:** Manage `#morning`, `#commute`, and `#evening` routines independently.
* **Smart Snap:** Automatically removes gaps and overlaps between related events.
* **API Efficient:** Only moves events if the time has actually changed, preserving your Google API quota.
* **Flexible Tagging:** Scans both **Titles** and **Descriptions** for hashtags.

---

## 🛠️ Installation

1. Open [Google Apps Script](https://script.google.com/).
2. Click **+ New Project** and paste the code from `Code.gs`.
3. **Important:** Name the function `calendarBlockManager` (avoid using dashes `-` in the actual code function name to prevent syntax errors).
4. Click the **Triggers** (Clock icon) on the left sidebar.
5. Add a new trigger:
    * **Function:** `calendarBlockManager`
    * **Source:** `Time-driven`
    * **Type:** `Minutes timer`
    * **Interval:** `Every minute` (or every 5 minutes for lower overhead).

---

## 📋 How to Use

Simply add these hashtags to your event titles or descriptions. The script handles the rest.

| Routine | Anchor Tag (The Leader
