import { Ionicons } from '@expo/vector-icons';
import { triggerHaptic } from '@/utils/haptics';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Animated, Easing, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme';
import { Type } from '../typography';

export interface NutrientField {
  key: string;
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  dotColor?: string;
}

export interface NutrientSection {
  key: string;
  title: string;
  fields: NutrientField[];
  collapsible?: boolean;
  columns?: 2 | 3;
}

function CollapsibleBody({ open, children }: { open: boolean; children: React.ReactNode }) {
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const heightAnim = useRef(new Animated.Value(open ? 1 : 0)).current;
  const opacityAnim = useRef(new Animated.Value(open ? 1 : 0)).current;
  const prevOpen = useRef(open);

  if (prevOpen.current !== open && measuredHeight !== null) {
    prevOpen.current = open;
    Animated.timing(heightAnim, {
      toValue: open ? 1 : 0,
      duration: 240,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start();
    Animated.timing(opacityAnim, {
      toValue: open ? 1 : 0,
      duration: open ? 220 : 140,
      delay: open ? 60 : 0,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  return (
    <>
      {measuredHeight === null && (
        <View style={{ position: 'absolute', opacity: 0, left: -9999 }} pointerEvents="none">
          <View onLayout={e => setMeasuredHeight(e.nativeEvent.layout.height)}>{children}</View>
        </View>
      )}
      <Animated.View
        style={{
          height: measuredHeight === null ? undefined : heightAnim.interpolate({ inputRange: [0, 1], outputRange: [0, measuredHeight] }),
          overflow: 'hidden',
        }}
      >
        <Animated.View style={{ opacity: opacityAnim }}>{children}</Animated.View>
      </Animated.View>
    </>
  );
}

export default function NutrientFieldsGrid({ sections }: { sections: NutrientSection[] }) {
  const { theme } = useTheme();
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map(s => [s.key, true]))
  );

  return (
    <>
      {sections.map(section => {
        const collapsible = section.collapsible !== false;
        const isOpen = collapsible ? openMap[section.key] !== false : true;
        const fieldWidth = section.columns === 3 ? '31%' : '47%';

        const grid = (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {section.fields.map(f => (
              <View key={f.key} style={{ width: fieldWidth }}>
                <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: Type.uiMedium, marginBottom: 5 }}>
                  {f.dotColor && <Text style={{ color: f.dotColor }}>{'●'} </Text>}
                  {f.label}{' '}
                  <Text style={{ color: theme.textDim }}>{f.unit}</Text>
                </Text>
                <TextInput
                  style={{
                    backgroundColor: theme.bgInput,
                    borderWidth: 1,
                    borderColor: theme.borderInput,
                    borderRadius: 8,
                    color: theme.textPrimary,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 15,
                    fontFamily: Type.num,
                    minHeight: 40,
                  }}
                  value={f.value}
                  onChangeText={f.onChange}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={theme.textDim}
                  selectTextOnFocus
                />
              </View>
            ))}
          </View>
        );

        return (
          <View
            key={section.key}
            style={{ backgroundColor: theme.bgCard, borderRadius: 12, borderWidth: 0.5, borderColor: theme.borderCard, padding: 14, marginBottom: 10 }}
          >
            {collapsible ? (
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                  setOpenMap(p => ({ ...p, [section.key]: !isOpen }));
                }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}
              >
                <Text style={{ fontSize: 11, fontFamily: Type.uiBold, color: theme.textPrimary, letterSpacing: 2, textTransform: 'uppercase' }}>
                  {section.title}
                </Text>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={15} color={theme.textDim} />
              </TouchableOpacity>
            ) : (
              <Text style={{ fontSize: 11, fontFamily: Type.uiBold, color: theme.textPrimary, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
                {section.title}
              </Text>
            )}
            {collapsible ? <CollapsibleBody open={isOpen}>{grid}</CollapsibleBody> : grid}
          </View>
        );
      })}
    </>
  );
}
