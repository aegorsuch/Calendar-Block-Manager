const DEFAULT_ROUTINES = [
  { anchorTag: "#amanchor", linkTag: "#amlink" },
  { anchorTag: "#commuteanchor", linkTag: "#commutelink" },
  { anchorTag: "#pmanchor", linkTag: "#pmlink" }
];

const DEFAULT_LOOKAHEAD_DAYS = 7;
const DEFAULT_SKIP_TAGS = ["#fixed"];

/**
 * Calendar Block Manager
 * Train logic: for each tagged anchor, snap same-day tagged link events behind it.
 */
function CalendarBlockManager() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log("Skipped run: another trigger execution is still active.");
    return;
  }

  try {
    const config = loadConfiguration();
    const calendar = getCalendar(config.calendarId);
    const timeZone = Session.getScriptTimeZone();
    const startSearch = new Date();
    startSearch.setHours(0, 0, 0, 0);

    const endSearch = new Date(startSearch.getTime());
    endSearch.setDate(endSearch.getDate() + config.lookAheadDays);

    const allEvents = calendar.getEvents(startSearch, endSearch);
    const eventsByDay = groupEventsByDay(allEvents, timeZone);
    const stats = {
      anchors: 0,
      followers: 0,
      moved: 0,
      skippedFixed: 0
    };

    config.routines.forEach(function (routine) {
      allEvents
        .filter(function (event) {
          return eventHasTag(event, routine.anchorTag);
        })
        .forEach(function (anchor) {
          stats.anchors += 1;
          const dayKey = getDayKey(anchor.getStartTime(), timeZone);
          const followers = (eventsByDay[dayKey] || [])
            .filter(function (event) {
              return event.getId() !== anchor.getId() && eventHasTag(event, routine.linkTag);
            })
            .sort(function (a, b) {
              return a.getStartTime().getTime() - b.getStartTime().getTime();
            });

          if (followers.length === 0) {
            return;
          }

          let nextStartTime = anchor.getEndTime();
          followers.forEach(function (event) {
            stats.followers += 1;

            if (eventHasAnyTag(event, config.skipTags)) {
              stats.skippedFixed += 1;
              if (event.getEndTime().getTime() > nextStartTime.getTime()) {
                nextStartTime = event.getEndTime();
              }
              return;
            }

            const durationMs = event.getEndTime().getTime() - event.getStartTime().getTime();
            const newEnd = new Date(nextStartTime.getTime() + durationMs);
            const needsMove = event.getStartTime().getTime() !== nextStartTime.getTime();

            if (needsMove) {
              if (config.dryRun) {
                Logger.log(
                  "[DRY_RUN] Would move " +
                    event.getTitle() +
                    " to " +
                    nextStartTime.toISOString() +
                    " - " +
                    newEnd.toISOString()
                );
              } else {
                event.setTime(nextStartTime, newEnd);
              }
              stats.moved += 1;
            }

            nextStartTime = newEnd;
          });

          Logger.log("Synced " + dayKey + " for " + routine.anchorTag);
        });
    });

    Logger.log(
      "Run complete: anchors=" +
        stats.anchors +
        ", followers=" +
        stats.followers +
        ", moved=" +
        stats.moved +
        ", skippedFixed=" +
        stats.skippedFixed +
        ", dryRun=" +
        config.dryRun
    );
  } catch (error) {
    Logger.log("CalendarBlockManager failed: " + error);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Writes starter properties so configuration can be changed without code edits.
 */
function setDefaultScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  props.setProperties(
    {
      CBM_CALENDAR_ID: "",
      CBM_LOOKAHEAD_DAYS: String(DEFAULT_LOOKAHEAD_DAYS),
      CBM_DRY_RUN: "false",
      CBM_SKIP_TAGS: DEFAULT_SKIP_TAGS.join(","),
      CBM_ROUTINES_JSON: JSON.stringify(DEFAULT_ROUTINES)
    },
    false
  );
  Logger.log("Default Calendar Block Manager properties saved.");
}

function loadConfiguration() {
  const props = PropertiesService.getScriptProperties().getProperties();
  return {
    calendarId: (props.CBM_CALENDAR_ID || "").trim(),
    lookAheadDays: parseLookAheadDays(props.CBM_LOOKAHEAD_DAYS),
    dryRun: parseBoolean(props.CBM_DRY_RUN),
    skipTags: parseTagList(props.CBM_SKIP_TAGS, DEFAULT_SKIP_TAGS),
    routines: parseRoutines(props.CBM_ROUTINES_JSON)
  };
}

function getCalendar(calendarId) {
  if (!calendarId) {
    return CalendarApp.getDefaultCalendar();
  }

  const calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) {
    throw new Error("Calendar not found for CBM_CALENDAR_ID: " + calendarId);
  }
  return calendar;
}

function parseLookAheadDays(value) {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    return DEFAULT_LOOKAHEAD_DAYS;
  }
  return Math.min(30, Math.max(1, parsed));
}

function parseBoolean(value) {
  return String(value || "").toLowerCase() === "true";
}

function parseTagList(raw, defaultTags) {
  const source = raw && raw.trim() ? raw : defaultTags.join(",");
  const tags = source
    .split(",")
    .map(function (part) {
      return normalizeTag(part);
    })
    .filter(function (tag) {
      return tag.length > 0;
    });
  return tags.length > 0 ? tags : defaultTags.slice();
}

function parseRoutines(rawJson) {
  if (!rawJson || !rawJson.trim()) {
    return DEFAULT_ROUTINES.slice();
  }

  try {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_ROUTINES.slice();
    }

    const normalized = parsed
      .map(function (item) {
        if (!item || typeof item !== "object") {
          return null;
        }
        const anchorTag = normalizeTag(item.anchorTag || "");
        const linkTag = normalizeTag(item.linkTag || "");
        if (!anchorTag || !linkTag) {
          return null;
        }
        return { anchorTag: anchorTag, linkTag: linkTag };
      })
      .filter(function (item) {
        return item !== null;
      });

    return normalized.length > 0 ? normalized : DEFAULT_ROUTINES.slice();
  } catch (error) {
    Logger.log("Invalid CBM_ROUTINES_JSON. Falling back to defaults. Error: " + error);
    return DEFAULT_ROUTINES.slice();
  }
}

function normalizeTag(tag) {
  const trimmed = String(tag || "").trim().toLowerCase();
  if (!trimmed) {
    return "";
  }
  return trimmed.charAt(0) === "#" ? trimmed : "#" + trimmed;
}

function eventHasTag(event, tag) {
  const tags = extractHashtags(eventText(event));
  return tags.indexOf(normalizeTag(tag)) !== -1;
}

function eventHasAnyTag(event, tags) {
  const eventTags = extractHashtags(eventText(event));
  return tags.some(function (tag) {
    return eventTags.indexOf(normalizeTag(tag)) !== -1;
  });
}

function eventText(event) {
  const title = event.getTitle() || "";
  const description = event.getDescription() || "";
  return (title + " " + description).toLowerCase();
}

function extractHashtags(text) {
  const matches = String(text || "").match(/#[a-z0-9_-]+/g);
  return matches ? matches : [];
}

function groupEventsByDay(events, timeZone) {
  const grouped = {};
  events.forEach(function (event) {
    const dayKey = getDayKey(event.getStartTime(), timeZone);
    if (!grouped[dayKey]) {
      grouped[dayKey] = [];
    }
    grouped[dayKey].push(event);
  });
  return grouped;
}

function getDayKey(date, timeZone) {
  return Utilities.formatDate(date, timeZone, "yyyy-MM-dd");
}
