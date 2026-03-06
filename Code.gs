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
    const calendar = CalendarApp.getDefaultCalendar();
    const timeZone = Session.getScriptTimeZone();
    const startSearch = new Date();
    startSearch.setHours(0, 0, 0, 0);

    const endSearch = new Date(startSearch.getTime());
    endSearch.setDate(endSearch.getDate() + 7);

    const routines = [
      { anchorTag: "#amanchor", linkTag: "#amlink" },
      { anchorTag: "#commuteanchor", linkTag: "#commutelink" },
      { anchorTag: "#pmanchor", linkTag: "#pmlink" }
    ];

    const allEvents = calendar.getEvents(startSearch, endSearch);
    const eventsByDay = groupEventsByDay(allEvents, timeZone);

    routines.forEach(function (routine) {
      allEvents
        .filter(function (event) {
          return eventHasTag(event, routine.anchorTag);
        })
        .forEach(function (anchor) {
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
            const durationMs = event.getEndTime().getTime() - event.getStartTime().getTime();
            const newEnd = new Date(nextStartTime.getTime() + durationMs);

            if (event.getStartTime().getTime() !== nextStartTime.getTime()) {
              event.setTime(nextStartTime, newEnd);
            }
            nextStartTime = newEnd;
          });

          Logger.log("Synced " + dayKey + " for " + routine.anchorTag);
        });
    });
  } catch (error) {
    Logger.log("CalendarBlockManager failed: " + error);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function eventHasTag(event, tag) {
  const title = event.getTitle() || "";
  const description = event.getDescription() || "";
  const content = (title + " " + description).toLowerCase();
  return content.indexOf(tag.toLowerCase()) !== -1;
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
