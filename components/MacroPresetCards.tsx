// components/MacroPresetCards.tsx
//
// THE macro preset cards. Rendered by BOTH Home's Macros modal and Settings > Goals.
//
// ⚠️ WHY THIS EXISTS. The two screens had separately written copies of the same panel, and every one of them
// drifted: the macro colours landed in one, the highlight read a different source in each, the press
// animation existed in neither, and the save bar dimmed correctly in one and latched on in the other. Four
// bugs, all the same shape, all found by hand. Behaviour lives here now so a fix cannot land in one place
// and miss the other.
//
// ⚠️ WHAT IS DELIBERATELY STILL PER SCREEN. The card SIZE (Settings is a long scroll and uses a tighter
// card) and the icon/label TREATMENT (the modal draws them with the gradient icon and title, Settings uses
// plain ones). Those are passed in, so neither screen's look changed when this was extracted. Everything
// else -- which card is lit, what a tap does, the press feel, the colours on the numbers -- is shared.
//
// ⚠️ WHAT THIS DOES NOT OWN: saving. Settings saves the whole goals screen and writes to the cloud; the
// modal saves the macro block only. Two genuinely different transactions, so each screen keeps its own.
import type { ReactNode } from 'react';
import { useRef } from 'react';
import { Animated, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/AppText';
import { MACRO_PRESETS, type MacroPresetKey } from '../utils/macroPresets';

/**
 * One card, with the app's standard press feel: scale to 0.97 on press in, back to 1 on release, TIMING
 * not spring. ⚠️ NOT PressableButton -- that springs to 0.94 and reads bouncy, which is wrong for a card.
 *
 * ⚠️ THE WIDTH LIVES ON THE WRAPPER. The cards sit in a wrapping flex row, so a percentage width left on
 * the inner TouchableOpacity would let the animated wrapper size to its content and collapse the grid.
 */
function PressCard({ width, onPress, style, children }: {
  width: string; onPress: () => void; style: any; children: ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ width: width as any, transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => Animated.timing(scale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start()}
        onPressOut={() => Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }).start()}
        activeOpacity={0.85}
        style={[style, { width: '100%' }]}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export interface MacroPresetCardsProps {
  theme: any;
  /** Which card is lit. A preset key, `null` for Custom, or `undefined` for none.
   *  ⚠️ `null` IS A REAL VALUE HERE (it means a custom split), so callers must never use a truthy test. */
  selected: MacroPresetKey | null | undefined;
  /** The user's own saved split, or null. The Custom card renders only when one exists, so a preset-only
   *  user never sees a fifth card. */
  customSplit: { macroProteinPct?: any; macroCarbsPct?: any; macroFatPct?: any } | null | undefined;
  onPickPreset: (key: MacroPresetKey) => void;
  onPickCustom: () => void;
  /** Per screen: '47%' in the modal, '48%' in Settings. */
  width: string;
  /** Per screen: padding, radius and gap. Border and background are applied here from `selected`. */
  cardStyle: any;
  /** Per screen: the modal's numbers are 11pt, Settings' are 10pt. */
  valueFontSize: number;
  /** Per screen: the modal draws a gradient icon and title, Settings plain ones. Keeps both looks intact. */
  renderIcon: (name: any, active: boolean) => ReactNode;
  renderLabel: (label: string, active: boolean) => ReactNode;
  /** Background for an unselected card: the modal sits on glass, Settings on an input fill. */
  restBg: string;
  restBorder: string;
}

export default function MacroPresetCards({
  theme, selected, customSplit, onPickPreset, onPickCustom,
  width, cardStyle, valueFontSize, renderIcon, renderLabel, restBg, restBorder,
}: MacroPresetCardsProps) {
  // The values carry the macro colours, the separators stay dim. Coloured VALUES, not dots: five cards times
  // three dots is fifteen new elements in a small panel for nothing.
  const values = (p: any, c: any, f: any) => (
    <Text style={{ fontSize: valueFontSize, color: theme.textDim }}>
      <Text style={{ color: theme.macroProtein }}>{p}P</Text>
      {' · '}
      <Text style={{ color: theme.macroCarbs }}>{c}C</Text>
      {' · '}
      <Text style={{ color: theme.macroFat }}>{f}F</Text>
    </Text>
  );

  const skin = (active: boolean) => ({
    borderWidth: active ? 1.5 : 1,
    backgroundColor: active ? theme.accentBlueBg : restBg,
    borderColor: active ? theme.accentBlueBorder : restBorder,
  });

  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(Object.entries(MACRO_PRESETS) as [MacroPresetKey, typeof MACRO_PRESETS[MacroPresetKey]][]).map(([key, pr]) => {
          const active = selected === key;
          return (
            <PressCard key={key} width={width} onPress={() => onPickPreset(key)} style={[cardStyle, skin(active)]}>
              {renderIcon(pr.icon, active)}
              {renderLabel(pr.label, active)}
              {values(pr.p, pr.c, pr.f)}
            </PressCard>
          );
        })}
      </View>
      {/* Preset-sized and centred on its own row under the 2x2. Full width was proposed and rejected as far
          too big. Renders only for somebody who actually built a split. */}
      {customSplit && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
          <PressCard width={width} onPress={onPickCustom} style={[cardStyle, skin(selected === null)]}>
            {renderIcon('options', selected === null)}
            {renderLabel('Custom', selected === null)}
            {/* Percentages, always: neither panel has a grams view on these cards. A fixed-grams user still
                sees their split here because the app keeps both in sync, and tapping this restores their
                GRAMS and their mode, not these percentages. */}
            {values(customSplit.macroProteinPct, customSplit.macroCarbsPct, customSplit.macroFatPct)}
          </PressCard>
        </View>
      )}
    </>
  );
}
