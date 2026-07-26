import { Ionicons } from '@/components/AppIcons';
import { Text } from '@/components/AppText';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOOLTIP_REGISTRY, TooltipDefinition } from '../tooltipRegistry';
import { useTheme } from '../theme';
import { Type } from '../typography';
import ScreenHeader from '../components/ScreenHeader';
import BackgroundLayers from '../components/BackgroundLayers';
import GradientNumber from '../components/GradientNumber';
import ButtonShine from '../components/ButtonShine';

// Hard-coded so the pill ORDER is deliberate rather than whatever order entries happen to be written
// in. That means a new category in tooltipRegistry.ts must be added HERE too, or its entries render
// only under "All" and the filter silently never appears. 'App' is last: it covers how GoodForge
// itself behaves (text size, and the accessibility explainers to come) rather than a health domain.
const CATEGORIES = ['All', 'Nutrition', 'Fitness', 'Sleep & Recovery', 'Faith', 'Reports', 'Habits', 'App'] as const;

function DefinitionCard({ def, theme }: { def: TooltipDefinition; theme: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    // Shadow on a wrapper: the card clips (overflow keeps the expanded body inside its rounded corners) and
    // a view that clips cannot cast a shadow -- iOS masksToBounds eats it.
    <View style={{ borderRadius: 14, marginBottom: 10, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 }}>
    <TouchableOpacity
      onPress={() => setExpanded(e => !e)}
      activeOpacity={0.8}
      style={{
        backgroundColor: theme.bgCard,
        borderWidth: 0.5,
        borderColor: theme.borderCard,
        borderTopColor: theme.borderCardTop,
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: expanded ? 8 : 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 9, letterSpacing: 2, fontFamily: Type.uiBold, textTransform: 'uppercase', color: theme.accentBlue, marginBottom: 4 }}>
            {def.category}
          </Text>
          <GradientNumber value={def.title} color={theme.textSecondary} style={{ fontSize: 15, fontFamily: Type.uiSemibold }} />
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textMuted} />
      </View>

      {expanded && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <Text style={{ fontSize: 13, fontFamily: Type.ui, color: theme.textSecondary, lineHeight: 20 }}>
            {def.body}
          </Text>

          {def.definitions && def.definitions.length > 0 && (
            <View style={{ marginTop: 12, gap: 10 }}>
              {def.definitions.map(d => (
                <View key={d.term}>
                  <Text style={{ fontSize: 12, fontFamily: Type.uiBold, color: theme.textPrimary, marginBottom: 2 }}>
                    {d.term}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: Type.ui, color: theme.textSecondary, lineHeight: 18 }}>
                    {d.explanation}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {def.example && (
            <View style={{ marginTop: 12, backgroundColor: theme.bgInset, borderRadius: 8, padding: 12 }}>
              <Text style={{ fontSize: 11, fontFamily: Type.uiBold, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                {def.example.label}
              </Text>
              {def.example.lines.map((line, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, fontFamily: Type.ui, color: theme.textSecondary, flex: 1 }}>{line.desc}</Text>
                  <Text style={{ fontSize: 12, fontFamily: Type.uiSemibold, color: theme.textPrimary }}>{line.value}</Text>
                </View>
              ))}
              <View style={{ height: 1, backgroundColor: theme.borderCard, marginVertical: 6 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, fontFamily: Type.uiSemibold, color: theme.textSecondary }}>{def.example.result.desc}</Text>
                <Text style={{ fontSize: 12, fontFamily: Type.uiBold, color: theme.accentBlue }}>{def.example.result.value}</Text>
              </View>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
    </View>
  );
}

export default function DefinitionsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filtered = selectedCategory === 'All'
    ? TOOLTIP_REGISTRY
    : TOOLTIP_REGISTRY.filter(d => d.category === selectedCategory);

  const availableCategories = CATEGORIES.filter(c =>
    c === 'All' || TOOLTIP_REGISTRY.some(d => d.category === c)
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      <BackgroundLayers />
      {/* Header */}
      {/* The category pills ride in the header's subRow -- they belong to the header, not the list. */}
      <ScreenHeader title="Definitions" subRow={
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {availableCategories.map(cat => {
              const active = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: active ? theme.accentBlueBgOpaque : theme.bgCard,
                    borderWidth: active ? 1 : 0.5,
                    borderColor: active ? theme.accentBlueBorder : theme.borderCard,
                    minHeight: 34,
                    justifyContent: 'center',
                  }}
                  activeOpacity={0.7}
                >
                  {active && <ButtonShine radius={20} />}
                  <Text style={{ fontSize: 12, fontFamily: active ? Type.uiSemibold : Type.ui, color: active ? theme.accentBlue : theme.textMuted }}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      } />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {filtered.map(def => (
          <DefinitionCard key={def.key} def={def} theme={theme} />
        ))}
      </ScrollView>
    </View>
  );
}
