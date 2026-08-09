// functions/src/aiCostRollup.ts
//
// PLAN.md 0.2. `ai_cost` writes ONE DOCUMENT PER USER PER DAY and nothing ever deleted them. At 10,000
// users that is 3.65 million documents a year, growing forever, and it would quietly become the largest
// collection in the project.
//
// ⚠️ NOT A COST PROBLEM (Firestore storage is cheap). A TIDINESS problem that gets harder the longer it
// runs, which is exactly why PLAN says do it BEFORE launch: retrofitting cleanup onto a live collection
// full of real data is worse than shipping with one already in place. Right now there is almost nothing to
// clean up, which is the cheapest possible moment to be wrong.
//
// 🔴 ROLL UP, DO NOT JUST DELETE. The whole point of a meter is the long-run trend, so a daily older than
// the retention window is SUMMED into one document per user per MONTH and only then removed. Nothing is
// lost except day-level granularity on old data.
//
// 🔴 THE SAFETY PROPERTY, AND IT IS THE REASON THIS USES A TRANSACTION PER DOCUMENT.
// The increment and the delete happen ATOMICALLY. There is no window in which a daily has been added to
// the monthly total but still exists (which a re-run would double-count), and none in which it has been
// deleted without being counted (which would silently lose data). Either both happened or neither did.
// ⚠️ A batched write CANNOT give that. A batch would let the increments land and the deletes fail, and the
// next run would count the same days again -- inflating the only cost record the project has, invisibly.
// Per-document transactions are slower and this runs once a night against old data, so throughput is
// irrelevant and correctness is not.
//
// ⚠️ IT NEVER TOUCHES `ai_usage*`. Those hold the daily caps and the pitch budget and are load-bearing.
// This collection is metering only and is read by no product code, so the blast radius of a bug here is a
// wrong number in a report, never a lost cap or a granted entitlement.

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

/** Days of day-level detail to keep. Older than this gets rolled into the month and removed. */
const RETAIN_DAYS = 90;

/**
 * How many dailies to process per run. Deliberately bounded: a first run after a long gap should take
 * several nights rather than one enormous transaction storm. Nothing expires in the meantime.
 */
const MAX_PER_RUN = 300;

/**
 * Deep-sum `src` into `dst`. Numbers add, strings are kept (last one wins), nested objects recurse.
 * ⚠️ WRITTEN BY HAND RATHER THAN USING `FieldValue.increment` BECAUSE THIS RUNS INSIDE A TRANSACTION and
 * the monthly document is read first. Increment sentinels and transaction reads do not mix cleanly, and
 * doing the arithmetic here means the value written is one we have actually seen.
 * ⚠️ `model` is a string ('claude-haiku-4-5') and must survive rather than becoming NaN. That is why the
 * type check exists and why anything non-numeric is copied rather than added.
 */
function deepSum(dst: Record<string, unknown>, src: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(src)) {
    if (typeof v === 'number') {
      dst[k] = (typeof dst[k] === 'number' ? (dst[k] as number) : 0) + v;
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!dst[k] || typeof dst[k] !== 'object') dst[k] = {};
      deepSum(dst[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else if (v !== undefined && v !== null) {
      dst[k] = v;
    }
  }
}

/**
 * Nightly. Rolls `ai_cost` dailies older than RETAIN_DAYS into `ai_cost_monthly` and deletes them.
 *
 * ⚠️ 03:00 UTC on purpose: `todayKey()` in the meter uses the server UTC date, so this runs when the
 * fewest documents are mid-write, and it only ever touches dates far outside the retention window anyway.
 */
export const aiCostRollup = onSchedule(
  { schedule: '0 3 * * *', timeZone: 'UTC', region: 'us-central1' },
  async () => {
    const db = admin.firestore();
    const cutoff = new Date(Date.now() - RETAIN_DAYS * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    // ⚠️ `date` is stored as an ISO 'YYYY-MM-DD' STRING, so a lexicographic `<` is also a chronological
    // one. That is only true because the format is zero-padded and fixed-width; do not change the format.
    const stale = await db
      .collection('ai_cost')
      .where('date', '<', cutoff)
      .limit(MAX_PER_RUN)
      .get();

    if (stale.empty) {
      console.log('[aiCostRollup] nothing older than', cutoff);
      return;
    }

    let rolled = 0;
    let failed = 0;
    for (const snap of stale.docs) {
      try {
        await db.runTransaction(async (tx) => {
          // ⚠️ RE-READ INSIDE THE TRANSACTION. The document from the query above is a snapshot taken
          // before the transaction started; another write could have landed since. Reading it again here
          // is what makes the sum correct rather than merely plausible.
          const dailyRef = snap.ref;
          const daily = await tx.get(dailyRef);
          if (!daily.exists) return; // already handled by an overlapping run

          const d = daily.data() as Record<string, unknown>;
          const uid = typeof d.uid === 'string' ? d.uid : '';
          const date = typeof d.date === 'string' ? d.date : '';
          // 🔴 REFUSE TO DELETE ANYTHING WE CANNOT FILE. A malformed document is left exactly where it is:
          // losing a row is worse than keeping an untidy one, and this is the only record of what the AI
          // has cost. It will show up in the logs every night until somebody looks at it.
          if (!uid || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            console.warn('[aiCostRollup] skipping malformed doc', { id: daily.id });
            return;
          }

          const monthRef = db.collection('ai_cost_monthly').doc(`${uid}_${date.slice(0, 7)}`);
          const month = await tx.get(monthRef);
          const merged: Record<string, unknown> = month.exists
            ? (month.data() as Record<string, unknown>)
            : { uid, month: date.slice(0, 7), days: 0 };

          // Only the metric halves are summed. `uid`, `date` and `updatedAt` are per-day bookkeeping and
          // would be meaningless (or wrong) added together.
          if (d.totals) deepSum(merged, { totals: d.totals });
          if (d.byFeature) deepSum(merged, { byFeature: d.byFeature });
          merged.days = (typeof merged.days === 'number' ? merged.days : 0) + 1;
          merged.rolledUpAt = Date.now();

          tx.set(monthRef, merged);
          tx.delete(dailyRef);
        });
        rolled++;
      } catch (e) {
        // ⚠️ ONE FAILURE MUST NOT STOP THE RUN, and a failed transaction changed nothing, so the document
        // is simply picked up again tomorrow.
        failed++;
        console.error('[aiCostRollup] transaction failed', { id: snap.id, msg: (e as Error)?.message });
      }
    }

    console.log('[aiCostRollup] done', { cutoff, found: stale.size, rolled, failed });
  },
);
