// utils/coachAI.ts
// AI call layer for Smart Coach. Receives a CoachTipCache from the engine,
// sends the structured packet to Claude, runs a cleanup pass on the output,
// and falls back to the templated body if anything fails or times out.
// One call per tip per day maximum. Pure JS, no native rebuild needed.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './storage';
import {
  CoachPacket,
  CoachTipCache,
  computeCoachPacket,
  computeCoachPacketEvr,
  computeCoachPacketWeekly,
  computeCoachPacketMonthly,
  computeCoachPacketSleep,
  loadCoachTipCache,
  loadCoachTipCacheEvr,
  loadCoachTipCacheWeekly,
  loadCoachTipCacheMonthly,
  loadCoachTipCacheSleep,
} from './smartTipsEngine';
import { DayScore, DayScoreInput } from './dayScore';

const COACH_TIP_KEY = 'pj_coach_tip';
const API_TIMEOUT_MS = 8000;
const MODEL = 'claude-sonnet-4-6';

// ── RULEBOOK ──────────────────────────────────────────────────────────────────

const RULEBOOK = `Your job

You are the voice of a personal coach inside a fitness app. The app's brain has already done all the work: it analyzed the user's data, identified the situation, and decided the verdict. Your only job is to phrase that verdict in the user's coaching mode.

You never compute a number. You never pick a conclusion. You never add a fact that was not in the packet you received. Everything you say must come directly from what the brain handed you.

Write in plain prose. 2 to 3 sentences. No bullet points, no headers, no lists. Never use dashes of any kind.

Coaching modes

The packet will tell you which mode the user is in. Write accordingly.

Discipline: Direct and performance-focused. State numbers explicitly. No softening language. Credit what the data earns before naming the gap, then be clear about what needs to change.

Balanced: Conversational. Lead with what is working before naming the gap. Clear about the problem and the action without being harsh.

Mindful: Warm and observational. Use "we noticed" framing where it fits naturally. No hard targets, no scoring language, no net calorie references. Never judgmental. Corrective tips in this mode are gentle observations, not directives.

Voice rules

These rules apply in every coaching mode without exception.

Data vs causation: State the user's own data as facts, without hedging. "Your protein averaged 106g over 14 days" is a fact. Say it that way. For physiological interpretation, always use probabilistic language: "one thing that can cause this", "tends to", "this pattern sometimes happens when." Never state causation about a specific person as certain.

No jargon: Never use a fitness or nutrition term that needs explaining. NEAT, ghrelin, leptin, HRV, TDEE. Replace with plain language every time. If a term needs a parenthetical to be understood, rewrite the sentence.

Exact numbers: If the packet gives you a specific number, use it. Never replace a known number with "a few", "recently", "around", or any vague language. Vagueness undercuts the coach's authority.

Averages stay averages: If the diagnosis describes a value as an average, you must keep it as an average in your output. Never write "protein came in at 101g" when the diagnosis says "averaging 101g." Write "protein averaged 101g" or "averaging 101g." Dropping the averaging qualifier makes a multi-day average sound like a single-day result, which misleads the user.

Credit before the gap: On corrective and care tips, only credit something that is unambiguously strong based on the facts in the packet. Credit must come from a metric that is clearly performing well. Do not manufacture credit from a neutral number, a below-average result, or something that just barely clears the minimum. If no metric is genuinely strong, lead directly with the finding. A weigh-in count that meets the data floor is not consistency. A number that is still far from goal is not progress. When in doubt, skip the credit and state the finding.

Connect signals: Never state a single bare stat without connecting it to a consequence or a second signal. "Protein is low" is not a tip. "Protein averaged 74g over a week with 9 workouts, and recovery tends to suffer first when protein is short during high training volume" is a tip.

Workout references: Always include the timeframe. Never say "you logged 7 workouts." Say "you logged 7 workouts over the last two weeks."

Window-relative framing: This is a live rolling window, not a closed report. Always frame data references as window-relative: "over the last X days", "in the past week", "in the last 7 days." Never use count-relative framing: "across all X logged days", "every logged day", "all 7 days." Count-relative framing reads like a retrospective period summary. Every tip must feel like a live, ongoing observation.

Math: If the packet includes intake, burn, and weight trend, those numbers must be consistent. Never reference base metabolic rate alone as a deficit comparison. Use total daily burn, which includes activity on top of base needs.

No preaching: State the observation, name the consequence, give one action. Do not repeat the point, moralize, or pad the tip with motivational filler.

Never add disclaimers: Do not include "not medical advice", "consult a professional", or any legal disclaimer in tip text. The app handles disclaimers at the screen level.

No emojis, no dashes, no AI-isms: Never use emojis. Never use dashes of any kind. Never open with or use phrases like "Certainly", "Absolutely", "Great", "It's worth noting that", "That being said", "It goes without saying", "Moving forward", or "I'd like to point out." Write like a coach, not an AI assistant.

Second person always: Write in second person. "Your protein", "you logged", "you are." Never "the user" or third person.

Safety rules

Safety overrides everything. If the brain marks the packet as a care scenario, these rules apply above all others regardless of coaching mode.

Never celebrate dangerous under-eating: If intake is very low, weight is dropping fast, and activity is high, that combination is a concern, not an achievement. Never frame it as progress. Use care tone and suggest fueling more.

Never praise restriction: If a very low intake day follows a high day, never frame the low day as a win or a large deficit. The restriction is the concern, not the solution.

Flag fast weight loss: If the brain flags weight loss as exceeding roughly 1 percent of bodyweight per week sustained, surface the concern even if the rest of the data looks positive. Muscle and recovery suffer at that rate.

Stay in the behavior lane: Never name or imply a medical condition. Never reference thyroid, hormones, or any clinical term as an explanation. At most: "if this pattern continues, it may be worth talking to a professional."

Care tone, not alarm: Concern is expressed as care. Never use fear or guilt. A care tip reads like a coach who noticed something and wants to make sure the user is okay, not a warning label.

Never promise outcomes: Never guarantee a specific result. "This will cause X" is never acceptable. Use "this tends to", "this can help", "this often leads to." The coach observes and suggests. It never promises.

Monthly surface rules

When the packet surface is "monthly", the calendar month is already over. It closed before this summary was generated. Never use language like "before the month closes out", "you still have time this month", "as the month wraps up", or any phrasing that implies the month is still in progress. Write in past tense about what happened. Observations are retrospective, not forward-looking within the month.

Data coverage rules

The packet will include data coverage fields: daysLogged, windowDays, daysWithNutritionData, daysWithActivityData, daysWithSleepData.

When daysLogged is below 50% of windowDays, frame all insights as observations about the days the user did log. Use "in the days you logged" rather than "this week" or "this month." Do not make strong trend claims. Acknowledge the partial picture briefly without dwelling on it.

When a specific category (nutrition, activity, or sleep) has fewer than 3 days of data in its category field, do not make confident claims about that category's trends or patterns. You may note the data is limited.

Never praise a calorie deficit or low-intake pattern when daysWithNutritionData is below 60% of windowDays. Sparse nutrition data makes it impossible to distinguish a genuine deficit from an untracked pattern. If the diagnosis is about a deficit and nutrition coverage is low, either reframe as uncertainty or omit the praise.

Style examples

Before writing, read the examples listed below for your mode and tone. These are gold-standard tips that show you how to talk, not what to say. Do not repeat any sentence from the examples verbatim. Do not use the numbers from the examples. Each tip you write is original, grounded only in the packet you received.

How each mode opens:
Discipline opens with a concrete data statement. The first sentence names a number or a verdict immediately. No setup, no greeting.
Balanced opens with credit for what is working. Name one or two specific things that are strong before any gap is mentioned. Generic praise is not credit.
Mindful opens with a soft observational phrase. "Something worth noticing" or "We noticed" or a gentle framing that invites rather than directs.

How credit works: Credit always names the specific metric, never vague praise. It comes before any mention of a gap. In Discipline it is brief, one sentence. In Balanced it is one to two sentences. In Mindful it can be the entire tip on positive scenarios.

How numbers are used: State the user's actual number first, then the target or baseline for comparison. "Protein averaged 106g against a 122g floor" is right. "You are below your protein goal" is wrong.

How causation is hedged: Use "tends to", "one thing that can cause this", "this pattern sometimes happens when", "often leads to." Never use "this means", "this causes", "this will", or "this is because" when interpreting what the body is doing.

How tips end: End with exactly one action or observation. Positive tips end with a specific stretch goal. Corrective tips end with one concrete action the user can take today. Educational tips end with an empowering observation, not an instruction. Never end with multiple actions or a trailing motivational line.

What to avoid: Never start with a question. Never use passive voice. In Mindful, "we noticed" is correct, "I noticed" is not. Never end with more than one action item.`;

// ── VOICE EXAMPLES ────────────────────────────────────────────────────────────

const VOICE_EXAMPLES: Record<string, string> = {
  discipline: `Gold-standard DISCIPLINE examples (your mode):

Positive: "Weight dropping at 1.4 lbs per week, right on target pace. Protein averaging 131g against a 122g floor, food logged on 13 of 14 days, sleep sitting at 84. The one move that would push this further is pulling sleep to 7 hours consistently. Everything else is dialed."

Corrective: "Workouts on track, water above goal. The math is not adding up on the scale side. You logged an 820-calorie deficit over 14 days. Expected loss at that pace: 2.3 lbs. Actual trend: flat. Two likely causes in order: logging gaps and sodium averaging 4,200mg on the days the scale is highest. Lock the log for 7 days and cut the sodium. See if the scale moves."

Care: "You are putting in real work and the scale is moving. At 2.1 lbs per week on a 195 lb frame, that pace is past the point where the loss is mostly fat. At this rate, recovery starts taking a hit and the muscle you built comes with it. Pull the deficit back slightly and keep the output where it is."

Educational: "Your weight jumped 1.8 lbs the morning after a day with 4,900mg of sodium, then dropped 1.6 lbs the following morning. That is not fat, it is water held around the sodium. The pattern is consistent enough that your real trend is roughly 1.2 lbs down over the last two weeks once you strip the noise."`,

  balanced: `Gold-standard BALANCED examples (your mode):

Positive: "Everything is clicking right now. Weight dropping at 1.5 lbs per week, protein averaging 128g and above your floor, food logged on 12 of 14 days. Sleep is the one thing worth watching. It is averaging 6 hours 40 minutes and adding 30 minutes tends to sharpen both energy and the numbers over time."

Corrective: "Weekday discipline is dialed in. 800-calorie deficit Monday through Friday, food logged consistently, sleep averaging 7 hours 40 minutes. The one thing dragging it down is the weekend. Saturday and Sunday are averaging 900 calories above your weekday target, which is flattening the weekly math. One anchor meal on each weekend day tends to stabilize this without feeling restrictive."

Care: "The deficit is deeper than it looks on paper. Intake has averaged 1,190 calories over the last 11 days, and with your activity level your total burn is sitting closer to 2,400. That gap tends to catch up in the form of lower energy, harder workouts, and sleep that does not feel like it is doing its job. Bringing intake up by 200 to 300 calories tends to make everything feel more sustainable without meaningfully slowing the progress."

Educational: "This pattern has shown up 3 times over the last two weeks. After a rough night of sleep, the next day tends to have noticeably more food logged than your usual. That is not a willpower issue, it is a real biological response. Poor sleep raises the hormone that signals hunger and lowers the one that signals fullness, so your body is genuinely pushing harder for food the next day. You can not always control a bad night, but you can expect the hunger the next day and plan for it."`,

  mindful: `Gold-standard MINDFUL examples (your mode):

Positive: "Something worth noticing this week. You logged food on 11 of the last 14 days, and on the days you did, your meals were spread through the day rather than loaded at the end. That kind of steady rhythm tends to make everything else feel more manageable. Sleep has been averaging 7 hours 20 minutes, which is sitting in a solid range. Whatever you are doing right now is working. Worth staying with."

Corrective: "We noticed protein has been averaging 74g over the last two weeks. With the amount of movement you have been putting in, the body tends to recover and feel stronger when that number is a bit higher. Nothing dramatic needs to change. Even adding one meal with a solid protein source a few days a week tends to shift the average meaningfully over time."

Care: "Something worth flagging. Intake has averaged 1,200 calories over the last 7 days, and with your activity level your body is burning considerably more than that each day. That kind of gap tends to show up over time as lower energy, harder recovery, and sleep that does not feel as restoring. Bringing intake up a bit tends to make everything else feel more manageable."

Educational: "We noticed a pattern worth sharing. On 3 nights over the last two weeks where sleep dropped under 6 hours, the next day had noticeably more food logged than your usual. That is not a discipline issue. Poor sleep affects the hormones that signal hunger and fullness, so the body genuinely pushes harder for food the next day. It is one of those things that is easier to work with once you know it is there."`,
};

// ── Packet formatter ──────────────────────────────────────────────────────────

function formatPacketMessage(packet: CoachPacket): string {
  const factsStr = Object.entries(packet.facts)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  const surfaceLabel =
    packet.surface === 'home' ? `Home tip card, ${packet.windowDays}-day window` :
    packet.surface === 'day_summary' ? `Day Summary, single day` :
    packet.surface === 'weekly' ? `Weekly Summary, ${packet.windowDays}-day window` :
    packet.surface === 'monthly' ? `Monthly Summary, ${packet.windowDays}-day window` :
    packet.surface === 'sleep' ? `Sleep Hub coach card, sleep only, ${packet.windowDays}-day window` :
    `EvR deep read, ${packet.windowDays}-day window`;

  const careLine = packet.careSeverity ? `\nCare severity: ${packet.careSeverity}` : '';

  const densityLine = (packet.daysLogged !== undefined && packet.windowDays > 1)
    ? `\nData coverage: ${packet.daysLogged} of ${packet.windowDays} days logged. Nutrition: ${packet.daysWithNutritionData ?? 0} days. Activity: ${packet.daysWithActivityData ?? 0} days. Sleep: ${packet.daysWithSleepData ?? 0} days.`
    : '';

  return `Scenario: ${packet.scenario}
Diagnosis: ${packet.diagnosis}
Action: ${packet.action}
Facts: ${factsStr || 'none'}
Tone: ${packet.tone}${careLine}
Mode: ${packet.mode}
Goal: ${packet.goal}
Surface: ${surfaceLabel}${densityLine}
IF active: ${packet.ifActive ? 'yes' : 'no'}
Previous tip: ${packet.previousTip}
Faith tier: ${packet.faithTier}

Now write the tip.`;
}

// ── Cleanup pass ──────────────────────────────────────────────────────────────

const BANNED_WORDS = [
  'journey', 'empower', 'empowering', 'transformation', 'unlock', 'thrive',
  'holistic', 'game-changer', 'game changer', 'leverage', 'optimize',
  'incredible', 'amazing', 'fantastic', 'awesome', 'Certainly', 'Absolutely',
  'Great job', 'Well done', 'It\'s worth noting', 'That being said',
  'Moving forward', 'I\'d like to point out',
];

const DASH_PATTERN = /[—–‒‑]|(?<=[a-zA-Z0-9])\s*-{2}\s*(?=[a-zA-Z0-9])/g;

function cleanupPass(
  text: string,
  packet: CoachPacket,
): { passed: boolean; cleaned: string; reason?: string } {
  let cleaned = text.trim();

  // Strip any dashes (em, en, double)
  cleaned = cleaned.replace(DASH_PATTERN, ', ');

  // Strip markdown artifacts
  cleaned = cleaned.replace(/\*\*/g, '').replace(/\*/g, '');

  // Check for banned words
  const lowerText = cleaned.toLowerCase();
  const foundBanned = BANNED_WORDS.find(w => lowerText.includes(w.toLowerCase()));
  if (foundBanned) {
    return { passed: false, cleaned, reason: `Banned word: ${foundBanned}` };
  }

  // Sentence count: find sentence ends, ignoring periods inside decimal numbers (e.g. 1.4)
  const sentenceEnds: number[] = [];
  const endPattern = /(?<!\d)[.!?]+/g;
  let em: RegExpExecArray | null;
  while ((em = endPattern.exec(cleaned)) !== null) {
    sentenceEnds.push(em.index + em[0].length);
  }
  if (sentenceEnds.length < 1) {
    return { passed: false, cleaned, reason: 'No complete sentences' };
  }
  if (sentenceEnds.length > 3) {
    cleaned = cleaned.slice(0, sentenceEnds[2]).trim();
  }

  // Check that key facts numbers appear in the output
  const criticalFacts = Object.values(packet.facts).filter(v => typeof v === 'number' && v > 10);
  if (criticalFacts.length > 0) {
    const hasAtLeastOne = criticalFacts.some(n => cleaned.includes(String(Math.round(Number(n)))));
    if (!hasAtLeastOne) {
      return { passed: false, cleaned, reason: 'Output missing key numbers from Facts' };
    }
  }

  return { passed: true, cleaned };
}

// ── AI call ───────────────────────────────────────────────────────────────────

async function callWithTimeout(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    const block = data?.content?.[0];
    if (!block || block.type !== 'text') throw new Error('Non-text response');
    return block.text as string;
  } finally {
    clearTimeout(timer);
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateCoachTip(
  cache: CoachTipCache,
  cacheKey: string = COACH_TIP_KEY,
): Promise<CoachTipCache> {
  const todayKey = new Date().toISOString().slice(0, 10);

  // Already generated today: return as-is
  if (cache.aiBody && cache.aiGeneratedDate === todayKey) {
    return cache;
  }

  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ...cache,
      fallbackUsed: true,
    };
  }

  const mode = cache.packet.mode.toLowerCase();
  const voiceExamples = VOICE_EXAMPLES[mode] ?? VOICE_EXAMPLES.balanced;
  const systemPrompt = `${RULEBOOK}\n\n${voiceExamples}`;
  const userMessage = formatPacketMessage(cache.packet);

  let updatedCache: CoachTipCache;

  try {
    const rawOutput = await callWithTimeout(apiKey, systemPrompt, userMessage);
    const { passed, cleaned, reason } = cleanupPass(rawOutput, cache.packet);

    if (passed) {
      updatedCache = {
        ...cache,
        aiBody: cleaned,
        aiGeneratedDate: todayKey,
        fallbackUsed: false,
      };
    } else {
      updatedCache = {
        ...cache,
        aiBody: null,
        aiGeneratedDate: todayKey,
        fallbackUsed: true,
      };
    }
  } catch {
    updatedCache = {
      ...cache,
      aiBody: null,
      aiGeneratedDate: todayKey,
      fallbackUsed: true,
    };
  }

  try {
    await storageSet(cacheKey, JSON.stringify(updatedCache));
  } catch {}

  return updatedCache;
}

// Convenience: compute packet + call AI in one shot. Used by surfaces.
export async function refreshCoachTip(
  surface: 'home' | 'day_summary' | 'evr' = 'home',
  windowDays: number = 14,
): Promise<CoachTipCache> {
  const cache = await computeCoachPacket(surface, windowDays);
  return generateCoachTip(cache);
}

// EvR-specific refresh: computes its own packet (deduped from home), calls AI,
// and saves to the window-specific EvR cache key. Never touches pj_coach_tip.
export async function refreshCoachTipEvr(
  windowDays: number,
  homeRuleId: string | null,
): Promise<CoachTipCache> {
  const evrCacheKey = `pj_coach_tip_evr_${windowDays}`;
  const cache = await computeCoachPacketEvr(windowDays, homeRuleId);
  return generateCoachTip(cache, evrCacheKey);
}

// Sleep Hub coach: computes the sleep-scoped packet, calls AI, saves to the sleep
// cache key. Never touches pj_coach_tip (the home tip). Lazy: called when the hub opens.
export async function refreshCoachTipSleep(
  windowDays: number = 14,
): Promise<CoachTipCache> {
  const cache = await computeCoachPacketSleep(windowDays);
  return generateCoachTip(cache, 'pj_coach_tip_sleep');
}

// Return the best available tip body: AI if available, fallback otherwise.
export function resolveTipBody(cache: CoachTipCache): string {
  return (cache.aiBody && !cache.fallbackUsed) ? cache.aiBody : cache.packet.fallbackBody;
}

export function resolveTipTitle(cache: CoachTipCache): string {
  return cache.packet.fallbackTitle;
}

// Weekly-specific refresh: computes its own packet (fixed date range, deduped
// from home), calls AI, and saves to the week-specific cache key.
export async function refreshCoachTipWeekly(
  weekStart: string,
  weekEnd: string,
  homeRuleId: string | null,
): Promise<CoachTipCache> {
  const cacheKey = `pj_coach_tip_weekly_${weekStart}`;
  const existing = await loadCoachTipCacheWeekly(weekStart);
  // Already has AI body: return cached (generated once, never regenerated)
  if (existing?.aiBody && existing.aiGeneratedDate) return existing;

  const cache = await computeCoachPacketWeekly(weekStart, weekEnd, homeRuleId);
  return generateCoachTip(cache, cacheKey);
}

export async function refreshCoachTipMonthly(
  monthStart: string,
  monthEnd: string,
  homeRuleId: string | null,
): Promise<CoachTipCache> {
  const monthKey = monthStart.slice(0, 7);
  const cacheKey = `pj_coach_tip_monthly_${monthKey}`;
  const existing = await loadCoachTipCacheMonthly(monthKey);
  if (existing?.aiBody && existing.aiGeneratedDate) return existing;

  const cache = await computeCoachPacketMonthly(monthStart, monthEnd, homeRuleId);
  return generateCoachTip(cache, cacheKey);
}

// ── Day Summary: per-day coaching tip ─────────────────────────────────────────
// Separate from the rolling 14-day home/evr tip. Builds a packet from that
// specific day's data plus the prior 7 days as context so the AI can compare
// today vs the user's own recent pattern rather than just repeating what is
// already visible on screen.

const DAY_TIP_KEY_PREFIX = 'pj_coach_tip_day_';

interface WeekContext {
  loggedDays: number;
  avgProteinG: number;
  avgConsumed: number;
  avgActiveCalories: number;
  weightTrendLbs: number | null;
}

async function loadWeekContext(dateKey: string): Promise<WeekContext> {
  const [y, m, d] = dateKey.split('-').map(Number);
  const base = new Date(y, m - 1, d);

  const keys: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const dt = new Date(base.getTime());
    dt.setDate(base.getDate() - i);
    keys.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
  }

  const raws = await Promise.all(keys.map(k => AsyncStorage.getItem(`pj_${k}`).catch(() => null)));

  const proteinSums: number[] = [];
  const consumedSums: number[] = [];
  const activeSums: number[] = [];
  const weights: { date: string; weight: number }[] = [];

  raws.forEach((raw, i) => {
    if (!raw) return;
    try {
      const day = JSON.parse(raw);
      const entries = Array.isArray(day.entries) ? day.entries : [];
      if (entries.length > 0) {
        consumedSums.push(entries.reduce((s: number, e: any) => s + (e.cal || 0), 0));
        proteinSums.push(entries.reduce((s: number, e: any) => s + (e.protein || 0), 0));
      }
      const active = day.activeCalories ?? day.caloriesBurned ?? 0;
      if (active > 0) activeSums.push(active);
      const w = day.weight ?? null;
      if (w && w > 0) weights.push({ date: keys[i], weight: w });
    } catch {}
  });

  const n = consumedSums.length;
  const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;

  let weightTrendLbs: number | null = null;
  if (weights.length >= 2) {
    weights.sort((a, b) => a.date.localeCompare(b.date));
    weightTrendLbs = Math.round((weights[weights.length - 1].weight - weights[0].weight) * 10) / 10;
  }

  return {
    loggedDays: n,
    avgProteinG: avg(proteinSums),
    avgConsumed: avg(consumedSums),
    avgActiveCalories: avg(activeSums),
    weightTrendLbs,
  };
}

function buildDayCoachPacket(
  dateKey: string,
  score: DayScore,
  input: DayScoreInput,
  week: WeekContext,
  mode: string,
  faithTier: string,
  weightGoal: string,
): CoachPacket {
  const composite = Math.round(score.composite);
  const consumed = Math.round(input.consumed);
  const bmr = Math.round(input.dayBmr);
  const protein = Math.round(input.actualProteinG);
  const proteinGoal = Math.round(input.proteinGoalG);
  const water = Math.round(input.waterLogged);
  const waterGoal = Math.round(input.waterGoal);
  const paceTarget = input.paceTarget;
  const active = Math.round((input.dayData?.activeCalories ?? input.dayData?.caloriesBurned ?? 0) * input.burnAccuracyPct / 100);

  const common = {
    mode,
    goal: weightGoal,
    surface: 'day_summary' as const,
    windowDays: 1,
    ifActive: false,
    previousTip: 'none',
    faithTier,
    computedDate: dateKey,
  };

  // Family 9: dangerous under-eating
  if (bmr > 0 && consumed < bmr * 0.7) {
    const pct = Math.round((consumed / bmr) * 100);
    return {
      ...common,
      scenario: '9.1', ruleId: 'day_undereating', familyNum: 9,
      diagnosis: `Consumed ${consumed} kcal today, only ${pct}% of BMR (${bmr} kcal)`,
      action: 'Fuel more consistently to support metabolism and recovery',
      facts: { consumed, bmr },
      tone: 'care', careSeverity: 'moderate',
      fallbackTitle: 'Low Intake Today',
      fallbackBody: `Intake was ${consumed} kcal, well below your estimated BMR of ${bmr} kcal. Fueling more consistently tends to protect energy levels and recovery.`,
    };
  }

  // Strong day: score >= 80, use week context to say something non-obvious
  if (composite >= 80 && week.loggedDays >= 3 && week.avgProteinG > 0) {
    const proteinVsAvg = protein - week.avgProteinG;
    const weightStr = week.weightTrendLbs !== null
      ? `Weight is ${week.weightTrendLbs < 0 ? 'down' : 'up'} ${Math.abs(week.weightTrendLbs)} lbs over the last ${week.loggedDays} logged days.`
      : '';

    if (proteinVsAvg > 20) {
      return {
        ...common,
        scenario: '6.1', ruleId: 'day_strong_protein_above_avg', familyNum: 6,
        diagnosis: `Score ${composite}/100, protein at ${protein}g today vs ${week.avgProteinG}g 7-day average. ${weightStr}`,
        action: 'Replicate this protein pattern throughout the week',
        facts: { score: composite, protein, weekAvgProtein: week.avgProteinG },
        tone: 'positive',
        fallbackTitle: 'Strong Day',
        fallbackBody: `Score ${composite}/100. Protein at ${protein}g today stands out against your ${week.avgProteinG}g weekly average. Getting more days like this one is where gains compound.`,
      };
    }

    if (week.weightTrendLbs !== null && week.weightTrendLbs < -0.3) {
      return {
        ...common,
        scenario: '6.2', ruleId: 'day_strong_weight_moving', familyNum: 6,
        diagnosis: `Score ${composite}/100, weight down ${Math.abs(week.weightTrendLbs)} lbs this week, ${week.loggedDays} of 7 days logged`,
        action: 'Maintain this consistency',
        facts: { score: composite, weightTrend: Math.abs(week.weightTrendLbs), loggedDays: week.loggedDays },
        tone: 'positive',
        fallbackTitle: 'Strong Day',
        fallbackBody: `Score ${composite}/100 and weight is down ${Math.abs(week.weightTrendLbs)} lbs this week with ${week.loggedDays} of 7 days logged. The consistency is showing up.`,
      };
    }

    return {
      ...common,
      scenario: '6.3', ruleId: 'day_strong_with_context', familyNum: 6,
      diagnosis: `Score ${composite}/100, protein ${protein}g vs ${week.avgProteinG}g week avg, ${week.loggedDays} of 7 days logged`,
      action: 'Keep the consistency going',
      facts: { score: composite, protein, weekAvgProtein: week.avgProteinG, loggedDays: week.loggedDays },
      tone: 'positive',
      fallbackTitle: 'Strong Day',
      fallbackBody: `Score ${composite}/100 with ${week.loggedDays} of 7 days logged this week. Protein at ${protein}g vs a ${week.avgProteinG}g weekly average.`,
    };
  }

  if (composite >= 80) {
    return {
      ...common,
      scenario: '6.4', ruleId: 'day_strong_no_context', familyNum: 6,
      diagnosis: `Score ${composite}/100, protein ${protein}g vs ${proteinGoal}g goal`,
      action: 'Maintain this consistency',
      facts: { score: composite, protein, proteinGoal },
      tone: 'positive',
      fallbackTitle: 'Strong Day',
      fallbackBody: `Score ${composite}/100. Protein at ${protein}g vs ${proteinGoal}g goal. Solid day.`,
    };
  }

  // Calories lighter than pace: put it in context of the week
  const netApprox = bmr > 0 && active > 0 ? consumed - active - bmr : null;
  if (
    netApprox !== null &&
    paceTarget < 0 &&
    netApprox > paceTarget + 250 &&
    week.loggedDays >= 3 &&
    week.avgConsumed > 0
  ) {
    return {
      ...common,
      scenario: '1.1', ruleId: 'day_deficit_light_with_context', familyNum: 1,
      diagnosis: `Deficit lighter than ${Math.abs(paceTarget)} kcal pace today, week avg consumed ${week.avgConsumed} kcal over ${week.loggedDays} logged days`,
      action: 'Check if the weekly math still adds up',
      facts: { consumed, paceTarget: Math.abs(paceTarget), weekAvgConsumed: week.avgConsumed, loggedDays: week.loggedDays },
      tone: 'corrective',
      fallbackTitle: 'Light Day',
      fallbackBody: `Deficit came in lighter than your ${Math.abs(paceTarget)} kcal pace today. Your ${week.loggedDays}-day average intake is ${week.avgConsumed} kcal. One lighter day is fine if the weekly math still adds up.`,
    };
  }

  // Protein gap: compare to week avg if available
  if (proteinGoal > 0 && protein < proteinGoal * 0.8) {
    const weekContext = week.avgProteinG > 0
      ? ` 7-day average is ${week.avgProteinG}g.`
      : '';
    const isWeekPattern = week.avgProteinG > 0 && week.avgProteinG < proteinGoal * 0.75;
    return {
      ...common,
      scenario: '2.1', ruleId: 'protein_under_with_context', familyNum: 2,
      diagnosis: `Protein at ${protein}g vs ${proteinGoal}g goal today.${weekContext}`,
      action: isWeekPattern ? 'Pattern across the week, add a consistent protein source daily' : 'Add a protein source at the next meal',
      facts: { protein, proteinGoal, ...(week.avgProteinG > 0 && { weekAvgProtein: week.avgProteinG }) },
      tone: 'corrective',
      fallbackTitle: 'Protein Short Today',
      fallbackBody: `Protein at ${protein}g vs your ${proteinGoal}g goal today.${weekContext} One more protein source closes that gap.`,
    };
  }

  // Water gap
  if (waterGoal > 0 && water < waterGoal * 0.75) {
    return {
      ...common,
      scenario: '2.2', ruleId: 'water_under', familyNum: 2,
      diagnosis: `Water at ${water}oz vs ${waterGoal}oz goal`,
      action: 'Space water intake through the day to make the goal easier to hit',
      facts: { water, waterGoal },
      tone: 'corrective',
      fallbackTitle: 'Water Short Today',
      fallbackBody: `Water at ${water}oz vs your ${waterGoal}oz goal today. Spacing it through the day tomorrow tends to make hitting it automatic.`,
    };
  }

  // Default: use week context if available, otherwise score-only observation
  if (week.loggedDays >= 3 && week.avgProteinG > 0) {
    return {
      ...common,
      scenario: '5.1', ruleId: 'day_observation_with_context', familyNum: 5,
      diagnosis: `Score ${composite}/100, protein ${protein}g today vs ${week.avgProteinG}g weekly avg, ${week.loggedDays} of 7 days logged`,
      action: 'Review the breakdown above to find the biggest opportunity',
      facts: { score: composite, protein, weekAvgProtein: week.avgProteinG, loggedDays: week.loggedDays },
      tone: composite >= 65 ? 'positive' : 'corrective',
      fallbackTitle: `Day Score ${composite}`,
      fallbackBody: `Scored ${composite}/100. Protein at ${protein}g vs a ${week.avgProteinG}g weekly average.`,
    };
  }

  return {
    ...common,
    scenario: '5.1', ruleId: 'day_observation', familyNum: 5,
    diagnosis: `Score ${composite}/100, protein ${protein}g vs ${proteinGoal}g goal`,
    action: 'Review the breakdown above to find the biggest opportunity',
    facts: { score: composite, protein, proteinGoal },
    tone: composite >= 65 ? 'positive' : 'corrective',
    fallbackTitle: `Day Score ${composite}`,
    fallbackBody: `Scored ${composite}/100. ${composite >= 65 ? 'Solid work today.' : 'A few gaps to close. Check the breakdown above.'}`,
  };
}

export async function refreshDayCoachTip(
  dateKey: string,
  score: DayScore,
  input: DayScoreInput,
  mode: string,
  faithTier: string,
  weightGoal: string,
): Promise<CoachTipCache> {
  const cacheKey = `${DAY_TIP_KEY_PREFIX}${dateKey}`;

  // Fast path: AI result already cached for this date
  try {
    const existing = await AsyncStorage.getItem(cacheKey);
    if (existing) {
      const parsed: CoachTipCache = JSON.parse(existing);
      if (parsed.aiBody && parsed.aiGeneratedDate === dateKey) return parsed;
    }
  } catch {}

  // Load week context (parallel reads, fast)
  const week = await loadWeekContext(dateKey);
  const packet = buildDayCoachPacket(dateKey, score, input, week, mode, faithTier, weightGoal);

  // Return fallback immediately so the card shows without waiting for the AI call
  const fallbackCache: CoachTipCache = { packet, aiBody: null, aiGeneratedDate: null, fallbackUsed: true };

  // Fire AI call in background. Result is saved to storage and shown on next visit.
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (apiKey) {
    const modeKey = mode.toLowerCase() as keyof typeof VOICE_EXAMPLES;
    const systemPrompt = `${RULEBOOK}\n\n${VOICE_EXAMPLES[modeKey] ?? VOICE_EXAMPLES.balanced}`;
    callWithTimeout(apiKey, systemPrompt, formatPacketMessage(packet))
      .then(rawOutput => {
        const { passed, cleaned } = cleanupPass(rawOutput, packet);
        const aiCache: CoachTipCache = { packet, aiBody: passed ? cleaned : null, aiGeneratedDate: dateKey, fallbackUsed: !passed };
        storageSet(cacheKey, JSON.stringify(aiCache)).catch(() => {});
      })
      .catch(() => {});
  }

  return fallbackCache;
}
