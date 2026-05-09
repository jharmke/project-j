import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
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
    <View style={{ flex: 1, backgroundColor: '#0d0d0f', paddingTop: insets.top }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={22} color="#3b82f6" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>PROJECT J</Text>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Feedback</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Haptic Feedback</Text>
              <Text style={styles.rowSub}>Vibration on button press</Text>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={toggleHaptics}
              trackColor={{ false: '#2a2a3a', true: 'rgba(59,130,246,0.5)' }}
              thumbColor={hapticsEnabled ? '#3b82f6' : '#666680'}
            />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)', marginBottom: 0 },
  headerLabel: { fontSize: 9, letterSpacing: 2, color: '#666680', textTransform: 'uppercase', marginBottom: 2, fontFamily: 'DMSans_700Bold' },
  headerTitle: { fontSize: 32, color: '#e8e8f0', fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  content: { padding: 16, paddingBottom: 80 },
  section: { backgroundColor: '#1a1a24', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.1)', borderTopWidth: 0.5, borderRadius: 14, marginBottom: 12, overflow: 'hidden' },
  sectionLabel: { fontSize: 9, letterSpacing: 3, color: '#666680', textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.04)' },
  rowTitle: { fontSize: 14, color: '#e8e8f0', fontFamily: 'DMSans_500Medium', marginBottom: 2 },
  rowSub: { fontSize: 11, color: '#666680', fontFamily: 'DMSans_400Regular' },
});