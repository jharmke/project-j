import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOOLTIP_REGISTRY, TooltipDefinition } from '../tooltipRegistry';
import { useTheme } from '../theme';

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
          <Text style={{ fontSize: 9, letterSpacing: 2, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', color: theme.accentBlue, marginBottom: 4 }}>
            {def.category}
          </Text>
          <Text style={{ fontSize: 15, fontFamily: 'DMSans_600SemiBold', color: theme.textPrimary }}>
            {def.title}
          </Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textMuted} />
      </View>

      {expanded && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textSecondary, lineHeight: 20 }}>
            {def.body}
          </Text>

          {def.definitions && def.definitions.length > 0 && (
            <View style={{ marginTop: 12, gap: 10 }}>
              {def.definitions.map(d => (
                <View key={d.term}>
                  <Text style={{ fontSize: 12, fontFamily: 'DMSans_700Bold', color: theme.textPrimary, marginBottom: 2 }}>
                    {d.term}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textSecondary, lineHeight: 18 }}>
                    {d.explanation}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {def.example && (
            <View style={{ marginTop: 12, backgroundColor: theme.bgInset, borderRadius: 8, padding: 12 }}>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                {def.example.label}
              </Text>
              {def.example.lines.map((line, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textSecondary, flex: 1 }}>{line.desc}</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: theme.textPrimary }}>{line.value}</Text>
                </View>
              ))}
              <View style={{ height: 1, backgroundColor: theme.borderCard, marginVertical: 6 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary }}>{def.example.result.desc}</Text>
                <Text style={{ fontSize: 12, fontFamily: 'DMSans_700Bold', color: theme.accentBlue }}>{def.example.result.value}</Text>
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
    <View style={{ flex: 1, backgroundColor: theme.bgBase }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: theme.bgBase }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 8 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 12, padding: 4, minWidth: 44, minHeight: 44, justifyContent: 'center' }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontFamily: 'DMSans_700Bold', color: theme.textPrimary, flex: 1 }}>
            Definitions
          </Text>
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
                  <Text style={{ fontSize: 12, fontFamily: active ? 'DMSans_700Bold' : 'DMSans_400Regular', color: active ? '#ffffff' : theme.textMuted }}>
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
