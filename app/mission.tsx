import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

type MissionCard = {
  icon: string;
  label: string;
  headline: string;
  body: string;
};

const CARDS: MissionCard[] = [
  {
    icon: 'compass',
    label: 'THE FOUNDATION',
    headline: 'This app was built for the whole person.',
    body: "Your calories, your sleep, your faith, your journal. They're connected. Most apps pick one lane and go deep. This one was built from the start to hold all of it together, because taking care of your body doesn't happen in a vacuum.",
  },
  {
    icon: 'trophy',
    label: 'PHILOSOPHY',
    headline: 'Did you get better yesterday?',
    body: "That's the whole question. Not whether you hit some goal you set at signup, not whether you're ahead of a projection. Just: are you moving in the right direction compared to where you were 24 hours ago? Most apps make you feel like you're failing a test somebody else wrote. This one keeps score against the only person that actually matters.",
  },
  {
    icon: 'stats-chart',
    label: 'ACCURACY',
    headline: 'The number you see is actually accurate.',
    body: "Apple Watch overestimates active calories. Most apps trust that number anyway, and then you wonder why nothing adds up. There's an adjustment in Settings that lets you dial it back to something real. On top of that, instead of locking in your calorie target once at 6am, your resting burn gets subtracted as the day goes on. Small changes. Real difference.",
  },
  {
    icon: 'options',
    label: 'PERSONALIZATION',
    headline: 'The app adapts to you.',
    body: "Three coaching modes, built from scratch. Discipline is direct and pulls no punches. Mindful removes judgment language entirely and treats your data as information, not a score. Balanced sits in the middle. It's not just a label change. What's shown, what's hidden, how things are worded, all of it changes. Because one tone of voice doesn't fit every person or every season.",
  },
  {
    icon: 'heart',
    label: 'IDENTITY',
    headline: 'Faith is in the foundation.',
    body: "Not in a corner. Not a mindfulness section added to check a box. The faith features are woven through the whole app: daily scripture, a journal built for reflection, a gratitude streak, a Bible reader. If you want all of it, it's there. If you're still figuring it out, set your Faith Journey in settings and let us meet you there. We just weren't going to pretend that taking care of your body has nothing to do with the rest of who you are.",
  },
];

export default function MissionScreen() {
  const insets = useSafeAreaInsets();
  const { theme: t } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: t.bgPrimary }}>

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={t.accentBlueRaw} />
          <Text style={[styles.backText, { color: t.accentBlueRaw }]}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: t.accentBlueRaw }]}>OUR MISSION</Text>
        </View>

        {CARDS.map((card, i) => (
          <View
            key={i}
            style={[
              styles.card,
              {
                backgroundColor: t.bgCard,
                borderColor: t.borderCard,
                borderTopColor: t.accentBlueRaw,
                shadowColor: '#000',
              },
            ]}
          >
            <View style={styles.iconRow}>
              <View style={[styles.iconCircle, { backgroundColor: t.accentBlueBg, borderColor: t.accentBlueBorder }]}>
                <Ionicons name={card.icon as any} size={18} color={t.accentBlueRaw} />
              </View>
              <Text style={[styles.cardLabel, { color: t.textMuted }]}>{card.label}</Text>
            </View>
            <Text style={[styles.cardHeadline, { color: t.accentBlueRaw }]}>{card.headline}</Text>
            <Text style={[styles.cardBody, { color: t.textSecondary }]}>{card.body}</Text>
          </View>
        ))}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  hero: {
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  heroTitle: {
    fontSize: 48,
    fontFamily: 'BebasNeue_400Regular',
    letterSpacing: 3,
    lineHeight: 52,
  },
  card: {
    borderRadius: 14,
    borderWidth: 0.5,
    borderTopWidth: 1.5,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 9,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  cardHeadline: {
    fontSize: 22,
    fontFamily: 'BebasNeue_400Regular',
    letterSpacing: 1,
    lineHeight: 26,
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 22,
  },
});
