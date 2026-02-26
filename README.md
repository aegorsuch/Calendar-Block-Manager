# 🚂 Calendar Block Manager (Train Logic)

A Google Apps Script that transforms Google Calendar from a static grid into a **dynamic, relational schedule**. 

### The Solution: "Train Logic"
This script creates a physical relationship between an **Anchor** (the engine) and **Links** (the cars). When the engine moves, the cars follow automatically—maintaining their duration and sequence with zero gaps in between.



---

## 📋 How to Use

Simply add these shorthand hashtags to your event titles or descriptions. The script handles the rest.

| Routine | Anchor Tag (The Leader) | Link Tag (The Followers) |
| :--- | :--- | :--- |
| **Morning** | `#amanchor` | `#amlink` |
| **Commute** | `#commuteanchor` | `#commutelink` |
| **Evening** | `#pmanchor` | `#pmlink` |

> **Pro-Tip:** If you have multiple `#amlink` events, the script will sort them based on their *original* start times and stack them neatly in that order behind the anchor.

---

## 🛠️ Installation

1. Open [Google Apps Script](https://script.google.com/).
2. Click **+ New Project** and paste the code from `Code.gs`.
3. **Important:** Ensure the function is named `calendarBlockManager`.
4. Click the **Triggers** (Clock icon) on the left sidebar and set `calendarBlockManager` to run every minute (Time-driven).

---

## 📄 License
Distributed under the MIT License.
