// utils/ottoPrompts.ts
// Populates Otto's notification hub with the Rate Us fallback and Feedback nudge cards.
// See SPEC_rate_us_and_feedback.md. Call checkOttoPrompts() once per app boot (app/_layout.tsx,
// same spot as ensureRatePromptInitialized).
//
// The two cards are DELIBERATELY independent -- different storage, different cadence, different
// budget (or no budget at all for Feedback). Merging them into one card was tried in design and
// rejected: it would silence Feedback the moment Rate Us's budget ran out.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './storage';
import { addNotification, clearNotification } from './notifications';
import { canAskForRating, loadRatePromptState } from './ratingPrompt';

const RATE_US_NOTIF_ID = 'rate_us_fallback';
const FEEDBACK_NOTIF_ID = 'feedback_prompt';
const FEEDBACK_KEY = 'pj_feedback_prompt';
const FEEDBACK_REAPPEAR_DAYS = 21;
const FEEDBACK_HOLD_BACK_AFTER_RATE_ASK_DAYS = 5; // spacing rule: don't land in the same session

interface FeedbackPromptState {
  lastShownAt: string | null;
}

async function loadFeedbackState(): Promise<FeedbackPromptState> {
  try {
    const raw = await AsyncStorage.getItem(FEEDBACK_KEY);
    return raw ? JSON.parse(raw) : { lastShownAt: null };
  } catch {
    return { lastShownAt: null };
  }
}

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

export async function checkOttoPrompts(): Promise<void> {
  // Rate Us fallback: mirrors the shared budget exactly, not a separate quota. If we're currently
  // allowed to ask, Otto offers the same ask as an alternate entry point for users the trigger
  // list misses. If a real trigger already spent the allowance since the last check, clear any
  // stale card rather than leave a dead entry point sitting in the list.
  try {
    const check = await canAskForRating();
    if (check.allowed) {
      await addNotification({
        id: RATE_US_NOTIF_ID,
        lifecycle: 'replace',
        category: 'rate_us',
        title: 'Enjoying GoodForge?',
        body: 'If GoodForge has been helping you show up, a quick rating helps more people find us and keeps us building.',
        icon: 'star',
        iconColor: '#f5a623',
        route: { pathname: '/settings', params: { fireRating: 'true' } },
      });
    } else {
      await clearNotification(RATE_US_NOTIF_ID);
    }
  } catch {}

  // Feedback: fully independent, no cap, its own ~3-week re-appear cadence, held back a few days
  // if a Rate Us ask just fired so the two don't land in the same session.
  try {
    const fb = await loadFeedbackState();
    const rate = await loadRatePromptState();
    const recentlyAskedForRating = !!rate.lastAskedAt && daysSince(rate.lastAskedAt) < FEEDBACK_HOLD_BACK_AFTER_RATE_ASK_DAYS;
    const due = !fb.lastShownAt || daysSince(fb.lastShownAt) >= FEEDBACK_REAPPEAR_DAYS;
    if (due && !recentlyAskedForRating) {
      await addNotification({
        id: FEEDBACK_NOTIF_ID,
        lifecycle: 'replace',
        category: 'feedback_prompt',
        title: 'Got Feedback for Us?',
        body: "Bugs, ideas, something that could be better, what's working, we read every one and it shapes what we build next.",
        icon: 'chatbubble-ellipses',
        iconColor: '#3b82f6',
        route: { pathname: '/settings', params: { openFeedback: 'true' } },
      });
      await storageSet(FEEDBACK_KEY, JSON.stringify({ lastShownAt: new Date().toISOString() }));
    }
  } catch {}
}
