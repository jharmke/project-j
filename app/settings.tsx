import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME_ORDER, ThemeId, THEMES, useTheme } from '../theme';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, themeId, setTheme } = useTheme();
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem('pj_settings');
        if (saved) {
          const data = JSON.parse(saved);
          if (data.hapticsEnabled !== undefined) setHapticsEnabled(data.hapticsEnabled);
        }
      } catch (e) {}
    };
    load();
  }, []);

  const saveSetting = async (key: string, value: any) => {
    try {
      const saved = await AsyncStorage.getItem('pj_settings');
      const current = saved ? JSON.parse(saved) : {};
      await AsyncStorage.setItem('pj_settings', JSON.stringify({ ...current, [key]: value }));
    } catch (e) {}
  };

  const toggleHaptics = (val: boolean) => {
    setHapticsEnabled(val);
    saveSetting('hapticsEnabled', val);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary, paddingTop: insets.top }}>
      <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={22} color={theme.accentBlue} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerLabel, { color: theme.textMuted }]}>PROJECT J</Text>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Settings</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* ── Theme Selector ── */}
        <View style={[styles.section, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Appearance</Text>
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
            {THEME_ORDER.map((id: ThemeId) => {
              const t = THEMES[id];
              const isActive = themeId === id;
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => !t.paid && setTheme(id)}
                  activeOpacity={t.paid ? 1 : 0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: t.bgCard,
                    borderWidth: isActive ? 1.5 : 1,
                    borderColor: isActive ? t.accentBlue : t.borderCard,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    opacity: 1,
                  }}>
                  {/* Name in theme's own text color */}
                  <Text style={{ flex: 1, fontSize: 14, color: t.textPrimary, fontFamily: 'DMSans_600SemiBold' }}>
                    {t.name}
                  </Text>
                  {/* Badges */}
                  {t.paid && (
                    <View style={{ backgroundColor: `${t.accentAmber}33`, borderWidth: 1, borderColor: `${t.accentAmber}66`, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginRight: 8 }}>
                      <Text style={{ fontSize: 9, color: t.accentAmber, fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>PRO</Text>
                    </View>
                  )}
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={18} color={t.accentBlue} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Feedback ── */}
        <View style={[styles.section, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Feedback</Text>
          <View style={[styles.row, { borderTopColor: theme.borderSubtle }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Haptic Feedback</Text>
              <Text style={[styles.rowSub, { color: theme.textMuted }]}>Vibration on button press</Text>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={toggleHaptics}
              trackColor={{ false: theme.bgProgressTrack, true: theme.accentBlueBg }}
              thumbColor={hapticsEnabled ? theme.accentBlue : theme.textMuted}
            />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, marginBottom: 0 },
  headerLabel:  { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2, fontFamily: 'DMSans_700Bold' },
  headerTitle:  { fontSize: 32, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  content:      { padding: 16, paddingBottom: 80 },
  section:      { borderWidth: 0.5, borderTopWidth: 0.5, borderRadius: 14, marginBottom: 12, overflow: 'hidden' },
  sectionLabel: { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 0.5 },
  rowTitle:     { fontSize: 14, fontFamily: 'DMSans_500Medium', marginBottom: 2 },
  rowSub:       { fontSize: 11, fontFamily: 'DMSans_400Regular' },
});