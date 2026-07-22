import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme';
import { Type } from '../typography';

interface UnitPickerButtonProps {
  value: string;
  options: string[];
  onChange: (unit: string) => void;
  minWidth?: number;
}

// Small in-app dropdown matching the app's own themed pill/card style, instead of the native
// iOS action sheet -- that broke visual consistency (plain system styling, no theme, looks like
// a jarring OS element dropped into custom UI). Used anywhere a compact unit choice sits next to
// a text field (primary Serving amount, Additional Servings rows).
export default function UnitPickerButton({ value, options, onChange, minWidth = 48 }: UnitPickerButtonProps) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View>
      <TouchableOpacity
        onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setOpen(true); }}
        style={{ minWidth, height: 36, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 2, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, paddingHorizontal: 8 }}
      >
        <Text style={{ fontSize: 13, fontFamily: Type.uiSemibold, color: theme.textMuted }}>{value}</Text>
        <Ionicons name="chevron-down" size={10} color={theme.textDim} />
      </TouchableOpacity>

      {open && (
        <>
          <TouchableOpacity
            style={{ position: 'absolute', top: -1000, left: -1000, right: -1000, bottom: -1000, zIndex: 1 }}
            activeOpacity={1}
            onPress={() => setOpen(false)}
          />
          <View style={{
            position: 'absolute', top: 40, right: 0, zIndex: 2, minWidth: 90,
            backgroundColor: theme.bgSheet, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 10,
            paddingVertical: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
          }}>
            {options.map(u => (
              <TouchableOpacity
                key={u}
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); onChange(u); setOpen(false); }}
                style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: u === value ? theme.accentBlueBg : 'transparent' }}
              >
                <Text style={{ fontSize: 13, fontFamily: Type.uiSemibold, color: u === value ? theme.accentBlue : theme.textMuted }}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
