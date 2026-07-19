import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { storageSet } from '../utils/storage';
import { cancelEveningGratitudeNotification, rescheduleStreakProtection } from '../services/notifications';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useToast } from './Toast';
import TooltipIcon from './TooltipIcon';
import ButtonShine from './ButtonShine';
import AnimatedNumber from './AnimatedNumber';
import GradientNumber from './GradientNumber';
import { CardWash, CardWatermark } from './GradientCard';
import { fetchVerseText } from '../data/verses';
import { Type, numLine } from '../typography';

// Same lift/sink recipe as GradientNumber -- an icon glyph is roughly square like a number glyph, not
// a wide word, so GradientNumber's tuning fits it better than GradientTitle's.
const FLAME_ICON_LIGHT = 0.24;
const FLAME_ICON_DARK  = 0.20;
function clampFlameIcon(n: number) { return Math.max(0, Math.min(255, Math.round(n))); }
function parseHexFlameIcon(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const toHexFlameIcon = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map(v => clampFlameIcon(v).toString(16).padStart(2, '0')).join('');
const liftFlameIcon = (rgb: [number, number, number], amt: number) =>
  toHexFlameIcon(rgb[0] + (255 - rgb[0]) * amt, rgb[1] + (255 - rgb[1]) * amt, rgb[2] + (255 - rgb[2]) * amt);
const sinkFlameIcon = (rgb: [number, number, number], amt: number) =>
  toHexFlameIcon(rgb[0] * (1 - amt), rgb[1] * (1 - amt), rgb[2] * (1 - amt));

function GradientFlameIcon({ size, color }: { size: number; color: string }) {
  const rgb = parseHexFlameIcon(color);
  if (!rgb) return <Ionicons name="flame" size={size} color={color} />;
  const stops: [string, string, string] = [liftFlameIcon(rgb, FLAME_ICON_LIGHT), color, sinkFlameIcon(rgb, FLAME_ICON_DARK)];
  return (
    <MaskedView maskElement={<Ionicons name="flame" size={size} color="#000000" />}>
      <LinearGradient colors={stops} locations={[0, 0.52, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <Ionicons name="flame" size={size} color={color} style={{ opacity: 0 }} />
      </LinearGradient>
    </MaskedView>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface GratitudeStreak {
  currentStreak: number;
  totalDays: number;
  lastLoggedDate: string | null;
}

interface StreakSavers {
  count: number;
  earnBaselineStreak: number;
  earnBaselineIsActive: boolean;
  // The day (pj_<date> key) a grace saver auto-covered a missed day, so the card can say so
  // for that day only. Additive/optional -- read-then-merge keeps every other savers field.
  lastGraceUsedDate?: string;
}

export interface PJStreaks {
  gratitude: GratitudeStreak;
  savers: StreakSavers;
}

const DEFAULT_STREAKS: PJStreaks = {
  gratitude: { currentStreak: 0, totalDays: 0, lastLoggedDate: null },
  savers: { count: 0, earnBaselineStreak: 0, earnBaselineIsActive: true, lastGraceUsedDate: '' },
};

// Date-key helpers (local Y-M-D math on the pj_<date> key format).
const dayKeyMinus = (key: string, n: number) => {
  const d = new Date(key + 'T00:00:00');
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayDiff = (fromKey: string, toKey: string) =>
  Math.round((new Date(toKey + 'T00:00:00').getTime() - new Date(fromKey + 'T00:00:00').getTime()) / 86400000);

// ─── Verses ───────────────────────────────────────────────────────────────────
// Baked KJV text, shown directly when KJV is selected. When WEB is selected, the same reference is
// live-fetched for the real WEB wording (see webVerseText state below) -- this array is never shown
// as-is under WEB, just used for its `ref` field and as a fallback if the live fetch hasn't landed yet.

const GRATITUDE_VERSES = [
  { text: 'In every thing give thanks: for this is the will of God in Christ Jesus concerning you.', ref: '1 Thessalonians 5:18' },
  { text: 'Enter into his gates with thanksgiving, and into his courts with praise: be thankful unto him, and bless his name.', ref: 'Psalm 100:4' },
  { text: 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.', ref: 'Philippians 4:6' },
  { text: 'O give thanks unto the LORD; for he is good: for his mercy endureth for ever.', ref: 'Psalm 107:1' },
  { text: 'And let the peace of God rule in your hearts...and be ye thankful.', ref: 'Colossians 3:15' },
  { text: 'I will praise thee, O LORD, with my whole heart; I will shew forth all thy marvellous works.', ref: 'Psalm 9:1' },
  { text: 'It is a good thing to give thanks unto the LORD, and to sing praises unto thy name, O most High.', ref: 'Psalm 92:1' },
  { text: 'O give thanks unto the LORD; call upon his name: make known his deeds among the people.', ref: 'Psalm 105:1' },
  { text: 'Every good gift and every perfect gift is from above, and cometh down from the Father of lights.', ref: 'James 1:17' },
  { text: 'And whatsoever ye do in word or deed, do all in the name of the Lord Jesus, giving thanks to God and the Father by him.', ref: 'Colossians 3:17' },
];

function getDailyVerse(todayKey: string) {
  const n = parseInt(todayKey.replace(/-/g, ''), 10);
  return GRATITUDE_VERSES[Math.abs(n) % GRATITUDE_VERSES.length];
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  styleMode: 'discipline' | 'balanced' | 'mindful';
  todayKey: string;
  scrollRef: React.RefObject<any>;
  theme: any;
  // 'home' (default) keeps the cool blue accent. 'faith' wears the warm gold faith-tab skin.
  variant?: 'home' | 'faith';
}

type CardState = 'empty' | 'logged' | 'editing';

// ─── Component ────────────────────────────────────────────────────────────────

export default function GratitudeStreakCard({ styleMode, todayKey, scrollRef, theme: t, variant = 'home' }: Props) {
  const { showToast } = useToast();
  const inputRef = useRef<TextInput>(null);
  const cardRef = useRef<View>(null);

  const [cardState, setCardState] = useState<CardState>('empty');
  const [inputText, setInputText] = useState('');
  const [loggedEntry, setLoggedEntry] = useState('');
  const [streak, setStreak] = useState<GratitudeStreak>(DEFAULT_STREAKS.gratitude);
  const [savers, setSavers] = useState<StreakSavers>(DEFAULT_STREAKS.savers);
  const [weeklyLogs, setWeeklyLogs] = useState<boolean[]>(new Array(7).fill(false));
  // Live WEB wording for today's gratitude verse, when WEB is selected. null = not fetched yet /
  // translation is KJV, in which case the baked KJV text below is used directly (matches the same
  // baked-vs-live split used for Today's Message).
  const [webVerseText, setWebVerseText] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setWebVerseText(null);
    AsyncStorage.getItem('pj_settings').then(raw => {
      const translation = raw ? (JSON.parse(raw).bibleTranslation ?? 'web') : 'web';
      if (translation !== 'web') return;
      const ref = getDailyVerse(todayKey).ref;
      fetchVerseText(ref, 'web').then(text => { if (alive && text) setWebVerseText(text); }).catch(() => {});
    }).catch(() => {});
    return () => { alive = false; };
  }, [todayKey]);

  const saverCap = styleMode === 'discipline' ? 1 : styleMode === 'balanced' ? 2 : 0;
  const isMindful = styleMode === 'mindful';

  // Gentle continuous flame pulse -- a lit streak feels alive. Dimmed + still when the streak is
  // 0 (see flameLit at render), so a broken streak reads as the flame going out.
  const flamePulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(flamePulse, { toValue: 1.12, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(flamePulse, { toValue: 1,    duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  // Faith-tab skin. The 'home' branch of every value is the exact current token, so the home
  // card renders identically; only the faith variant swaps the cool blue accent for warm gold.
  const faith = variant === 'faith';
  const isDark = t.id === 'dark';
  // Faith calm-card + tinted-box treatment (matches the Bible/Prayer cards): clean near-white card
  // + warm-brown ink + amber-tinted entry box, light family only. Home variant is fully untouched
  // (every faith value stays gated behind `faith`).
  const inkText    = isDark ? t.textPrimary : '#4a3214';
  // The warm ink LADDER, mirroring faith.tsx. The app's cool tokens are purple on Light (textMuted
  // '#6666aa', textDim '#9999bb', textSecondary '#4a4a6a'), which is a foreign hue on a warm amber card.
  // All THREE are gated on `faith`, so the Home variant keeps the cool tokens exactly as they were.
  const inkBody    = faith && !isDark ? '#5c4632' : t.textSecondary; // verses, the entry, prose
  const inkMuted   = faith && !isDark ? '#8a7358' : t.textMuted;     // labels, captions
  const inkDim     = faith && !isDark ? '#a8957e' : t.textDim;       // the emptiest marks (unlogged dots)
  const tintBg     = isDark ? t.bgTileFaith : t.accentAmber + '16';
  const tintBorder = isDark ? t.borderCard : t.accentAmber + '38';
  const accent      = faith ? t.accentAmber : t.accentBlueRaw;          // hero, flame, week dots, watermark
  const cardBorder  = faith ? 'rgba(212,134,10,0.22)' : t.borderCard;
  const cardTop     = faith ? 'rgba(212,134,10,0.55)' : t.accentBlueRaw;     // visible amber identity edge
  const cardBg      = faith ? (t.id === 'warm' ? 'rgba(255,253,248,0.72)' : t.bgCardFaithGlass) : t.bgCardGlass; // faith card matches the app's normal card except on warm, which keeps its cream so it lifts off the warm page
  const btnBg       = faith ? tintBg : t.accentBlueBg;                       // one unified warm tan (matches the entry box)
  const btnBorder   = faith ? tintBorder : t.accentBlueBorder;
  const btnText     = faith ? t.accentAmber : t.accentBlue;
  const entryFill   = faith ? tintBg : t.bgInput;
  const entryBorder = faith ? tintBorder : t.borderInput;

  useFocusEffect(useCallback(() => { loadData(); }, [todayKey]));

  const loadData = async () => {
    try {
      const raw = await AsyncStorage.getItem('pj_streaks');
      const parsed = raw ? JSON.parse(raw) : null;
      const stored: PJStreaks = parsed
        ? {
            ...DEFAULT_STREAKS,
            ...parsed,
            gratitude: { ...DEFAULT_STREAKS.gratitude, ...(parsed.gratitude ?? {}) },
            savers: { ...DEFAULT_STREAKS.savers, ...(parsed.savers ?? {}) },
          }
        : DEFAULT_STREAKS;

      const journalRaw = await AsyncStorage.getItem('pj_bible_reflections');
      const entries: any[] = journalRaw ? JSON.parse(journalRaw) : [];
      const todayEntry = entries.find(e => e.category === 'gratitude' && e.date === todayKey);

      // Compute which days of the current Sun-Sat week have a logged entry
      const todayDate = new Date(todayKey + 'T00:00:00');
      const weekStart = new Date(todayDate);
      weekStart.setDate(todayDate.getDate() - todayDate.getDay()); // back to Sunday
      const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      });
      setWeeklyLogs(weekDates.map(date => entries.some(e => e.category === 'gratitude' && e.date === date)));

      let gratitudeStreak = stored.gratitude;
      let saversState = stored.savers;
      let needsWrite = false;

      // If pj_streaks says today was logged but the journal entry was deleted, revert the increment
      if (gratitudeStreak.lastLoggedDate === todayKey && !todayEntry) {
        const yk = dayKeyMinus(todayKey, 1);
        gratitudeStreak = {
          ...gratitudeStreak,
          currentStreak: Math.max(0, gratitudeStreak.currentStreak - 1),
          totalDays: Math.max(0, gratitudeStreak.totalDays - 1),
          lastLoggedDate: gratitudeStreak.currentStreak <= 1 ? null : yk,
        };
        needsWrite = true;
      }

      // Grace-saver auto-protect (Model B): if exactly one day was missed and a saver is available,
      // spend one saver to keep the streak alive -- heal the gap to yesterday so a later log just
      // increments, and stamp the save so the card can say it covered yesterday. Runs once: after it
      // heals lastLoggedDate to yesterday, the next focus sees a 1-day gap and does nothing. No saver
      // / a multi-day gap = streak breaks (shown as 0 at render, no write -- a log resets it cleanly).
      if (gratitudeStreak.lastLoggedDate && gratitudeStreak.lastLoggedDate !== todayKey) {
        const diff = dayDiff(gratitudeStreak.lastLoggedDate, todayKey);
        if (diff === 2 && saverCap > 0 && saversState.count > 0) {
          const newSavers = { ...saversState, count: saversState.count - 1, lastGraceUsedDate: todayKey };
          // Spending a saver reactivates earning toward a refill (mirrors computeStreak).
          if (newSavers.count < saverCap && !newSavers.earnBaselineIsActive) {
            newSavers.earnBaselineStreak = gratitudeStreak.currentStreak;
            newSavers.earnBaselineIsActive = true;
          }
          gratitudeStreak = { ...gratitudeStreak, lastLoggedDate: dayKeyMinus(todayKey, 1) };
          saversState = newSavers;
          needsWrite = true;
        }
      }

      if (needsWrite) {
        await storageSet('pj_streaks', JSON.stringify({ ...stored, gratitude: gratitudeStreak, savers: saversState }));
      }

      setStreak(gratitudeStreak);
      setSavers(saversState);

      if (todayEntry) {
        setLoggedEntry(todayEntry.notes || '');
        setCardState('logged');
      } else {
        setLoggedEntry('');
        setCardState('empty');
        setInputText('');
      }
    } catch {}
  };

  const computeStreak = (
    current: GratitudeStreak,
    currentSavers: StreakSavers,
    today: string,
  ): { newStreak: GratitudeStreak; newSavers: StreakSavers; graceUsed: boolean; saverEarned: boolean } => {
    const s = { ...current };
    const sv = { ...currentSavers };
    let graceUsed = false;
    let saverEarned = false;

    if (s.lastLoggedDate === null) {
      s.currentStreak = 1;
      s.totalDays = 1;
    } else if (s.lastLoggedDate === today) {
      return { newStreak: s, newSavers: sv, graceUsed, saverEarned };
    } else {
      const last = new Date(s.lastLoggedDate + 'T00:00:00');
      const now  = new Date(today + 'T00:00:00');
      const diff = Math.round((now.getTime() - last.getTime()) / 86400000);

      if (diff === 1) {
        s.currentStreak++;
        s.totalDays++;
      } else if (diff === 2 && sv.count > 0 && saverCap > 0) {
        s.currentStreak++;
        s.totalDays++;
        sv.count--;
        sv.lastGraceUsedDate = today;
        graceUsed = true;
        if (sv.count < saverCap && !sv.earnBaselineIsActive) {
          sv.earnBaselineStreak = s.currentStreak;
          sv.earnBaselineIsActive = true;
        }
      } else {
        s.currentStreak = 1;
        s.totalDays++;
        if (saverCap > 0 && sv.count < saverCap) {
          sv.earnBaselineStreak = 0;
          sv.earnBaselineIsActive = true;
        }
      }
    }

    if (saverCap > 0 && sv.count < saverCap && sv.earnBaselineIsActive) {
      const progress = s.currentStreak - sv.earnBaselineStreak;
      if (progress >= 7) {
        sv.count++;
        saverEarned = true;
        if (sv.count >= saverCap) {
          sv.earnBaselineIsActive = false;
        } else {
          sv.earnBaselineStreak = s.currentStreak;
        }
      }
    }

    s.lastLoggedDate = today;
    return { newStreak: s, newSavers: sv, graceUsed, saverEarned };
  };

  const handleSave = async () => {
    const text = inputText.trim();
    if (!text) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const raw = await AsyncStorage.getItem('pj_bible_reflections');
      const entries: any[] = raw ? JSON.parse(raw) : [];
      const existingIdx = entries.findIndex(e => e.category === 'gratitude' && e.date === todayKey);
      const entry = {
        id: existingIdx >= 0 ? entries[existingIdx].id : `${todayKey}_gratitude_${Date.now()}`,
        date: todayKey,
        category: 'gratitude',
        title: 'Gratitude',
        notes: text,
      };
      if (existingIdx >= 0) { entries[existingIdx] = entry; }
      else { entries.unshift(entry); }
      await storageSet('pj_bible_reflections', JSON.stringify(entries));

      let updatedStreak = streak;
      let updatedSavers = savers;
      let graceUsed = false;
      let saverEarned = false;

      if (cardState !== 'editing') {
        const result = computeStreak(streak, savers, todayKey);
        updatedStreak = result.newStreak;
        updatedSavers = result.newSavers;
        graceUsed = result.graceUsed;
        saverEarned = result.saverEarned;

        const streaksRaw = await AsyncStorage.getItem('pj_streaks');
        const existing: PJStreaks = streaksRaw ? JSON.parse(streaksRaw) : DEFAULT_STREAKS;
        await storageSet('pj_streaks', JSON.stringify({ ...existing, gratitude: updatedStreak, savers: updatedSavers }));
        setStreak(updatedStreak);
        setSavers(updatedSavers);
      }

      setLoggedEntry(text);
      setCardState('logged');

      if (cardState !== 'editing') {
        const todayDow = new Date(todayKey + 'T00:00:00').getDay();
        setWeeklyLogs(prev => { const next = [...prev]; next[todayDow] = true; return next; });
      }

      if (cardState !== 'editing') {
        cancelEveningGratitudeNotification();
        rescheduleStreakProtection().catch(() => {});
      }
      if (graceUsed) {
        showToast(`Grace day saved your streak! ${updatedSavers.count} saver${updatedSavers.count !== 1 ? 's' : ''} left`, undefined, 'success');
      } else {
        showToast('Gratitude logged', undefined, 'success');
      }
      if (saverEarned) {
        setTimeout(() => showToast(`Grace saver earned! ${updatedSavers.count} saved`, undefined, 'success'), 1200);
      }
    } catch {
      showToast('Failed to save', undefined, 'error');
    }
  };

  const handleEdit = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setInputText(loggedEntry);
    setCardState('editing');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const isLoggedToday = cardState === 'logged' || cardState === 'editing';
  const canSave = inputText.trim().length > 0;

  // Honest streak shown the instant the card appears (no waiting for a log): intact if logged
  // today or yesterday, or if a saver is covering a single missed day; otherwise 0 (broken).
  const effectiveStreak = (() => {
    const g = streak;
    if (g.lastLoggedDate === null) return 0;
    if (g.lastLoggedDate === todayKey) return g.currentStreak;
    const diff = dayDiff(g.lastLoggedDate, todayKey);
    if (diff === 1) return g.currentStreak;
    if (diff === 2 && saverCap > 0 && savers.count > 0) return g.currentStreak;
    return 0;
  })();
  const heroValue = isMindful ? streak.totalDays : effectiveStreak;
  const flameLit = heroValue > 0;
  const graceUsedToday = !isMindful && savers.lastGraceUsedDate === todayKey;

  const earnProgress = !isMindful && savers.earnBaselineIsActive && savers.count < saverCap
    ? Math.min(Math.max(0, effectiveStreak - savers.earnBaselineStreak), 7)
    : 0;

  const verse = getDailyVerse(todayKey);
  const todayDow = new Date(todayKey + 'T00:00:00').getDay();
  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <View ref={cardRef} style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder, borderTopColor: cardTop, borderTopWidth: faith ? 2 : 1.5, shadowColor: t.cardShadow, shadowOpacity: t.cardShadowOpacity }]}>
      {faith
        ? null
        : <CardWash color={t.accentBlueRaw} radius={14} />}
      <CardWatermark name="heart" color={accent} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="heart" size={11} color={faith ? accent : inkMuted} />
          <Text style={[styles.cardLabel, { color: inkMuted }]}>Gratitude Streak</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TooltipIcon tooltipKey="gratitude_streak" color={faith ? accent : undefined} />
          <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/journal'); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={faith ? 'journal' : 'book'} size={16} color={btnText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Streak hero + week dots */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Animated.View style={{ transform: [{ scale: flameLit ? flamePulse : 1 }], opacity: flameLit ? 1 : 0.3 }}>
            <GradientFlameIcon size={22} color={accent} />
          </Animated.View>
          <AnimatedNumber
            value={heroValue}
            animateFromZero
            duration={600}
            renderValue={(formatted) => <GradientNumber value={formatted} color={accent} style={styles.heroNumber} />}
          />
          <Text style={[styles.heroLabel, { color: inkMuted }]}>
            {isMindful ? 'TOTAL DAYS' : 'DAY STREAK'}
          </Text>
        </View>
        {/* Sun–Sat week grid */}
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {DAY_LABELS.map((lbl, i) => {
            const logged = weeklyLogs[i] ?? false;
            const isToday = i === todayDow;
            const isFuture = i > todayDow;
            return (
              <View key={i} style={{ alignItems: 'center', gap: 3 }}>
                <Text style={{
                  fontFamily: isToday ? Type.uiBold : Type.ui,
                  fontSize: 8,
                  color: isToday ? accent : inkMuted,
                  opacity: isFuture ? 0.35 : 1,
                }}>
                  {lbl}
                </Text>
                <View style={{
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: logged ? accent : 'transparent',
                  borderWidth: logged ? 0 : 1.5,
                  borderColor: logged ? undefined : isToday ? accent : inkDim,
                  opacity: logged ? 0.9 : isToday ? 0.65 : isFuture ? 0.2 : 0.3,
                }} />
              </View>
            );
          })}
        </View>
      </View>

      {/* Saver indicator */}
      {!isMindful && saverCap > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 }}>
          {Array.from({ length: saverCap }, (_, i) => (
            <View
              key={i}
              style={{
                width: 9, height: 9, borderRadius: 5,
                backgroundColor: i < savers.count ? t.accentAmber : 'transparent',
                borderWidth: 1.5,
                borderColor: t.accentAmber,
                opacity: i < savers.count ? 1 : 0.4,
              }}
            />
          ))}
          <Text style={{ fontFamily: graceUsedToday ? Type.uiSemibold : Type.uiMedium, fontSize: 10, color: graceUsedToday ? t.accentAmber : inkMuted }}>
            {graceUsedToday
              ? 'Grace saver covered yesterday'
              : savers.count < saverCap
                ? `${earnProgress}/7 to grace saver`
                : `${savers.count} grace saver${savers.count !== 1 ? 's' : ''}`}
          </Text>
        </View>
      )}

      {/* Divider */}
      <View style={{ height: 0.5, backgroundColor: t.borderCard, marginBottom: 10 }} />

      {/* Scripture */}
      <View style={{ marginBottom: 12 }}>
        {/* inkBody, not t.textSecondary: on faith this is scripture on a warm card, and textSecondary is
            '#4a4a6a' -- a cool navy. It also now MATCHES the prayer previews on the Faith tab, which sat on
            the dark headline ink and read heavy. Verses and prayers are the same job: text you read. */}
        <Text style={{ fontFamily: faith ? 'Lora_500Medium' : Type.ui, fontSize: faith ? 14 : 12, color: inkBody, fontStyle: faith ? 'normal' : 'italic', lineHeight: faith ? 21 : 18, textAlign: faith ? 'center' : 'left' }}>
          "{webVerseText ?? verse.text}"
        </Text>
        <Text style={{ fontFamily: Type.uiSemibold, fontSize: 10, color: t.accentAmber, marginTop: 4, letterSpacing: 0.5, textAlign: faith ? 'center' : 'left' }}>
          {verse.ref}
        </Text>
      </View>

      {/* Logged state */}
      {cardState === 'logged' ? (
        <>
          <View style={[styles.entryBox, { backgroundColor: entryFill, borderColor: entryBorder, borderLeftWidth: 1, borderLeftColor: entryBorder }]}>
            <Text style={[styles.entryLabel, { color: inkMuted }]}>Today's Entry</Text>
            {/* inkBody: "Healthy pregnancy." is the user's own words, same job as a prayer preview, so it
                sits on the body rung rather than the dark headline ink it used to use. */}
            <Text style={{ fontFamily: Type.ui, fontSize: 14, color: faith ? inkBody : t.textPrimary, lineHeight: 20 }}>
              {loggedEntry}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: btnBg, borderColor: btnBorder, flex: 1 }]}
              onPress={handleEdit}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              {/* This card renders in BOTH variants -- amber on the Faith tab, accent on Home -- and btnBg
                  resolves per variant. The gloss is white, so one ButtonShine covers both. */}
              <ButtonShine radius={6} />
              <Text style={{ fontFamily: Type.uiSemibold, fontSize: 12, color: btnText }}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: btnBg, borderColor: btnBorder, flex: 2 }]}
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/journal'); }}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <ButtonShine radius={6} />
              <Ionicons name={faith ? 'journal-outline' : 'book-outline'} size={12} color={btnText} style={{ marginRight: 4 }} />
              <Text style={{ fontFamily: Type.uiSemibold, fontSize: 12, color: btnText }}>View in Journal</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* Empty / editing state */
        <>
          <TextInput
            ref={inputRef}
            style={[styles.notesInput, { backgroundColor: t.bgInput, borderColor: t.borderInput, color: t.textPrimary }]}
            placeholder="What are you grateful for today?"
            placeholderTextColor={t.textPlaceholder}
            multiline
            numberOfLines={3}
            value={inputText}
            onChangeText={setInputText}
            onFocus={() => {
              setTimeout(() => {
                if (cardRef.current && scrollRef.current) {
                  cardRef.current.measureLayout(scrollRef.current, (_x: number, y: number) => {
                    scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
                  }, () => {});
                }
              }, 150);
            }}
            onBlur={() => inputRef.current?.setNativeProps({ selection: { start: 0, end: 0 } })}
          />
          {cardState === 'editing' ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: t.bgInput, borderColor: t.borderInput, flex: 1 }]}
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setCardState('logged'); setInputText(''); }}
              >
                <Text style={{ fontFamily: Type.uiSemibold, fontSize: 12, color: inkBody }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, {
                  backgroundColor: btnBg,
                  borderColor: btnBorder,
                  opacity: canSave ? 1 : 0.4,
                  flex: 2,
                }]}
                disabled={!canSave}
                onPress={handleSave}
              >
                <ButtonShine radius={6} />
                <Text style={{ fontFamily: Type.uiSemibold, fontSize: 12, color: btnText }}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.saveBtn, {
                backgroundColor: btnBg,
                borderColor: btnBorder,
                opacity: canSave ? 1 : 0.4,
              }]}
              disabled={!canSave}
              onPress={handleSave}
            >
              {/* opacity 0.4 when there is nothing to save dims the shine along with the button, which is
                  correct: a dim/inactive button should not look like a lit surface. */}
              <ButtonShine radius={6} />
              <Text style={[styles.saveBtnText, { color: btnText }]}>Log Gratitude</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 0.5,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderTopWidth: 1.5,
    // shadowColor/shadowOpacity come from the THEME inline at the render site: hardcoded '#000000' @ 0.25
    // was invisible on Dark and the wrong hue on Light (whose shadow is navy). The card also carried
    // overflow:'hidden' to clip its corner heart, which deleted the shadow entirely (iOS masksToBounds);
    // CardWatermark clips itself now, so the overflow is gone and the shadow renders.
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  cardLabel: {
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontFamily: Type.uiBold,
  },
  heroNumber: {
    fontFamily: Type.num,
    fontSize: 36,
    lineHeight: numLine(36),
    opacity: 0.88,
  },
  heroLabel: {
    fontFamily: Type.uiSemibold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  entryBox: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  entryLabel: {
    fontFamily: Type.uiSemibold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  actionBtn: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 44,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: Type.ui,
  },
  saveBtn: {
    marginTop: 8,
    padding: 10,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 12,
    fontFamily: Type.uiMedium,
  },
});
