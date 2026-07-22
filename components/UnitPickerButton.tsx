import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme';
import { Type } from '../typography';
import { unitGroup, unitLabel } from '../utils/unitConversion';

interface UnitPickerButtonProps {
  value: string;
  options: string[];
  onChange: (unit: string) => void;
  minWidth?: number;
  // embedded: drop the button's own background/border so it can sit INSIDE another bordered
  // container (e.g. merged with an amount field) and read as one unified control.
  embedded?: boolean;
  // twoColumn: lay the menu out as Weight | Volume columns instead of one tall list. Used where both
  // families are offered at once (Create/Edit primary Amount) so 10 units read as ~6 compact rows.
  twoColumn?: boolean;
}

// Layout constants used to decide whether the menu fits below the button.
const ROW_HEIGHT = 36;          // approx height of one option row (paddingVertical 8 + text)
const MENU_VPAD = 8;            // container paddingVertical, top + bottom
const BUTTON_GAP = 40;          // button height (36) + 4px gap between button and menu
const SAFE_BOTTOM_INSET = 175;  // clears the home indicator AND any floating bottom bar (e.g. the Cancel/Save Food bar)

// Small in-app dropdown matching the app's own themed pill/card style, instead of the native
// iOS action sheet -- that broke visual consistency (plain system styling, no theme, looks like
// a jarring OS element dropped into custom UI). Used anywhere a compact unit choice sits next to
// a text field (primary Serving amount, Additional Servings rows).
//
// Opens downward by default, but measures its own on-screen position (measureInWindow, so it works
// identically inside a screen, a tab, or a Modal) and flips to open UPWARD when there isn't enough
// room below. Single-column options cascade in; two-column mode fades/scales the whole panel in.
export default function UnitPickerButton({ value, options, onChange, minWidth = 48, embedded = false, twoColumn = false }: UnitPickerButtonProps) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const wrapperRef = useRef<View>(null);

  // One animated driver per option (0 = hidden/offset, 1 = settled), rebuilt if the count changes.
  const itemAnims = useMemo(() => options.map(() => new Animated.Value(0)), [options.length]);
  const panelOpacity = useRef(new Animated.Value(0)).current;

  // Two-column mode splits the options into a Weight column and a Volume column.
  const weightUnits = useMemo(() => options.filter(u => unitGroup(u) === 'weight'), [options]);
  const volumeUnits = useMemo(() => options.filter(u => unitGroup(u) === 'volume'), [options]);
  const columns = [weightUnits, volumeUnits].filter(g => g.length > 0);

  const menuRows = twoColumn ? Math.max(1, ...columns.map(g => g.length)) : options.length;
  const menuHeight = menuRows * ROW_HEIGHT + MENU_VPAD + (twoColumn ? 24 : 0);

  const runCascade = (up: boolean) => {
    panelOpacity.setValue(0);
    itemAnims.forEach(a => a.setValue(0));
    // Panel fades in quickly (and, in two-column mode, is the whole animation).
    Animated.timing(panelOpacity, {
      toValue: 1, duration: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
    if (twoColumn) return;
    // Single column: cascade -- opening down runs top-to-bottom; up runs bottom-to-top.
    const order = up ? [...itemAnims].reverse() : itemAnims;
    Animated.stagger(
      30,
      order.map(a => Animated.timing(a, {
        toValue: 1, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }))
    ).start();
  };

  const handleOpen = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const node = wrapperRef.current;
    if (node) {
      node.measureInWindow((_x, y, _w, h) => {
        const screenH = Dimensions.get('window').height;
        const spaceBelow = screenH - (y + h) - SAFE_BOTTOM_INSET;
        const up = menuHeight > spaceBelow;
        setOpenUp(up);
        setOpen(true);
        runCascade(up);
      });
    } else {
      setOpenUp(false);
      setOpen(true);
      runCascade(false);
    }
  };

  const renderRow = (u: string) => (
    <TouchableOpacity
      key={u}
      onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); onChange(u); setOpen(false); }}
      style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: u === value ? theme.accentBlueBg : 'transparent' }}
    >
      <Text style={{ fontSize: 13, fontFamily: Type.uiSemibold, color: u === value ? theme.accentBlue : theme.textMuted }}>{unitLabel(u)}</Text>
    </TouchableOpacity>
  );

  return (
    <View ref={wrapperRef}>
      <TouchableOpacity
        onPress={handleOpen}
        style={{ minWidth, height: 36, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 2, paddingHorizontal: embedded ? 10 : 8, ...(embedded ? {} : { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8 }) }}
      >
        <Text style={{ fontSize: 13, fontFamily: Type.uiSemibold, color: theme.textMuted }}>{unitLabel(value)}</Text>
        <Ionicons name="chevron-down" size={10} color={theme.textDim} />
      </TouchableOpacity>

      {open && (
        <>
          <TouchableOpacity
            style={{ position: 'absolute', top: -1000, left: -1000, right: -1000, bottom: -1000, zIndex: 1 }}
            activeOpacity={1}
            onPress={() => setOpen(false)}
          />
          {twoColumn ? (
            <Animated.View style={{
              position: 'absolute', right: 0, zIndex: 2, flexDirection: 'row',
              ...(openUp ? { bottom: BUTTON_GAP } : { top: BUTTON_GAP }),
              opacity: panelOpacity,
              transform: [{ scale: panelOpacity.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
              backgroundColor: theme.bgSheet, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10,
              paddingVertical: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
            }}>
              {columns.map((group, gi) => (
                <View
                  key={gi}
                  style={{ minWidth: 78, ...(gi > 0 ? { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.borderCard } : {}) }}
                >
                  <Text style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: theme.textDim, fontFamily: Type.uiBold, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 6 }}>
                    {unitGroup(group[0]) === 'volume' ? 'Volume' : 'Weight'}
                  </Text>
                  {group.map(renderRow)}
                </View>
              ))}
            </Animated.View>
          ) : (
            <Animated.View style={{
              position: 'absolute', right: 0, zIndex: 2, minWidth: 90,
              ...(openUp ? { bottom: BUTTON_GAP } : { top: BUTTON_GAP }),
              opacity: panelOpacity,
              backgroundColor: theme.bgSheet, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10,
              paddingVertical: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
            }}>
              {options.map((u, i) => (
                <Animated.View
                  key={u}
                  style={{
                    opacity: itemAnims[i],
                    borderBottomWidth: i < options.length - 1 ? StyleSheet.hairlineWidth : 0,
                    borderBottomColor: theme.borderCard,
                    transform: [{
                      translateY: itemAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [openUp ? 6 : -6, 0],
                      }),
                    }],
                  }}
                >
                  {renderRow(u)}
                </Animated.View>
              ))}
            </Animated.View>
          )}
        </>
      )}
    </View>
  );
}
