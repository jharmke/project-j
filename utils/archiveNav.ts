// Tiny cross-screen signal. When VIEW FULL SUMMARY is tapped on the morning
// pop-up (home), it sets pending = true and navigates to the Stats tab. The
// Stats screen reads this on focus to open the Reports section, expand
// yesterday's week, and scroll to the Day Summaries archive, then clears it.
export const archiveNav = { pending: false };
