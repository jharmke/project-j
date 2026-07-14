import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOOLTIP_REGISTRY, TooltipDefinition } from '../tooltipRegistry';
import { useTheme } from '../theme';
import { Type } from '../typography';

const CATEGORIES = ['All', 'Nutrition', 'Fitness', 'Sleep & Recovery', 'Faith', 'Reports', 'Habits'] as const;

function DefinitionCard({ def, theme }: { def: TooltipDefinition; theme: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      onPress={() => setExpanded(e => !e)}
      activeOpacity={0.8}
      style={{
        backgroundColor: theme.bgCard,
        borderWidth: 0.5,
        borderColor: theme.borderCard,
        borderTopColor: theme.borderCardTop,
        borderRadius: 14,
        marginBottom: 10,
        overflow: 'hidden',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: expanded ? 8 : 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 9, letterSpacing: 2, fontFamily: Type.uiBold, textTransform: 'uppercase', color: theme.accentBlue, marginBottom: 4 }}>
            {def.category}
          </Text>
          <Text style={{ fontSize: 15, fontFamily: Type.uiSemibold, color: theme.textPrimary }}>
            {def.title}
          </Text>
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
      {/* Header */}
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: theme.bgPrimary }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 8 }}>
          <TouchableOpacity
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color={theme.accentBlue} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            {/* NO EYEBROWS OVER TITLES. */}
            <Text style={{ fontSize: 22, fontFamily: Type.display, color: theme.accentBlueRaw, letterSpacing: 0.3 }}>
              Definitions
            </Text>
          </View>
        </View>

        {/* Category filter */}
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
                    backgroundColor: active ? theme.accentBlue : theme.bgCard,
                    borderWidth: 0.5,
                    borderColor: active ? theme.accentBlue : theme.borderCard,
                    minHeight: 34,
                    justifyContent: 'center',
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 12, fontFamily: active ? Type.uiBold : Type.ui, color: active ? '#ffffff' : theme.textMuted }}>
                    {cat}
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
        {filtered.map(def => (
          <DefinitionCard key={def.key} def={def} theme={theme} />
        ))}
      </ScrollView>
    </View>
  );
}
