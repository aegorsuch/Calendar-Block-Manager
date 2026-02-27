/**
 * Flight Logistics Automator 
 * Status: Simplified Logic.
 * Features: Generic "Reserved Uber" titles + 24h Tasks for Booking.
 */

function FlightLogisticsAutomator() {
  var calendar = CalendarApp.getDefaultCalendar();
  var now = new Date();
  var searchPeriod = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));
  
  // --- PART 1: AUTO-CLEANUP ORPHANED CALENDAR EVENTS ---
  var allManaged = calendar.getEvents(now, searchPeriod, {search: '#flightmanaged'});
  allManaged.forEach(function(managedEvent) {
    try {
      if (managedEvent.getTitle().indexOf('#flightanchor') !== -1) return; 
      var startTime = managedEvent.getStartTime();
      var anchors = calendar.getEvents(
        new Date(startTime.getTime() - (6 * 60 * 60000)), 
        new Date(startTime.getTime() + (6 * 60 * 60000)), 
        {search: '#flightanchor'}
      );
      if (anchors.length === 0) { managedEvent.deleteEvent(); }
    } catch (e) { Logger.log("Cleanup skipped"); }
  });

  // --- PART 2: GENERATE/UPDATE LOGISTICS ---
  var flightAnchors = calendar.getEvents(now, searchPeriod, {search: '#flightanchor'});
  
  flightAnchors.forEach(function(flight) {
    var originalTitle = flight.getTitle();
    var cleanTitle = originalTitle.replace('#flightanchor', '').replace('Board ', '').split(' at ')[0].trim();
    var startTime = flight.getStartTime();
    var endTime = flight.getEndTime();
    var fullAddress = flight.getLocation() || "";
    var airportCode = cleanTitle.substring(0, 3).toUpperCase();

    // Sync Cleanup for this specific flight
    var syncStart = new Date(startTime.getTime() - (6 * 60 * 60000));
    var syncEnd = new Date(endTime.getTime() + (2 * 60 * 60000));
    var currentManaged = calendar.getEvents(syncStart, syncEnd, {search: "#flightmanaged"});
    currentManaged.forEach(function(e) {
      if (e.getTitle().indexOf('#flightanchor') === -1) { e.deleteEvent(); }
    });

    // TIMELINE CONFIGURATION (Generic Titles)
    var timeline = [
      { mins: 60,  dur: 60, name: "Board " + cleanTitle }, 
      { mins: 75,  dur: 15, name: "Walk to Gate" },                 
      { mins: 90,  dur: 15, name: "United Club" }, 
      { mins: 105,  dur: 15, name: "Walk to United Club" }, 
      { mins: 120, dur: 15, name: "Security at " + airportCode },    
      { mins: 150, dur: 30, name: "Reserved Uber to " + airportCode } 
    ];

    timeline.forEach(function(item) {
      var eventTime = new Date(startTime.getTime() - (item.mins * 60000));
      var newEvent = calendar.createEvent(item.name + " #flightmanaged", eventTime, new Date(eventTime.getTime() + (item.dur * 60000)));
      if (fullAddress) newEvent.setLocation(fullAddress);
    });

    // Destination Uber
    calendar.createEvent("Reserved Uber to  #flightmanaged", endTime, new Date(endTime.getTime() + (30 * 60000)));

    // --- PART 3: TASK GENERATION (The Reminders) ---
    if (flight.getDescription().indexOf("#flightmanaged") === -1) {
      var taskDate = new Date(startTime.getTime() - (24 * 60 * 60 * 1000));
      var taskTime = taskDate.toISOString();
      try {
        // Now adding the specific Uber booking task
        Tasks.Tasks.insert({title: "Reserve Uber to " + airportCode + " #flightmanaged", due: taskTime}, "@default");
        Tasks.Tasks.insert({title: "Check in for " + cleanTitle + " #flightmanaged", due: taskTime}, "@default");
        Tasks.Tasks.insert({title: "Pack for " + cleanTitle + " #flightmanaged", due: taskTime}, "@default");
        
        flight.setDescription(flight.getDescription() + "\n\n#flightmanaged");
      } catch (e) { Logger.log("Task failed: " + e.message); }
    }
  });
}
