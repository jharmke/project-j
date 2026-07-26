// Notifications settings, lifted out of the Settings screen into a page of its own.
//
// WHY IT MOVED: this was one card inside Settings holding seven separate concerns -- master switch,
// quiet hours, streak protection, daily cap, categories, water, and a collapsed Advanced block. The
// only tools available to separate them inside a single card were hairlines and shifting text sizes,
// which is exactly why it read as cluttered. On its own page each concern becomes its own CARD, using
// the same card system as the rest of the app, and the grouping does the work instead of dividers.
// Settings keeps one small card that links here, so that screen got SHORTER, not longer.
//
// CATEGORY TAXONOMY (changed 2026-07-25): was Fitness / Faith / Fasting / Summaries. Fasting is a
// feature inside eating rather than a pillar anyone thinks in, and Summaries is a delivery format, not
// a subject -- putting it beside Fitness compared a category to a file type. The categories are now the
// app's own three pillars, and the things that BYPASS the daily cap (streaks, summaries, water) sit
// together in their own card instead of pretending to be topics.

import { Ionicons } from '@/components/AppIcons';
import { Text } from '@/components/AppText';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useTutorial } from '../context/TutorialContext';
import { useTutorialTarget } from '../hooks/useTutorialTarget';
import { Type } from '../typography';
import ScreenHeader from '../components/ScreenHeader';
import BackgroundLayers from '../components/BackgroundLayers';
import ModalHeader from '../components/ModalHeader';
import PrimaryCTA from '../components/PrimaryCTA';
import ButtonShine from '../components/ButtonShine';
import GradientNumber from '../components/GradientNumber';
import ToggleSwitch from '../components/ToggleSwitch';
import {
  NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  loadNotificationSettings,
  saveNotificationSettings,
  getAverageBedtime,
  getPermissionStatus,
  requestNotificationPermission,
} from '../services/notifications';

type FaithJourney = 'rooted' | 'exploring' | 'notrightnow';

const parseTime = (t: string) => {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return { hour: h || 0, minute: m || 0 };
};

const formatNotifTime = (t: string) => {
  const { hour, minute } = parseTime(t);
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${period}`;
};

// ── Card + row primitives ─────────────────────────────────────────────────────
// MODULE level on purpose. Declared inside the screen component these were a brand-new component type
// on every render, so React tore them down and remounted them each time a setting changed -- which
// remounted the toggles mid-flip and meant their slide animation never got to play. The toggle was
// never broken; its host was being replaced underneath it. Anything holding animation state has to
// keep a stable identity across renders.

// Card label is the house style: small, wide-tracked, MUTED. It was accent 11pt, identical to the
// section headings inside the card, so "TIMING" and "ACTIVITY REMINDER" read as two of the same thing
// stacked on each other. Quiet grey label, accent headings under it.
// Accent bar across the top, the same treatment the modals use. With the eyebrow labels gone it's the
// card's only marker -- and it does the job the eyebrow was doing (this is a distinct group) without
// adding another line of text to a screen that had too many.
// `label` is still supported but no card on this screen uses one: each card's first row already names
// it, so an eyebrow above it was a second title saying the same thing.
const Card = ({ label, theme, children }: { label?: string; theme: any; children: React.ReactNode }) => (
  <View style={{
    backgroundColor: theme.bgCard, borderRadius: 14, borderWidth: 0.5,
    borderColor: theme.borderCard,
    borderTopWidth: 1.5, borderTopColor: theme.accentBlue,
    padding: 16, marginBottom: 12,
    shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6,
  }}>
    {label ? (
      <Text style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: Type.uiBold, color: theme.textMuted, marginBottom: 12 }}>
        {label}
      </Text>
    ) : null}
    {children}
  </View>
);

const SwitchRow = ({ title, sub, value, onChange, disabled, theme }: {
  title: string; sub: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean; theme: any;
}) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', opacity: disabled ? 0.4 : 1 }}>
    <View style={{ flex: 1, marginRight: 12 }}>
      <Text style={{ fontSize: 15, fontFamily: Type.uiSemibold, color: theme.textSecondary }}>{title}</Text>
      <Text style={{ fontSize: 12, fontFamily: Type.uiMedium, color: theme.textMuted, marginTop: 2, lineHeight: 17 }}>{sub}</Text>
    </View>
    <ToggleSwitch value={value} onValueChange={disabled ? () => {} : onChange} />
  </View>
);

// Its own component so each pill can own a press scale. Without it these were the only controls on the
// screen that gave nothing back on touch, which is what made them feel cheap next to the toggles.
const Pill = ({ label, on, onPress, theme }: { label: string; on: boolean; onPress: () => void; theme: any }) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <TouchableOpacity
        onPressIn={() => Animated.timing(scale, { toValue: 0.97, duration: 90, useNativeDriver: true }).start()}
        onPressOut={() => Animated.timing(scale, { toValue: 1, duration: 90, useNativeDriver: true }).start()}
        onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
        activeOpacity={0.9}
        style={{
          paddingVertical: 10, borderRadius: 8, alignItems: 'center', overflow: 'hidden',
          backgroundColor: on ? theme.accentBlueBg : theme.bgInput,
          borderWidth: 1, borderColor: on ? theme.accentBlueBorder : theme.borderInput,
        }}>
        {on && <ButtonShine radius={8} />}
        <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: on ? Type.uiBold : Type.uiSemibold, color: on ? theme.accentBlue : theme.textMuted }}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// A row of equal-width choices. Used by the cap, water count, and every timing control, all of which
// were separately hand-rolled versions of the same thing back in Settings.
function PillRow<T>({ options, value, onSelect, theme }: {
  options: { value: T; label: string }[]; value: T; onSelect: (v: T) => void; theme: any;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {options.map(opt => (
        <Pill key={String(opt.value)} label={opt.label} on={opt.value === value} onPress={() => onSelect(opt.value)} theme={theme} />
      ))}
    </View>
  );
}

// uiMedium, not regular. These descriptions carry most of the meaning on this screen and were the
// lightest thing on it, so they read as filler rather than as the explanation you actually need.
const SubLabel = ({ children, theme }: { children: React.ReactNode; theme: any }) => (
  <Text style={{ fontSize: 12, fontFamily: Type.uiMedium, color: theme.textMuted, marginBottom: 10, lineHeight: 17 }}>{children}</Text>
);

type TypeKey = 'typeFoodLog' | 'typeIfCheckIn' | 'typeIfWindow' | 'typeActivity' | 'typeWeightLog'
  | 'typeDailyVerse' | 'typeFaithReading' | 'typeGratitude' | 'typePrayer';

type Child = {
  key: TypeKey;
  title: string;
  /** One line saying when it actually fires. This is the whole point of expanding a category. */
  fires: string;
  /** Some reminders only exist for certain users (Prayer is Rooted only). Hidden, not shown disabled,
   *  because a control for something that can never fire is just confusing. */
  show?: boolean;
};

// A category: one master switch, a count, and the individual reminders underneath it.
//
// The motivating case: someone who prays daily outside the app doesn't want the prayer nudge, but
// under a single Faith switch their only option was to lose the daily verse, reading plan and
// gratitude reminders too. Categories stay the top level so the simple case is still one tap.
function CategoryRow({
  title, sub, categoryOn, disabled, children: kids, extra, settings, theme, expanded, onToggleExpand, onSetCategory, onSetChild,
}: {
  title: string; sub: string; categoryOn: boolean; disabled?: boolean;
  children: Child[]; extra?: React.ReactNode;
  settings: NotificationSettings; theme: any; expanded: boolean;
  onToggleExpand: () => void;
  onSetCategory: (v: boolean) => void;
  onSetChild: (key: TypeKey, v: boolean) => void;
}) {
  const visible = kids.filter(k => k.show !== false);
  const onCount = visible.filter(k => (settings[k.key] ?? true) === true).length;

  return (
    <View style={{ opacity: disabled ? 0.4 : 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Expandable even when the category is OFF. Gating it on the switch meant the only route to
            enabling one reminder was to switch the whole category on -- which switches all of them on
            -- and then undo the ones you didn't want. Turning a single child on brings its category
            back with it, so "I just want this one" is one tap. */}
        <TouchableOpacity
          style={{ flex: 1, marginRight: 12, flexDirection: 'row', alignItems: 'center' }}
          activeOpacity={0.7}
          disabled={disabled}
          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); onToggleExpand(); }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontFamily: Type.uiSemibold, color: theme.textSecondary }}>{title}</Text>
            <Text style={{ fontSize: 12, fontFamily: Type.uiMedium, color: theme.textMuted, marginTop: 2, lineHeight: 17 }}>
              {/* The count replaces a list of what's inside: once you can expand and see the actual
                  reminders, naming them here was saying it twice, and it couldn't show that you'd
                  customised anything. */}
              {disabled ? sub : categoryOn ? `${onCount} of ${visible.length} on` : sub}
            </Text>
          </View>
          {!disabled && (
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textDim} style={{ marginLeft: 8 }} />
          )}
        </TouchableOpacity>
        <ToggleSwitch value={categoryOn} onValueChange={disabled ? () => {} : onSetCategory} />
      </View>

      {expanded && !disabled && (
        // No dimming needed: a category being off actually switches its children off, so what you see
        // is the real state. Turning any one of them back on revives the category with it.
        <View style={{ marginTop: 12, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: theme.borderInput }}>
          {visible.map((k, i) => (
            <View key={k.key} style={{ flexDirection: 'row', alignItems: 'center', marginTop: i === 0 ? 0 : 14 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 14, fontFamily: Type.uiSemibold, color: theme.textSecondary }}>{k.title}</Text>
                <Text style={{ fontSize: 12, fontFamily: Type.uiMedium, color: theme.textMuted, marginTop: 2, lineHeight: 17 }}>{k.fires}</Text>
              </View>
              <ToggleSwitch value={(settings[k.key] ?? true) as boolean} onValueChange={v => onSetChild(k.key, v)} />
            </View>
          ))}
          {extra}
        </View>
      )}
    </View>
  );
}

// A sub-section inside a card reads as a ROW TITLE, not as another label. It used to be 11pt accent
// uppercase, which was a second card-label tier competing with the real one -- the reason "TIMING" and
// "ACTIVITY REMINDER" stacked so badly. Same size and weight as a switch row's title, so a labelled
// group and a switch row sit at the same level, because they are the same level.
//
// TYPE SCALE FOR THIS SCREEN -- four roles, nothing else gets a size:
//   9pt tracked uppercase grey  = the card's label, one per card
//   15pt semibold               = a row title, the thing you act on
//   13pt semibold               = text inside a control (pills, buttons)
//   12pt regular muted          = every description, everywhere
// COLOUR RULE: accent means LIVE -- an active selection, something switched on, something tappable.
// Static text stays in the grey scale. Colour tells you where you can act instead of decorating.
const Heading = ({ title, theme }: { title: string; theme: any }) => (
  <Text style={{ fontSize: 15, fontFamily: Type.uiSemibold, color: theme.textSecondary, marginBottom: 2 }}>
    {title}
  </Text>
);

// `label` is optional: a lone time control reads better as just the box, since the heading above has
// already said what the time is for. Only the paired quiet-hours boxes need From/Until.
const TimeRow = ({ label, value, onPress, theme }: { label?: string; value: string; onPress: () => void; theme: any }) => (
  <View style={{ flex: 1 }}>
    {label ? <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui, marginBottom: 6 }}>{label}</Text> : null}
    <TouchableOpacity
      onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}>
      <GradientNumber value={value} color={theme.textSecondary} style={{ fontSize: 15, fontFamily: Type.uiSemibold }} />
    </TouchableOpacity>
  </View>
);

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  // Tutorial targets. The notifications tour used to walk a section inside Settings; it now walks this
  // page, so the spotlight anchors live here. Registered on mount and torn down on unmount, same as
  // every other tutorial host.
  const { registerTarget, unregisterTarget, registerScrollView, unregisterScrollView } = useTutorial();
  const scrollRef = useRef<ScrollView>(null);
  const tutMasterRef = useTutorialTarget('notif_master');
  const tutQuietRef = useTutorialTarget('notif_quiet');
  const tutCapRef = useTutorialTarget('notif_cap');
  const tutCategoriesRef = useTutorialTarget('notif_categories');
  const tutBypassRef = useTutorialTarget('notif_bypass');
  const tutTimingRef = useTutorialTarget('notif_timing');
  useEffect(() => {
    registerScrollView('notifications', scrollRef);
    return () => unregisterScrollView('notifications');
  }, [registerScrollView, unregisterScrollView]);

  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [avgBedtime, setAvgBedtime] = useState<string | null>(null);
  const [faithJourney, setFaithJourney] = useState<FaithJourney>('rooted');
  const [loaded, setLoaded] = useState(false);

  // Own time picker, not Settings'. The one over there is shared with the goals section and is a
  // slide-up sheet, which the project bans; this is a centred card like every other modal.
  const [activePicker, setActivePicker] = useState<keyof NotificationSettings | null>(null);
  const [pickerValue, setPickerValue] = useState(new Date());
  const pickerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      try {
        setSettings(await loadNotificationSettings());
        setPermission(await getPermissionStatus());
        setAvgBedtime(await getAverageBedtime());
        const raw = await AsyncStorage.getItem('pj_settings');
        if (raw) {
          const s = JSON.parse(raw);
          if (s.faithJourney) setFaithJourney(s.faithJourney);
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const update = useCallback(async (patch: Partial<NotificationSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      // Fire-and-forget: the local state is the source of truth for the UI, and a failed write should
      // never freeze a toggle mid-tap.
      saveNotificationSettings(next).catch(() => {});
      return next;
    });
  }, []);

  const openPicker = (key: keyof NotificationSettings, current: string) => {
    const { hour, minute } = parseTime(current);
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    setPickerValue(d);
    setActivePicker(key);
  };

  const closePicker = () => setActivePicker(null);

  const confirmPicker = () => {
    if (!activePicker) return;
    const hh = String(pickerValue.getHours()).padStart(2, '0');
    const mm = String(pickerValue.getMinutes()).padStart(2, '0');
    update({ [activePicker]: `${hh}:${mm}` } as Partial<NotificationSettings>);
    closePicker();
  };


  const on = settings.masterEnabled;
  const nrn = faithJourney === 'notrightnow';

  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const toggleCategory = (id: string) => setOpenCategory(cur => (cur === id ? null : id));

  const NUTRITION_KIDS: Child[] = [
    { key: 'typeFoodLog', title: 'Food Log', fires: "Fires at 2pm if you haven't logged anything yet." },
    { key: 'typeIfCheckIn', title: 'Fasting Check-In', fires: "Fires if you've eaten but haven't started your fast." },
    { key: 'typeIfWindow', title: 'Fasting Window', fires: 'Fires before your eating window closes.' },
  ];
  const FITNESS_KIDS: Child[] = [
    { key: 'typeActivity', title: 'Activity', fires: 'Fires if there’s no workout and your steps are low.' },
    { key: 'typeWeightLog', title: 'Weight Log', fires: 'Fires on your weigh-in schedule.' },
  ];
  const FAITH_KIDS: Child[] = [
    { key: 'typeDailyVerse', title: 'Daily Verse', fires: 'A verse each morning.' },
    { key: 'typeFaithReading', title: 'Reading & Devotionals', fires: 'Fires if today’s reading is still waiting.' },
    { key: 'typeGratitude', title: 'Gratitude', fires: 'Fires if you haven’t logged gratitude today.' },
    { key: 'typePrayer', title: 'Prayer', fires: 'Fires if no prayer is logged that day.', show: faithJourney === 'rooted' },
  ];

  // Turning a category ON when every reminder inside it is off would leave it on but silent, so the
  // children come back with it. Turning the LAST child off turns the category off, so the switch never
  // claims a category is on while nothing in it can fire.
  // A category switch takes its children WITH it, both ways. Off means every child is genuinely off,
  // so the switches below always tell the truth -- showing them on-but-dimmed under a category that's
  // off implies they'd fire, and they wouldn't. On brings them all back.
  // Water rides along too: it's a child of Nutrition in every sense except that its state lives in a
  // count rather than a boolean.
  const setCategory = (categoryKey: 'categoryFasting' | 'categoryFitness' | 'categoryFaith', kids: Child[], v: boolean) => {
    const visible = kids.filter(k => k.show !== false);
    const patch: Partial<NotificationSettings> = { [categoryKey]: v } as Partial<NotificationSettings>;
    visible.forEach(k => { (patch as any)[k.key] = v; });
    if (categoryKey === 'categoryFasting') {
      const remembered = (settings.waterCount || settings.waterCountLast) as 1 | 2 | 3 | 4;
      patch.waterCount = v ? remembered : 0;
      patch.waterCountLast = remembered;
    }
    update(patch);
  };

  const setChild = (categoryKey: 'categoryFasting' | 'categoryFitness' | 'categoryFaith', kids: Child[], key: TypeKey, v: boolean) => {
    const visible = kids.filter(k => k.show !== false);
    const remaining = visible.filter(k => k.key !== key).some(k => (settings[k.key] ?? true) === true);
    const patch: Partial<NotificationSettings> = { [key]: v } as Partial<NotificationSettings>;
    // Last one off closes the category, so the switch never claims a group is on while nothing in it
    // can fire. Any one on revives it, which is what makes "I only want this one" a single tap from a
    // category that's currently off.
    if (!v && !remaining) (patch as any)[categoryKey] = false;
    if (v) (patch as any)[categoryKey] = true;
    update(patch);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      <BackgroundLayers />
      <ScreenHeader title="Notifications" />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {!loaded ? null : (
          <>
            {permission === 'denied' && (
              <View style={{ backgroundColor: theme.accentRedBg ?? 'rgba(204,51,51,0.12)', borderWidth: 1, borderColor: theme.accentRed, borderRadius: 10, padding: 12, marginBottom: 12 }}>
                <Text style={{ color: theme.accentRed, fontSize: 13, fontFamily: Type.uiSemibold }}>Notifications Blocked</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: Type.ui, marginTop: 4 }}>
                  iOS permission was denied. Go to Settings then GoodForge then Notifications to enable.
                </Text>
              </View>
            )}

            {/* ── 1. Master + quiet hours ── */}
            <Card theme={theme}>
              <View ref={tutMasterRef as any} collapsable={false}>
              <SwitchRow
                theme={theme}
                title="Enable Notifications"
                sub="Master on/off for everything below"
                value={settings.masterEnabled}
                onChange={v => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                  if (!v) closePicker();
                  if (v && permission === 'undetermined') {
                    requestNotificationPermission().then(granted => setPermission(granted ? 'granted' : 'denied'));
                  }
                  update({ masterEnabled: v });
                }}
              />
              </View>
              {on && (
                <View ref={tutQuietRef as any} collapsable={false}>
                  <View style={{ height: 1, backgroundColor: theme.borderInput, marginTop: 16, marginBottom: 12 }} />
                  <Heading title="Quiet Hours" theme={theme} />
                  <SubLabel theme={theme}>Nothing reaches you between these times.</SubLabel>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TimeRow theme={theme} label="From" value={formatNotifTime(settings.quietStart)} onPress={() => openPicker('quietStart', settings.quietStart)} />
                    <TimeRow theme={theme} label="Until" value={formatNotifTime(settings.quietEnd)} onPress={() => openPicker('quietEnd', settings.quietEnd)} />
                  </View>
                </View>
              )}
            </Card>

            {on && (
              <>
                {/* ── 2. The nudges that compete for the daily cap ── */}
                {/* One card, five switchable things. It used to be two cards: this one, plus a second
                    named "Always Comes Through" whose only job was to hold the two items that ignore
                    the daily limit. That meant the card's NAME, its explanation line, and the concept
                    were each saying the same thing, which is what made it read as jumbled. The
                    exemption is now a fact stated in the two rows it applies to, so the second card
                    and its two extra lines of text disappear. */}
                <Card theme={theme}>
                  {/* The pills used to float with their explanation two lines above them, so the
                      numbers meant nothing on their own. Label sits directly on the control now. */}
                  <View ref={tutCapRef as any} collapsable={false}>
                    <Heading title="Daily Limit" theme={theme} />
                    <SubLabel theme={theme}>The most nudges you'll get in a day.</SubLabel>
                    <PillRow
                      theme={theme}
                      options={[{ value: 3 as const, label: '3' }, { value: 5 as const, label: '5' }, { value: 'all' as const, label: 'All' }]}
                      value={settings.dailyCap}
                      onSelect={v => update({ dailyCap: v })}
                    />
                  </View>

                  <View style={{ height: 1, backgroundColor: theme.borderInput, marginTop: 16, marginBottom: 12 }} />

                  <View ref={tutCategoriesRef as any} collapsable={false}>
                  <CategoryRow
                    theme={theme} settings={settings}
                    title="Nutrition"
                    sub="Food log, fasting, and water."
                    categoryOn={settings.categoryFasting}
                    expanded={openCategory === 'nutrition'}
                    onToggleExpand={() => toggleCategory('nutrition')}
                    onSetCategory={v => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setCategory('categoryFasting', NUTRITION_KIDS, v); }}
                    onSetChild={(k, v) => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setChild('categoryFasting', NUTRITION_KIDS, k, v); }}
                    children={NUTRITION_KIDS}
                    extra={
                      /* Water is a switch like its siblings rather than a row of pills with its own
                         "Off" -- two ways to turn one thing off in the same list. The count appears
                         only when it's on, and switching off remembers the number so coming back
                         restores what you had instead of a default you never chose. */
                      <View style={{ marginTop: 14 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{ flex: 1, marginRight: 12 }}>
                            <Text style={{ fontSize: 14, fontFamily: Type.uiSemibold, color: theme.textSecondary }}>Water</Text>
                            <Text style={{ fontSize: 12, fontFamily: Type.uiMedium, color: theme.textMuted, marginTop: 2, lineHeight: 17 }}>
                              Spaced through your waking hours. Sent even if you've hit your daily limit.
                            </Text>
                          </View>
                          <ToggleSwitch
                            value={settings.waterCount > 0}
                            onValueChange={v => {
                              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                              // The `||` matters: if the count is somehow already 0 we keep the last
                              // remembered value rather than storing 0 as "what they had".
                              const remembered = (settings.waterCount || settings.waterCountLast) as 1 | 2 | 3 | 4;
                              update(v ? { waterCount: remembered } : { waterCount: 0, waterCountLast: remembered });
                            }}
                          />
                        </View>
                        {settings.waterCount > 0 && (
                          <View style={{ marginTop: 10 }}>
                            <PillRow
                              theme={theme}
                              options={[{ value: 1 as const, label: '1' }, { value: 2 as const, label: '2' }, { value: 3 as const, label: '3' }, { value: 4 as const, label: '4' }]}
                              value={settings.waterCount}
                              // Safe cast: the options above only offer 1-4, but the generic picks up
                              // waterCount's wider 0-4 type from the `value` prop.
                              onSelect={v => update({ waterCount: v, waterCountLast: v as 1 | 2 | 3 | 4 })}
                            />
                          </View>
                        )}
                      </View>
                    }
                  />

                  <View style={{ height: 1, backgroundColor: theme.borderInput, marginVertical: 12 }} />
                  <CategoryRow
                    theme={theme} settings={settings}
                    title="Fitness"
                    sub="Activity and weight log."
                    categoryOn={settings.categoryFitness}
                    expanded={openCategory === 'fitness'}
                    onToggleExpand={() => toggleCategory('fitness')}
                    onSetCategory={v => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setCategory('categoryFitness', FITNESS_KIDS, v); }}
                    onSetChild={(k, v) => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setChild('categoryFitness', FITNESS_KIDS, k, v); }}
                    children={FITNESS_KIDS}
                  />

                  <View style={{ height: 1, backgroundColor: theme.borderInput, marginVertical: 12 }} />
                  {/* Greyed rather than hidden for Not Right Now, so it stays discoverable if they
                      change their Faith Journey later. */}
                  <CategoryRow
                    theme={theme} settings={settings}
                    title="Faith"
                    sub={nrn ? 'Turned off while your Faith Journey is set to Not Right Now.' : 'Verse, reading, gratitude and prayer.'}
                    categoryOn={settings.categoryFaith && !nrn}
                    disabled={nrn}
                    expanded={openCategory === 'faith'}
                    onToggleExpand={() => toggleCategory('faith')}
                    onSetCategory={v => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setCategory('categoryFaith', FAITH_KIDS, v); }}
                    onSetChild={(k, v) => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setChild('categoryFaith', FAITH_KIDS, k, v); }}
                    children={FAITH_KIDS}
                  />
                  </View>

                  <View style={{ height: 1, backgroundColor: theme.borderInput, marginVertical: 12 }} />
                  {/* The exemption is said in the row's own description rather than by a chip or a
                      separate card. A two-word badge ("No limit") reads like UNLIMITED notifications,
                      which is the opposite of what it means. */}
                  <View ref={tutBypassRef as any} collapsable={false}>
                  <SwitchRow
                    theme={theme}
                    title="Streak Protection"
                    sub="Fires when a streak is at risk tonight. Sent even if you've hit your daily limit."
                    value={settings.streakProtection}
                    onChange={v => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); update({ streakProtection: v }); }}
                  />
                  {/* Timing sits WITH its switch, not stranded in a card at the bottom of the page. */}
                  {settings.streakProtection && (
                    <View style={{ marginTop: 12, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: theme.borderInput }}>
                      <Text style={{ fontSize: 12, fontFamily: Type.ui, color: theme.textMuted, marginBottom: 6 }}>
                        How long before bedtime
                      </Text>
                      <PillRow
                        theme={theme}
                        options={[{ value: 30 as const, label: '30 min' }, { value: 45 as const, label: '45 min' }, { value: 60 as const, label: '60 min' }]}
                        value={settings.streakOffsetMins}
                        onSelect={v => update({ streakOffsetMins: v })}
                      />
                      {/* Grey, not accent. This is a statement of fact, not something you can act on. */}
                      <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui, marginTop: 8, lineHeight: 17 }}>
                        {avgBedtime ? `Before your average bedtime of ${avgBedtime}` : 'Not enough sleep data yet (needs 3+ nights). Defaults to 9:00 PM.'}
                      </Text>
                    </View>
                  )}
                  <View style={{ height: 1, backgroundColor: theme.borderInput, marginVertical: 12 }} />
                  <SwitchRow
                    theme={theme}
                    title="Summaries"
                    sub="Your weekly and monthly reports. Sent even if you've hit your daily limit."
                    value={settings.categorySummaries}
                    onChange={v => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); update({ categorySummaries: v }); }}
                  />
                  </View>
                </Card>

                {/* ── 3. Timing ── keeps no eyebrow either; each control names itself. */}
                <View ref={tutTimingRef as any} collapsable={false}>
                <Card theme={theme}>
                  <Heading title="Activity Reminder" theme={theme} />
                  <SubLabel theme={theme}>Fires if there's no workout and steps are below 75% of your goal.</SubLabel>
                  <View style={{ flexDirection: 'row' }}>
                    <TimeRow theme={theme} value={formatNotifTime(settings.activityTime)} onPress={() => openPicker('activityTime', settings.activityTime)} />
                    <View style={{ flex: 1 }} />
                  </View>

                  <View style={{ height: 1, backgroundColor: theme.borderInput, marginVertical: 14 }} />
                  <Heading title="Weight Log" theme={theme} />
                  <SubLabel theme={theme}>How often to remind you to weigh in.</SubLabel>
                  <PillRow
                    theme={theme}
                    options={[
                      { value: 'daily' as const, label: 'Daily' },
                      { value: '3day' as const, label: 'Every 3 Days' },
                      { value: 'weekly' as const, label: 'Weekly' },
                    ]}
                    value={settings.weightFrequency}
                    onSelect={v => update({ weightFrequency: v })}
                  />

                  {faithJourney === 'rooted' && (
                    <>
                      <View style={{ height: 1, backgroundColor: theme.borderInput, marginVertical: 14 }} />
                      <Heading title="Prayer Check-In" theme={theme} />
                      <SubLabel theme={theme}>Fires if no prayer is logged that day.</SubLabel>
                      <View style={{ flexDirection: 'row' }}>
                        <TimeRow theme={theme} value={formatNotifTime(settings.prayerTime)} onPress={() => openPicker('prayerTime', settings.prayerTime)} />
                        <View style={{ flex: 1 }} />
                      </View>
                    </>
                  )}

                  <View style={{ height: 1, backgroundColor: theme.borderInput, marginVertical: 14 }} />
                  <Heading title="Fasting Window" theme={theme} />
                  <SubLabel theme={theme}>How long before your eating window closes.</SubLabel>
                  <PillRow
                    theme={theme}
                    options={[{ value: 15 as const, label: '15 min' }, { value: 30 as const, label: '30 min' }, { value: 60 as const, label: '60 min' }]}
                    value={settings.ifLeadMins}
                    onSelect={v => update({ ifLeadMins: v })}
                  />
                </Card>
                </View>
              </>
            )}

            {/* textMuted, not textDim: this sat washed out at the bottom of a light page. */}
            <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui, textAlign: 'center', marginTop: 4, lineHeight: 17 }}>
              Some messages, like the ones welcoming you back after a break, always come through.
            </Text>
          </>
        )}
      </ScrollView>

      {/* Time picker -- centred card, not the slide-up sheet Settings uses. */}
      <Modal visible={activePicker !== null} transparent animationType="none" onRequestClose={closePicker}
        onShow={() => { pickerAnim.setValue(0); Animated.spring(pickerAnim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 260 }).start(); }}>
        <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.overlayBg, opacity: pickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }) }]} pointerEvents="none" />
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closePicker} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">
          <Animated.View style={{
            width: '88%', backgroundColor: theme.bgSheet, borderRadius: 16, overflow: 'hidden',
            borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: theme.accentBlue,
            transform: [{ scale: pickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
          }}>
            <ModalHeader title="Set Time" onClose={closePicker} />
            <View style={{ alignItems: 'center' }}>
              <DateTimePicker
                mode="time"
                value={pickerValue}
                display="spinner"
                textColor={theme.textPrimary}
                style={{ width: Dimensions.get('window').width * 0.88 - 32 }}
                onChange={(_e, date) => { if (date) setPickerValue(date); }}
              />
            </View>
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 }}>
              <PrimaryCTA label="Done" onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); confirmPicker(); }} faceStyle={{ paddingVertical: 12, borderRadius: 8 }} />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}
