# Anchor and Link Event Sequence Manager 🗓️

A Google Apps Script that transforms Google Calendar from a static grid into a **dynamic, relational schedule**. 

### The Problem
Traditional calendars are static. If your "Anchor" event runs late, you have to manually drag every following event. If you prefer a "no-gap" schedule, this is a tedious process.

### The Solution: "The Train Logic"
This script creates a relationship between an **Anchor** (the engine) and **Links** (the cars). When the Anchor moves, the Links follow immediately, maintaining their duration and sequence.



---

## 🚀 Key Features
* **Multi-Routine Support:** Manage `#morning`, `#commute`, and `#evening` routines separately.
* **Smart Snap:** Automatically removes gaps between related events.
* **Visual Feedback:** Auto-colors routines (Basil for Anchors, Sage for Links).
* **Flexible Tagging:** Works in both **Titles** and **Descriptions**.

---

## 🛠️ Installation

1. Open [Google Apps Script](https://script.google.com/).
2. Click **+ New Project** and paste the code from `Code.gs`.
3. Click the **Triggers** (Clock icon) on the left sidebar.
4. Add a new trigger:
    * **Function:** `syncRoutine`
    * **Source:** `Time-driven`
    * **Type:** `Minutes timer`
    * **Interval:** `Every minute`



---

## 📋 How to Use

Add these hashtags to your event titles:

| Routine | Anchor Tag (The Leader) | Link Tag (The Followers) |
| :--- | :--- | :--- |
| **Morning** | `#morninganchor` | `#morninglink` |
| **Commute** | `#commutehomeanchor` | `#commutehomelink` |
| **Evening** | `#eveninganchor` | `#eveninglink` |

---

## 📄 License
Distributed under the MIT License.
