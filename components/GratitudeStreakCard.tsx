import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from '../utils/storage';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useToast } from './Toast';

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
}

export interface PJStreaks {
  gratitude: GratitudeStreak;
  savers: StreakSavers;
}

const DEFAULT_STREAKS: PJStreaks = {
  gratitude: { currentStreak: 0, totalDays: 0, lastLoggedDate: null },
  savers: { count: 0, earnBaselineStreak: 0, earnBaselineIsActive: true },
};

// ─── Verses (KJV) ────────────────────────────────────────────────────────────

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

  const saverCap = styleMode === 'discipline' ? 1 : styleMode === 'balanced' ? 2 : 0;
  const isMindful = styleMode === 'mindful';

  // Faith-tab skin. The 'home' branch of every value is the exact current token, so the home
  // card renders identically; only the faith variant swaps the cool blue accent for warm gold.
  const faith = variant === 'faith';
  const accent      = faith ? t.accentAmber : t.accentBlueRaw;          // hero, flame, week dots, watermark
  const cardBorder  = faith ? 'rgba(212,134,10,0.22)' : t.borderCard;
  const cardTop     = faith ? 'rgba(212,134,10,0.38)' : t.accentBlueRaw;
  const cardBg      = faith ? t.bgCardFaith : t.bgCard;                 // faint warm tint on the faith tab only
  const btnBg       = faith ? 'rgba(212,134,10,0.10)' : t.accentBlueBg;
  const btnBorder   = faith ? 'rgba(212,134,10,0.30)' : t.accentBlueBorder;
  const btnText     = faith ? t.accentAmber : t.accentBlue;
  const entryFill   = faith ? t.bgTileFaith : t.bgInput;
  const entryBorder = faith ? t.borderCard : t.borderInput;

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

      // If pj_streaks says today was logged but the journal entry was deleted, revert the increment
      if (gratitudeStreak.lastLoggedDate === todayKey && !todayEntry) {
        const d = new Date(todayKey + 'T00:00:00');
        d.setDate(d.getDate() - 1);
        const yk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        gratitudeStreak = {
          ...gratitudeStreak,
          currentStreak: Math.max(0, gratitudeStreak.currentStreak - 1),
          totalDays: Math.max(0, gratitudeStreak.totalDays - 1),
          lastLoggedDate: gratitudeStreak.currentStreak <= 1 ? null : yk,
        };
        await storageSet('pj_streaks', JSON.stringify({ ...stored, gratitude: gratitudeStreak }));
      }

      setStreak(gratitudeStreak);
      setSavers(stored.savers);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText(loggedEntry);
    setCardState('editing');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const isLoggedToday = cardState === 'logged' || cardState === 'editing';
  const canSave = inputText.trim().length > 0;

  const earnProgress = !isMindful && savers.earnBaselineIsActive && savers.count < saverCap
    ? Math.min(streak.currentStreak - savers.earnBaselineStreak, 7)
    : 0;

  const verse = getDailyVerse(todayKey);
  const todayDow = new Date(todayKey + 'T00:00:00').getDay();
  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <View ref={cardRef} style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder, borderTopColor: cardTop, overflow: 'hidden' }]}>
      <Ionicons name="heart" size={130} color={accent} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.10 }} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="heart" size={11} color={t.textMuted} />
          <Text style={[styles.cardLabel, { color: t.textMuted }]}>Gratitude Streak</Text>
        </View>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/journal'); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={faith ? 'journal' : 'book'} size={16} color={btnText} />
        </TouchableOpacity>
      </View>

      {/* Streak hero + week dots */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="flame" size={22} color={accent} />
          <Text style={[styles.heroNumber, { color: accent }]}>
            {isMindful ? streak.totalDays : streak.currentStreak}
          </Text>
          <Text style={[styles.heroLabel, { color: t.textMuted }]}>
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
                  fontFamily: isToday ? 'DMSans_700Bold' : 'DMSans_400Regular',
                  fontSize: 8,
                  color: isToday ? accent : t.textMuted,
                  opacity: isFuture ? 0.35 : 1,
                }}>
                  {lbl}
                </Text>
                <View style={{
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: logged ? accent : 'transparent',
                  borderWidth: logged ? 0 : 1.5,
                  borderColor: logged ? undefined : isToday ? accent : t.textDim,
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
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 10, color: t.textMuted }}>
            {savers.count < saverCap
              ? `${earnProgress}/7 to grace saver`
              : `${savers.count} grace saver${savers.count !== 1 ? 's' : ''}`}
          </Text>
        </View>
      )}

      {/* Divider */}
      <View style={{ height: 0.5, backgroundColor: t.borderCard, marginBottom: 10 }} />

      {/* Scripture */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: t.textSecondary, fontStyle: 'italic', lineHeight: 18 }}>
          "{verse.text}"
        </Text>
        <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, color: t.accentAmber, marginTop: 4, letterSpacing: 0.5 }}>
          {verse.ref}
        </Text>
      </View>

      {/* Logged state */}
      {cardState === 'logged' ? (
        <>
          <View style={[styles.entryBox, { backgroundColor: entryFill, borderColor: entryBorder, borderLeftWidth: faith ? 3 : 1, borderLeftColor: faith ? accent : entryBorder }]}>
            <Text style={[styles.entryLabel, { color: t.textMuted }]}>Today's Entry</Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: t.textPrimary, lineHeight: 20 }}>
              {loggedEntry}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: btnBg, borderColor: btnBorder, flex: 1 }]}
              onPress={handleEdit}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: btnText }}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: btnBg, borderColor: btnBorder, flex: 2 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/journal'); }}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Ionicons name={faith ? 'journal-outline' : 'book-outline'} size={12} color={btnText} style={{ marginRight: 4 }} />
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: btnText }}>View in Journal</Text>
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
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCardState('logged'); setInputText(''); }}
              >
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: t.textSecondary }}>Cancel</Text>
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
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: btnText }}>Save Changes</Text>
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  cardLabel: {
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontFamily: 'DMSans_700Bold',
  },
  heroNumber: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 36,
    lineHeight: 38,
    opacity: 0.88,
  },
  heroLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  entryBox: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  entryLabel: {
    fontFamily: 'DMSans_600SemiBold',
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
    fontFamily: 'DMSans_400Regular',
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
    fontFamily: 'DMSans_500Medium',
  },
});
