import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_TUTORIALS, Tutorial, getTutorialById } from '../data/tutorials';
import { useTheme } from '../theme';
import { useTutorial } from '../context/TutorialContext';

const TAB_FILTERS = ['All', 'Home', 'Nutrition', 'Workout', 'Stats', 'Profile'] as const;
type TabFilter = typeof TAB_FILTERS[number];

const TAB_MAP: Record<TabFilter, string | null> = {
  All:       null,
  Home:      'home',
  Nutrition: 'log',
  Workout:   'workout',
  Stats:     'stats',
  Profile:   'profile',
};

function TutorialCard({ tutorial, theme, onStart }: { tutorial: Tutorial; theme: any; onStart: () => void }) {
  const stepCount = tutorial.steps.length;

  return (
    <TouchableOpacity
      onPress={onStart}
      activeOpacity={0.8}
      style={{
        backgroundColor: theme.bgCard,
        borderWidth: 0.5,
        borderColor: theme.borderCard,
        borderTopColor: theme.borderCardTop,
        borderRadius: 14,
        marginBottom: 10,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: theme.accentBlueBg,
        borderWidth: 1,
        borderColor: theme.accentBlueRaw + '33',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
        flexShrink: 0,
      }}>
        <Ionicons name="play" size={14} color={theme.accentBlueRaw} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 9, letterSpacing: 2, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', color: theme.accentBlue, marginBottom: 3 }}>
          {tutorial.tab === 'log' ? 'Nutrition' : tutorial.tab.charAt(0).toUpperCase() + tutorial.tab.slice(1)}
        </Text>
        <Text style={{ fontSize: 15, fontFamily: 'DMSans_600SemiBold', color: theme.textPrimary, marginBottom: 2 }}>
          {tutorial.name}
        </Text>
        <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textSecondary, lineHeight: 18 }}>
          {tutorial.description}
        </Text>
        <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginTop: 6 }}>
          {stepCount} {stepCount === 1 ? 'step' : 'steps'}
        </Text>
      </View>

    </TouchableOpacity>
  );
}

export default function TutorialsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { startTutorial } = useTutorial();
  const [selectedFilter, setSelectedFilter] = useState<TabFilter>('All');

  const allListed = Object.values(TAB_TUTORIALS).flat().map(id => getTutorialById(id)).filter(Boolean) as Tutorial[];
  const filtered = TAB_MAP[selectedFilter] === null
    ? allListed
    : allListed.filter(t => t.tab === TAB_MAP[selectedFilter]);

  const handleStart = (id: string) => {
    // Tours that navigate away (preAction pushes a page, e.g. Day Summary) carry
    // their own returnRoute ('back') so they pop that page instead of stacking a
    // fresh tutorials list on top of it. Others default back to the list.
    const ret = (getTutorialById(id) as any)?.returnRoute ?? '/tutorials';
    router.back();
    setTimeout(() => startTutorial(id, ret), 350);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: theme.bgPrimary }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 8 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color={theme.accentBlue} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, letterSpacing: 3, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', color: theme.textMuted, marginBottom: 2 }}>
              PROJECT J
            </Text>
            <Text style={{ fontSize: 22, fontFamily: 'BebasNeue_400Regular', color: theme.accentBlueRaw, letterSpacing: 1 }}>
              Guided Tutorials
            </Text>
          </View>
        </View>

        {/* Tab filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {TAB_FILTERS.map(filter => {
              const active = selectedFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setSelectedFilter(filter)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: active ? theme.accentBlue : theme.bgCard,
                    borderWidth: 0.5,
                    borderColor: active ? theme.accentBlue : theme.borderCard,
                    minHeight: 34,
                    justifyContent: 'center',
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 12, fontFamily: active ? 'DMSans_700Bold' : 'DMSans_400Regular', color: active ? '#ffffff' : theme.textMuted }}>
                    {filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 48, gap: 8 }}>
            <Ionicons name="play-circle-outline" size={40} color={theme.textMuted} />
            <Text style={{ fontSize: 16, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary }}>No tutorials here yet</Text>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textMuted, textAlign: 'center' }}>
              Tutorials for this section are coming soon.
            </Text>
          </View>
        ) : (
          filtered.map(t => (
            <TutorialCard
              key={t.id}
              tutorial={t}
              theme={theme}
              onStart={() => handleStart(t.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
