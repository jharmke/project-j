// utils/companionDayRef.ts
//
// Turns a day reference in the user's own words ("yesterday", "Monday", "July 29") into a real date for
// Otto's Day Detail jump button.
//
// ⚠️ THE APP RESOLVES THE DATE, NOT OTTO. On the free plan he cannot see their data at all, so a guessed
// date sends someone to an empty day and the app looks broken. He is also demonstrably bad at it: asked on
// Saturday 1 August what he did yesterday, he answered "step back to Friday, August 1st" -- yesterday was
// Friday, July 31. The app always knows today for certain.
//
// ⚠️ A BARE WEEKDAY RESOLVES TO THE MOST RECENT ONE (Justin, 2026-08-01), including today if that is the
// weekday named. English is genuinely ambiguous here -- "last Tuesday" on a Wednesday means yesterday to
// some people and eight days ago to others -- so no rule is right for everyone. That is survivable ONLY
// because the button LABEL carries the real date ("Tue, Jul 29"): the user sees which day it will open
// before tapping, and Day Detail has a date picker one tap away. The date on the label is the safety net,
// not decoration.

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type DayRef = { date: string; label: string };

const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "Tue, Jul 29" -- weekday for readability, date so there is no ambiguity about WHICH Tuesday. */
const labelFor = (d: Date): string => `${DAY_ABBR[d.getDay()]}, ${MON_ABBR[d.getMonth()]} ${d.getDate()}`;

const make = (d: Date): DayRef => ({ date: iso(d), label: labelFor(d) });

/**
 * @param text   the user's message
 * @param today  a Date for "now" (injected so this is testable without mocking the clock)
 * @returns the resolved day, or null when it cannot be pinned down -- caller falls back to today.
 */
export function resolveDayRef(text: string, today: Date): DayRef | null {
  const t = (text || '').toLowerCase();
  const shift = (days: number) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    d.setDate(d.getDate() - days);
    return d;
  };

  // ⚠️ ORDER MATTERS: "day before yesterday" contains "yesterday", so it must be tested FIRST or it
  // resolves to the wrong day. Caught by the test suite, not by reading.
  if (/\bday before yesterday\b/.test(t)) return make(shift(2));
  if (/\b(yesterday|last night|yday)\b/.test(t)) return make(shift(1));
  if (/\b(today|tonight|this morning|this afternoon|this evening)\b/.test(t)) return make(shift(0));

  // "3 days ago", "two days ago"
  const WORD_NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
  const ago = t.match(/\b(\d{1,2}|one|two|three|four|five|six|seven)\s+days?\s+ago\b/);
  if (ago) {
    const n = /^\d+$/.test(ago[1]) ? parseInt(ago[1], 10) : WORD_NUM[ago[1]];
    if (n >= 1 && n <= 60) return make(shift(n));
  }

  // An explicit calendar date: "July 29", "jul 29th", "29 July".
  // ⚠️ The ordinal suffix is not optional cosmetics: a trailing \b after the digits FAILS on "jul 29th",
  // because 9 -> t is not a word boundary. People write "29th" constantly. Test caught it.
  const md = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/)
    || t.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/);
  if (md) {
    const monthTok = MONTHS.indexOf(/^\d+$/.test(md[1]) ? md[2].slice(0, 3) : md[1].slice(0, 3));
    const dayTok = parseInt(/^\d+$/.test(md[1]) ? md[1] : md[2], 10);
    if (monthTok >= 0 && dayTok >= 1 && dayTok <= 31) {
      let d = new Date(today.getFullYear(), monthTok, dayTok);
      // A date later than today means they meant last year, not a day that has not happened.
      if (d.getTime() > today.getTime()) d = new Date(today.getFullYear() - 1, monthTok, dayTok);
      return make(d);
    }
  }

  // A weekday name -> the MOST RECENT one, today included.
  for (let i = 0; i < WEEKDAYS.length; i++) {
    if (new RegExp(`\\b${WEEKDAYS[i]}\\b`).test(t)) {
      const diff = (today.getDay() - i + 7) % 7;
      return make(shift(diff));
    }
  }

  return null;
}
