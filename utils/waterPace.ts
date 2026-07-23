// ─── waterPace ────────────────────────────────────────────────────────────────
// Single source of truth for the "expected water by now" pace, shared by the Home + Log water CARDS (the
// thin pace line under the main bar) and both water detail MODALS. Linear pace from the user's wake time to
// a 10 PM bedtime: expected = (elapsed / waking window) * goal. Before this, the two modals disagreed --
// Home used the real wake time, Log used a hardcoded 6 AM -- everything now runs through here so the card
// and its modal can never show different numbers.

export type WaterPaceTone = 'good' | 'warn' | 'bad' | 'neutral';
export type StyleMode = 'discipline' | 'balanced' | 'mindful';

// Parse a stored wake string like "6:30 AM" into today's wake time (ms). Falls back to 6:00 AM when there
// is no logged wake time yet.
export function wakeMsFromStored(wakeStr?: string | null): number {
  const d = new Date();
  const m = wakeStr?.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (m) {
    let h = parseInt(m[1]);
    const min = parseInt(m[2]);
    const ampm = m[3].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    d.setHours(h, min, 0, 0);
    return d.getTime();
  }
  d.setHours(6, 0, 0, 0);
  return d.getTime();
}

export interface WaterPace {
  expectedOz: number; // how much you'd have drunk by now to be exactly on pace
  pct: number;        // water / expected, capped at 1 (how close to on-pace you are)
  met: boolean;       // goal already reached
}

// isToday=false (viewing a past day) => there is no "expected now": expected is set to the full goal so a
// finished past day never reads as "behind".
export function computeWaterPace(water: number, waterGoal: number, wakeMs: number, isToday = true, now = Date.now()): WaterPace {
  const bedD = new Date(now);
  bedD.setHours(22, 0, 0, 0);
  const totalMinutes = Math.max(1, (bedD.getTime() - wakeMs) / 60000);
  const elapsedMinutes = Math.min(totalMinutes, Math.max(0, (now - wakeMs) / 60000));
  const expectedOz = isToday ? Math.round((elapsedMinutes / totalMinutes) * waterGoal) : waterGoal;
  const pct = expectedOz > 0 ? Math.min(1, water / expectedOz) : 1;
  return { expectedOz, pct, met: water >= waterGoal };
}

// Tone drives the colour. Mindful never gets a verdict colour -- it stays neutral grey (a gentle marker,
// never "you're failing").
export function paceTone(pace: WaterPace, mode: StyleMode): WaterPaceTone {
  if (mode === 'mindful') return 'neutral';
  if (pace.met || pace.pct >= 0.9) return 'good';
  if (pace.pct >= 0.7) return 'warn';
  return 'bad';
}

// Pin tone: like paceTone, but the on/ahead state stays NEUTRAL instead of green. A green pin blends into
// the blue water bar and clashes across accents, so the pace pin only takes a colour (amber/red) once the
// user is actually behind -- it's a quiet reference mark until it needs to nudge. Mindful is always neutral.
export function pacePinTone(pace: WaterPace, mode: StyleMode): WaterPaceTone {
  if (mode === 'mindful') return 'neutral';
  if (pace.met || pace.pct >= 0.9) return 'neutral';
  if (pace.pct >= 0.7) return 'warn';
  return 'bad';
}

// Map a tone to the caller's theme status colours (kept theme-agnostic in here).
export function paceToneColor(tone: WaterPaceTone, c: { good: string; warn: string; bad: string; neutral: string }): string {
  return tone === 'good' ? c.good : tone === 'warn' ? c.warn : tone === 'bad' ? c.bad : c.neutral;
}

// Status label shown in the water modal. Mindful reframes "behind" into a gentle invitation to drink.
export function paceLabel(pace: WaterPace, mode: StyleMode): string {
  if (mode === 'mindful') {
    if (pace.met) return 'Goal Reached';
    if (pace.pct >= 0.9) return 'Nicely Paced';
    if (pace.pct >= 0.7) return 'Room to Sip';
    return 'Time for a Sip';
  }
  if (pace.met) return 'Goal Met!';
  if (pace.pct >= 0.9) return 'On Track';
  if (pace.pct >= 0.7) return 'Behind';
  return 'Falling Behind';
}
