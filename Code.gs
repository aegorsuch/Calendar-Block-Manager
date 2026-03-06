const DEFAULT_ROUTINES = [
  { key: "am", anchorTag: "#amanchor", linkTag: "#amlink" },
  { key: "commute", anchorTag: "#commuteanchor", linkTag: "#commutelink" },
  { key: "pm", anchorTag: "#pmanchor", linkTag: "#pmlink" }
];

const DEFAULT_LOOKAHEAD_DAYS = 7;
const DEFAULT_SKIP_TAGS = ["#fixed"];
const DEFAULT_TRIGGER_MINUTES = 1;
const DEFAULT_PROTECT_EXTERNAL_CONFLICTS = true;
const DEFAULT_MAX_MOVES_PER_RUN = 50;
const DEFAULT_ENABLED_ROUTINE_KEYS = DEFAULT_ROUTINES.map(function (routine) {
  return routine.key;
});

/**
 * Calendar Block Manager
 * Train logic: for each tagged anchor, snap same-day tagged link events behind it.
 */
function CalendarBlockManager() {
  return executeCalendarBlockManager({ forceDryRun: false });
}

/**
 * Safe preview mode: logs planned moves without applying event time changes.
 * Useful for a dedicated dry-run trigger.
 */
function CalendarBlockManagerDryRun() {
  return executeCalendarBlockManager({ forceDryRun: true });
}

function executeCalendarBlockManager(options) {
  options = options || {};

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log("Skipped run: another trigger execution is still active.");
    return;
  }

  try {
    const config = loadConfiguration();
    if (options.forceDryRun) {
      config.dryRun = true;
    }
    const calendar = getCalendar(config.calendarId);
    const timeZone = Session.getScriptTimeZone();
    const startSearch = new Date();
    startSearch.setHours(0, 0, 0, 0);

    const endSearch = new Date(startSearch.getTime());
    endSearch.setDate(endSearch.getDate() + config.lookAheadDays);

    const allEvents = calendar.getEvents(startSearch, endSearch);
    const eventsByDay = groupEventsByDay(allEvents, timeZone);
    const stats = {
      routinesEnabled: config.routines.length,
      anchors: 0,
      followers: 0,
      moved: 0,
      skippedFixed: 0,
      skippedConflict: 0,
      skippedMoveLimit: 0,
      hitMoveLimit: false
    };

    if (config.routines.length === 0) {
      Logger.log("No enabled routines found. Run doctor() or update CBM_ENABLED_ROUTINES.");
      return;
    }

    let stopRequested = false;

    config.routines.forEach(function (routine) {
      if (stopRequested) {
        return;
      }

      allEvents
        .filter(function (event) {
          return eventHasTag(event, routine.anchorTag);
        })
        .forEach(function (anchor) {
          if (stopRequested) {
            return;
          }

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
            if (stopRequested) {
              return;
            }

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

            if (needsMove && stats.moved >= config.maxMovesPerRun) {
              stats.hitMoveLimit = true;
              stats.skippedMoveLimit += 1;
              stopRequested = true;
              Logger.log(
                "[SAFETY_BRAKE] Move limit reached (" +
                  config.maxMovesPerRun +
                  "). Stopping remaining updates."
              );
              return;
            }

            const hasConflict =
              needsMove &&
              config.protectExternalConflicts &&
              overlapsWithNonRoutineEvent(
                eventsByDay[dayKey] || [],
                event,
                nextStartTime,
                newEnd,
                config.routines
              );

            if (hasConflict) {
              stats.skippedConflict += 1;
              Logger.log(
                "[SKIP_CONFLICT] " +
                  event.getTitle() +
                  " remains at " +
                  event.getStartTime().toISOString() +
                  " - " +
                  event.getEndTime().toISOString()
              );
              if (event.getEndTime().getTime() > nextStartTime.getTime()) {
                nextStartTime = event.getEndTime();
              }
              return;
            }

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
      "Run complete: routinesEnabled=" +
        stats.routinesEnabled +
        ", anchors=" +
        stats.anchors +
        ", followers=" +
        stats.followers +
        ", moved=" +
        stats.moved +
        ", skippedFixed=" +
        stats.skippedFixed +
        ", skippedConflict=" +
        stats.skippedConflict +
        ", skippedMoveLimit=" +
        stats.skippedMoveLimit +
        ", hitMoveLimit=" +
        stats.hitMoveLimit +
        ", maxMovesPerRun=" +
        config.maxMovesPerRun +
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
      CBM_PROTECT_EXTERNAL_CONFLICTS: String(DEFAULT_PROTECT_EXTERNAL_CONFLICTS),
      CBM_MAX_MOVES_PER_RUN: String(DEFAULT_MAX_MOVES_PER_RUN),
      CBM_ENABLED_ROUTINES: DEFAULT_ENABLED_ROUTINE_KEYS.join(","),
      CBM_ROUTINES_JSON: JSON.stringify(DEFAULT_ROUTINES)
    },
    false
  );
  Logger.log("Default Calendar Block Manager properties saved.");
}

/**
 * Creates a minute trigger for the normal runtime function.
 */
function createProductionTrigger() {
  return createManagerTrigger_("CalendarBlockManager", DEFAULT_TRIGGER_MINUTES);
}

/**
 * Creates a minute trigger for the always-safe dry-run function.
 */
function createDryRunTrigger() {
  return createManagerTrigger_("CalendarBlockManagerDryRun", DEFAULT_TRIGGER_MINUTES);
}

/**
 * Deletes all triggers owned by this project for manager runtime functions.
 */
function deleteManagerTriggers() {
  const handlerNames = {
    CalendarBlockManager: true,
    CalendarBlockManagerDryRun: true
  };

  const triggers = ScriptApp.getProjectTriggers();
  let deleted = 0;

  triggers.forEach(function (trigger) {
    if (handlerNames[trigger.getHandlerFunction()]) {
      ScriptApp.deleteTrigger(trigger);
      deleted += 1;
    }
  });

  Logger.log("Deleted " + deleted + " Calendar Block Manager trigger(s).");
  return deleted;
}

/**
 * Logs and returns trigger metadata for manager runtime functions.
 */
function listManagerTriggers() {
  const handlerNames = {
    CalendarBlockManager: true,
    CalendarBlockManagerDryRun: true
  };

  const result = ScriptApp.getProjectTriggers()
    .filter(function (trigger) {
      return handlerNames[trigger.getHandlerFunction()];
    })
    .map(function (trigger) {
      return {
        id: trigger.getUniqueId(),
        handler: trigger.getHandlerFunction(),
        source: String(trigger.getTriggerSource()),
        eventType: String(trigger.getEventType())
      };
    });

  Logger.log("Calendar Block Manager triggers: " + JSON.stringify(result));
  return result;
}

/**
 * Configuration diagnostics for script properties and trigger health.
 */
function doctor() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const report = {
    ok: true,
    errors: [],
    warnings: [],
    info: {}
  };

  const routinesValidation = validateRoutinesJson(props.CBM_ROUTINES_JSON);
  const routines = routinesValidation.routines;
  const enabledRequested = parseRequestedRoutineKeys(props.CBM_ENABLED_ROUTINES);
  const enabledResolved = parseEnabledRoutineKeys(props.CBM_ENABLED_ROUTINES, routines);

  if (!routinesValidation.valid) {
    report.warnings.push(
      "CBM_ROUTINES_JSON is invalid or empty. Defaults are being used. Error: " +
        routinesValidation.error
    );
  }

  if (!isBooleanPropertyValue(props.CBM_DRY_RUN)) {
    report.warnings.push("CBM_DRY_RUN should be true or false. Current value: " + props.CBM_DRY_RUN);
  }

  if (!isBooleanPropertyValue(props.CBM_PROTECT_EXTERNAL_CONFLICTS)) {
    report.warnings.push(
      "CBM_PROTECT_EXTERNAL_CONFLICTS should be true or false. Current value: " +
        props.CBM_PROTECT_EXTERNAL_CONFLICTS
    );
  }

  if (!isFiniteIntegerString(props.CBM_LOOKAHEAD_DAYS)) {
    report.warnings.push(
      "CBM_LOOKAHEAD_DAYS should be an integer (1-30). Current value: " +
        props.CBM_LOOKAHEAD_DAYS
    );
  }

  if (!isFiniteIntegerString(props.CBM_MAX_MOVES_PER_RUN)) {
    report.warnings.push(
      "CBM_MAX_MOVES_PER_RUN should be an integer (1-1000). Current value: " +
        props.CBM_MAX_MOVES_PER_RUN
    );
  }

  if (enabledRequested.length > 0) {
    const unknownEnabled = enabledRequested.filter(function (key) {
      return routines.map(function (routine) {
        return routine.key;
      }).indexOf(key) === -1;
    });
    if (unknownEnabled.length > 0) {
      report.warnings.push(
        "CBM_ENABLED_ROUTINES includes unknown keys: " + unknownEnabled.join(", ")
      );
    }
  }

  if (enabledResolved.length === 0) {
    report.errors.push("No enabled routines resolved. Check CBM_ROUTINES_JSON and CBM_ENABLED_ROUTINES.");
  }

  const duplicateKeys = findDuplicateRoutineKeys(routines);
  if (duplicateKeys.length > 0) {
    report.warnings.push("Duplicate routine keys detected: " + duplicateKeys.join(", "));
  }

  const calendarId = (props.CBM_CALENDAR_ID || "").trim();
  if (calendarId) {
    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
      report.errors.push("CBM_CALENDAR_ID does not resolve to a calendar: " + calendarId);
    }
  }

  const triggers = listManagerTriggers();
  if (triggers.length === 0) {
    report.warnings.push("No manager triggers found. Run createProductionTrigger() or createDryRunTrigger().");
  }

  report.info = {
    enabledRoutines: enabledResolved,
    routineCount: routines.length,
    lookAheadDays: parseLookAheadDays(props.CBM_LOOKAHEAD_DAYS),
    maxMovesPerRun: parseMaxMovesPerRun(props.CBM_MAX_MOVES_PER_RUN),
    dryRun: parseBoolean(props.CBM_DRY_RUN),
    protectExternalConflicts: parseProtectedConflicts(props.CBM_PROTECT_EXTERNAL_CONFLICTS),
    hasCalendarOverride: Boolean(calendarId),
    triggerCount: triggers.length
  };

  report.ok = report.errors.length === 0;
  Logger.log("doctor report: " + JSON.stringify(report));
  return report;
}

function createManagerTrigger_(handlerFunction, everyMinutes) {
  const existing = ScriptApp.getProjectTriggers().filter(function (trigger) {
    return trigger.getHandlerFunction() === handlerFunction;
  });

  if (existing.length > 0) {
    Logger.log(
      "Trigger already exists for " +
        handlerFunction +
        ". Count=" +
        existing.length +
        ". Skipping create."
    );
    return existing.length;
  }

  ScriptApp.newTrigger(handlerFunction).timeBased().everyMinutes(everyMinutes).create();
  Logger.log("Created " + handlerFunction + " trigger (every " + everyMinutes + " minute[s]).");
  return 1;
}

function validateRoutinesJson(rawJson) {
  if (!rawJson || !rawJson.trim()) {
    return {
      valid: false,
      error: "value is empty",
      routines: DEFAULT_ROUTINES.slice()
    };
  }

  try {
    JSON.parse(rawJson);
    return {
      valid: true,
      error: "",
      routines: parseRoutines(rawJson)
    };
  } catch (error) {
    return {
      valid: false,
      error: String(error),
      routines: DEFAULT_ROUTINES.slice()
    };
  }
}

function parseRequestedRoutineKeys(raw) {
  if (!raw || !raw.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map(function (part) {
      return normalizeRoutineKey(part);
    })
    .filter(function (part) {
      return part.length > 0;
    });
}

function findDuplicateRoutineKeys(routines) {
  const seen = {};
  const duplicates = {};

  routines.forEach(function (routine) {
    const key = routine.key;
    if (seen[key]) {
      duplicates[key] = true;
    }
    seen[key] = true;
  });

  return Object.keys(duplicates);
}

function loadConfiguration() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const allRoutines = parseRoutines(props.CBM_ROUTINES_JSON);
  const enabledRoutineKeys = parseEnabledRoutineKeys(props.CBM_ENABLED_ROUTINES, allRoutines);
  const routines = allRoutines.filter(function (routine) {
    return enabledRoutineKeys.indexOf(routine.key) !== -1;
  });

  return {
    calendarId: (props.CBM_CALENDAR_ID || "").trim(),
    lookAheadDays: parseLookAheadDays(props.CBM_LOOKAHEAD_DAYS),
    dryRun: parseBoolean(props.CBM_DRY_RUN),
    protectExternalConflicts: parseProtectedConflicts(props.CBM_PROTECT_EXTERNAL_CONFLICTS),
    maxMovesPerRun: parseMaxMovesPerRun(props.CBM_MAX_MOVES_PER_RUN),
    skipTags: parseTagList(props.CBM_SKIP_TAGS, DEFAULT_SKIP_TAGS),
    routines: routines,
    allRoutines: allRoutines,
    enabledRoutineKeys: enabledRoutineKeys
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

function isBooleanPropertyValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "" || normalized === "true" || normalized === "false";
}

function isFiniteIntegerString(value) {
  const normalized = String(value || "").trim();
  if (normalized === "") {
    return true;
  }
  return /^-?\d+$/.test(normalized);
}

function parseProtectedConflicts(value) {
  if (String(value || "").trim() === "") {
    return DEFAULT_PROTECT_EXTERNAL_CONFLICTS;
  }
  return parseBoolean(value);
}

function parseMaxMovesPerRun(value) {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    return DEFAULT_MAX_MOVES_PER_RUN;
  }
  return Math.min(1000, Math.max(1, parsed));
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
        const key = normalizeRoutineKey(item.key || deriveRoutineKey(anchorTag, linkTag));
        if (!anchorTag || !linkTag) {
          return null;
        }
        return { key: key, anchorTag: anchorTag, linkTag: linkTag };
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

function parseEnabledRoutineKeys(raw, routines) {
  const available = routines.map(function (routine) {
    return routine.key;
  });

  if (!raw || !raw.trim()) {
    return available;
  }

  const requested = raw
    .split(",")
    .map(function (part) {
      return normalizeRoutineKey(part);
    })
    .filter(function (part) {
      return part.length > 0;
    });

  const selected = requested.filter(function (key) {
    return available.indexOf(key) !== -1;
  });

  return selected.length > 0 ? selected : available;
}

function normalizeRoutineKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

function deriveRoutineKey(anchorTag, linkTag) {
  const anchor = String(anchorTag || "").replace(/^#/, "").replace(/anchor$/, "");
  const link = String(linkTag || "").replace(/^#/, "").replace(/link$/, "");
  return normalizeRoutineKey(anchor || link || "routine");
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

function overlapsWithNonRoutineEvent(dayEvents, movingEvent, proposedStart, proposedEnd, routines) {
  return dayEvents.some(function (candidate) {
    if (candidate.getId() === movingEvent.getId()) {
      return false;
    }

    if (isRoutineEvent(candidate, routines)) {
      return false;
    }

    return rangesOverlap(
      proposedStart.getTime(),
      proposedEnd.getTime(),
      candidate.getStartTime().getTime(),
      candidate.getEndTime().getTime()
    );
  });
}

function isRoutineEvent(event, routines) {
  return routines.some(function (routine) {
    return eventHasTag(event, routine.anchorTag) || eventHasTag(event, routine.linkTag);
  });
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
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
