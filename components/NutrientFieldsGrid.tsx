import { Ionicons } from '@/components/AppIcons';
import { Text, TextInput } from '@/components/AppText';
import { triggerHaptic } from '@/utils/haptics';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme';
import { Type } from '../typography';
import { DV_REFERENCE, amountToPercentDV, percentDVToAmount } from '../utils/nutrientDV';

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

// Exported so the label-scan review card animates its sections identically (measured height, never
// maxHeight) instead of growing a second implementation of the same thing.
export function CollapsibleBody({ open, children }: { open: boolean; children: React.ReactNode }) {
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

  // Measured IN PLACE, not from a hidden off-screen copy. Off-screen there is no width to lay out
  // against, so percentage-width cells resolve differently there than they do on screen and the
  // height came back short -- the last row of a section was being clipped (Potassium, Vitamin K),
  // which only became visible once the rows grew taller. Measuring the real thing also means the
  // height re-corrects itself whenever the content changes, instead of being captured once forever.
  return (
    <Animated.View
      style={{
        height: measuredHeight === null
          ? (open ? undefined : 0)
          : heightAnim.interpolate({ inputRange: [0, 1], outputRange: [0, measuredHeight] }),
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{ opacity: opacityAnim }}
        onLayout={e => {
          const h = e.nativeEvent.layout.height;
          // Tolerance so sub-pixel layout jitter can't ping-pong this into a re-render loop.
          if (h > 0 && (measuredHeight === null || Math.abs(h - measuredHeight) > 0.5)) setMeasuredHeight(h);
        }}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

export default function NutrientFieldsGrid({ sections }: { sections: NutrientSection[] }) {
  const { theme } = useTheme();
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map(s => [s.key, true]))
  );
  // Live %DV companion. Plenty of labels -- supplements especially -- print ONLY a percentage for a
  // vitamin and never the mg/mcg, which left no way to record it by hand. The AMOUNT is still the
  // only thing stored; the percent is entry convenience, computed against the fixed FDA table that
  // the label scanner also reads, so the two can never disagree.
  //
  // Only offered in 2-column sections: a 3-column cell has no room for a second box, and the
  // 3-column section is Macros, which every label prints in grams anyway.
  //
  // pctDraft holds the raw text of the percent box while it's being typed. Without it the box would
  // fight the typist: each keystroke recomputes the amount, which recomputes the percent, which
  // overwrites what they were half-way through typing.
  const [pctDraft, setPctDraft] = useState<{ key: string; text: string } | null>(null);

  return (
    <>
      {sections.map(section => {
        const collapsible = section.collapsible !== false;
        const isOpen = collapsible ? openMap[section.key] !== false : true;
        const fieldWidth = section.columns === 3 ? '31%' : '47%';

        const grid = (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {section.fields.map(f => {
              const showPercent = section.columns !== 3 && !!DV_REFERENCE[f.key];
              const amount = parseFloat(f.value);
              const derivedPercent = !isNaN(amount) ? amountToPercentDV(f.key, amount) : null;
              const percentText = pctDraft?.key === f.key
                ? pctDraft.text
                : (derivedPercent !== null ? String(derivedPercent) : '');
              // Amount and percent live in ONE bordered box split by a hairline, not two separate
              // boxes: they're two views of a single nutrient, and six outlines across a two-field
              // row read as clutter. Mirrors the merged amount + unit control on the logging screen.
              const fieldText = {
                color: theme.textPrimary,
                paddingHorizontal: 10,
                paddingVertical: 8,
                fontSize: 15,
                fontFamily: Type.num,
                minHeight: 40,
              };
              return (
                <View key={f.key} style={{ width: fieldWidth }}>
                  <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: Type.uiMedium, marginBottom: 5 }}>
                    {f.dotColor && <Text style={{ color: f.dotColor }}>{'●'} </Text>}
                    {f.label}{' '}
                    <Text style={{ color: theme.textDim }}>{f.unit}</Text>
                  </Text>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: theme.bgInput,
                    borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8,
                    overflow: 'hidden',
                  }}>
                    <TextInput
                      style={[fieldText, { flex: 1 }]}
                      value={f.value}
                      onChangeText={t => { setPctDraft(null); f.onChange(t); }}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={theme.textDim}
                      selectTextOnFocus
                    />
                    {showPercent && (
                      <>
                        <View style={{ width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 8, backgroundColor: theme.borderInput }} />
                        <TextInput
                          style={[fieldText, { width: 44, paddingHorizontal: 6, textAlign: 'right' }]}
                          value={percentText}
                          onChangeText={t => {
                            const clean = t.replace(/[^0-9.]/g, '');
                            setPctDraft({ key: f.key, text: clean });
                            const pct = parseFloat(clean);
                            if (clean === '') { f.onChange(''); return; }
                            const next = percentDVToAmount(f.key, pct);
                            if (next !== null) f.onChange(String(next));
                          }}
                          onBlur={() => setPctDraft(null)}
                          keyboardType="decimal-pad"
                          placeholder="0"
                          placeholderTextColor={theme.textDim}
                          selectTextOnFocus
                        />
                        <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: Type.ui, paddingRight: 8 }}>%</Text>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
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
