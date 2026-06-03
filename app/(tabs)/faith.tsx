import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FaithIconFish from '../../components/FaithIconFish';
import HeaderAvatar from '../../components/HeaderAvatar';
import CompanionFAB from '../../components/CompanionFAB';
import CompanionChat from '../../components/CompanionChat';
import { useTheme } from '../../theme';

/**
 * Faith tab: Hub scaffold ONLY. This thread builds the structure (the tab, the
 * route, the tier-aware bar swap). The real Hub (verse hero, devotional plans,
 * the scripture companion, and the layered atmosphere) is the dedicated AI /
 * content thread. Intentionally minimal so it is cheap to replace; do not
 * gold-plate this placeholder.
 */
export default function FaithScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [chatOpen, setChatOpen] = useState(false);
  const now = new Date();

  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={{ flex: 1, paddingTop: insets.top }}>
      <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <HeaderAvatar />
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.accentBlueRaw }]}>Faith</Text>
            <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', marginTop: 1, letterSpacing: 2, textTransform: 'uppercase' }}>
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <FaithIconFish size={48} color={theme.textDim} />
        <Text style={{ fontSize: 16, color: theme.textSecondary, fontFamily: 'DMSans_600SemiBold', marginTop: 18, textAlign: 'center' }}>
          Your faith space
        </Text>
        <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 6, textAlign: 'center', lineHeight: 18 }}>
          Verses, devotionals, and a scripture companion are on the way.
        </Text>
      </View>

      <CompanionFAB onPress={() => setChatOpen(true)} />
      <CompanionChat visible={chatOpen} onClose={() => setChatOpen(false)} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, marginBottom: 16 },
  headerTitle: { fontSize: 32, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
});
