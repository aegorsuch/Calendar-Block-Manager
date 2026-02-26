/**
 * Calendar Block Manager
 * Status: Final stable version (Shorthand tags).
 * Logic: Slides "link" events to touch the end of an "anchor" event.
 */
function calendarBlockManager() {
  const calendar = CalendarApp.getDefaultCalendar();
  const startSearch = new Date();
  startSearch.setHours(0,0,0,0); 
  
  const endSearch = new Date();
  endSearch.setDate(startSearch.getDate() + 7); 

  const routines = [ 
    { anchorTag: '#amanchor', linkTag: '#amlink' },
    { anchorTag: '#commuteanchor', linkTag: '#commutelink' },
    { anchorTag: '#pmanchor', linkTag: '#pmlink' },
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
        // Sort followers by their current start time to preserve sequence
        followers.sort((a, b) => a.getStartTime() - b.getStartTime());
        
        let nextStartTime = anchor.getEndTime();

        followers.forEach(event => {
          const duration = event.getEndTime() - event.getStartTime();
          const newEnd = new Date(nextStartTime.getTime() + duration);
          
          // 3. Only move if the time is actually different
          if (event.getStartTime().getTime() !== nextStartTime.getTime()) {
            event.setTime(nextStartTime, newEnd);
          }
          
          nextStartTime = newEnd; 
        });
        
        Logger.log(`Synced ${anchorDate} for ${routine.anchorTag}`);
      }
    });
  });
}
