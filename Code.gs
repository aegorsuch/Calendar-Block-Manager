/**
 * Calendar Block Manager
 * Status: Final stable version (Positioning only).
 * Logic: Slides "link" events to touch "anchor" events. No color changes.
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
    const anchors = allEvents.filter(e => {
      const content = (e.getTitle() + " " + e.getDescription()).toLowerCase();
      return content.includes(routine.anchorTag.toLowerCase());
    });

    anchors.forEach(anchor => {
      const anchorDate = anchor.getStartTime().toDateString();
      
      let followers = allEvents.filter(f => {
        const content = (f.getTitle() + " " + f.getDescription()).toLowerCase();
        return content.includes(routine.linkTag.toLowerCase()) && 
               f.getStartTime().toDateString() === anchorDate &&
               f.getId() !== anchor.getId();
      });

      if (followers.length > 0) {
        // Sort by start time to maintain the "Train" order
        followers.sort((a, b) => a.getStartTime() - b.getStartTime());
        
        let nextStartTime = anchor.getEndTime();

        followers.forEach(event => {
          const duration = event.getEndTime() - event.getStartTime();
          const newEnd = new Date(nextStartTime.getTime() + duration);
          
          // Only move if the time has actually changed to stay within quota
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
