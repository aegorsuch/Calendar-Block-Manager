function syncRoutine() {
  const calendar = CalendarApp.getDefaultCalendar();
  const startSearch = new Date();
  startSearch.setHours(0,0,0,0); // Look from start of today
  
  const endSearch = new Date();
  endSearch.setDate(startSearch.getDate() + 7); // 7 days ahead

  const routines = [
    { anchorTag: '#morninganchor', linkTag: '#morninglink' },
    { anchorTag: '#commutehomeanchor', linkTag: '#commutehomelink' },
    { anchorTag: '#eveninganchor', linkTag: '#eveninglink' },
  ];

  const allEvents = calendar.getEvents(startSearch, endSearch);

  routines.forEach(routine => {
    // 1. Find all potential anchors for this routine across the week
    const anchors = allEvents.filter(e => {
      const content = (e.getTitle() + " " + e.getDescription()).toLowerCase();
      return content.includes(routine.anchorTag.toLowerCase());
    });

    anchors.forEach(anchor => {
      const anchorDate = anchor.getStartTime().toDateString();
      
      // 2. Get the followers that belong to THIS specific anchor's day
      let followers = allEvents.filter(f => {
        const content = (f.getTitle() + " " + f.getDescription()).toLowerCase();
        return content.includes(routine.linkTag.toLowerCase()) && 
               f.getStartTime().toDateString() === anchorDate &&
               f.getId() !== anchor.getId();
      });

      if (followers.length > 0) {
        // Set Anchor Color (10 = Basil/Dark Green)
        try {
          if (anchor.getColor() !== "10") anchor.setColor("10");
        } catch(e) { Logger.log("Could not color anchor"); }

        // Sort followers by their current start time to preserve your sequence
        followers.sort((a, b) => a.getStartTime() - b.getStartTime());
        
        let nextStartTime = anchor.getEndTime();

        followers.forEach(event => {
          const duration = event.getEndTime() - event.getStartTime();
          const newEnd = new Date(nextStartTime.getTime() + duration);
          
          // 3. Only move if the time is actually different to save API quota
          if (event.getStartTime().getTime() !== nextStartTime.getTime()) {
            event.setTime(nextStartTime, newEnd);
          }
          
          // Set Linked Color (2 = Sage/Pale Green)
          try {
            if (event.getColor() !== "2") event.setColor("2");
          } catch(e) { Logger.log("Could not color follower"); }
          
          nextStartTime = newEnd; 
        });
        
        Logger.log(`Synced ${anchorDate} for ${routine.anchorTag}`);
      }
    });
  });
}
