import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TOOLTIP_REGISTRY, TooltipDefinition } from '../tooltipRegistry';
import { useTheme } from '../theme';
import { useTutorial } from '../context/TutorialContext';

interface Props {
  tooltipKey: string;
  visible: boolean;
  onClose: () => void;
  hideTour?: boolean;
}

export default function TooltipModal({ tooltipKey, visible, onClose, hideTour }: Props) {
  const { theme } = useTheme();
  const { startTutorial } = useTutorial();

  const overlayOpacity  = useRef(new Animated.Value(0)).current;
  const cardOpacity     = useRef(new Animated.Value(0)).current;
  const cardTranslateY  = useRef(new Animated.Value(16)).current;
  const contentOpacity  = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(10)).current;
  const buttonOpacity   = useRef(new Animated.Value(0)).current;
  const tourPulse       = useRef(new Animated.Value(0.6)).current;

  const def: TooltipDefinition | undefined = TOOLTIP_REGISTRY.find(t => t.key === tooltipKey);

  useEffect(() => {
    if (visible) {
      // Reset all values
      overlayOpacity.setValue(0);
      cardOpacity.setValue(0);
      cardTranslateY.setValue(16);
      contentOpacity.setValue(0);
      contentTranslateY.setValue(10);
      buttonOpacity.setValue(0);

      setTimeout(() => {
        Animated.sequence([
          // Overlay + card fade in together
          Animated.parallel([
            Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(cardOpacity,    { toValue: 1, duration: 220, useNativeDriver: true }),
            Animated.timing(cardTranslateY, { toValue: 0, duration: 220, useNativeDriver: true }),
          ]),
          // Small pause so card is visually settled before content appears
          Animated.delay(60),
          // Content staggered in after card lands
          Animated.parallel([
            Animated.timing(contentOpacity,    { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(contentTranslateY, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]),
          // Got it button last
          Animated.timing(buttonOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
        ]).start();

        // Breathing pulse on tour button
        if (def?.tutorialId && !hideTour) {
          Animated.loop(
            Animated.sequence([
              Animated.timing(tourPulse, { toValue: 1,   duration: 900, useNativeDriver: true }),
              Animated.timing(tourPulse, { toValue: 0.6, duration: 900, useNativeDriver: true }),
            ])
          ).start();
        }
      }, 50);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(cardOpacity,    { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(cardTranslateY, { toValue: 16, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      overlayOpacity.setValue(0);
      cardOpacity.setValue(0);
      cardTranslateY.setValue(16);
      contentOpacity.setValue(0);
      contentTranslateY.setValue(10);
      buttonOpacity.setValue(0);
      onClose();
    });
  };

  if (!def) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Overlay */}
      <Animated.View
        style={[styles.overlay, { opacity: overlayOpacity, backgroundColor: 'rgba(0,0,0,0.6)' }]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
      </Animated.View>

      {/* Card container */}
      <View style={styles.cardContainer} pointerEvents="box-none">
        <Animated.View style={[
          styles.card,
          {
            backgroundColor: theme.bgSheet,
            borderColor: theme.borderCard,
            borderTopColor: theme.accentBlueRaw + '55',
            opacity: cardOpacity,
            transform: [{ translateY: cardTranslateY }],
          }
        ]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
          >
            {/* Icon */}
            <Animated.View style={[
              styles.iconCircle,
              {
                backgroundColor: theme.accentBlueRaw + '22',
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslateY }],
              }
            ]}>
              <Ionicons name="information-circle" size={32} color={theme.accentBlue} />
            </Animated.View>

            {/* Title */}
            <Animated.Text style={[
              styles.title,
              {
                color: theme.accentBlue,
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslateY }],
              }
            ]}>
              {def.title}
            </Animated.Text>

            {/* Body */}
            <Animated.Text style={[
              styles.body,
              {
                color: theme.textSecondary,
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslateY }],
              }
            ]}>
              {def.body}
            </Animated.Text>

            {/* Definitions */}
            {def.definitions && (
              <Animated.View style={{
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslateY }],
                width: '100%',
                marginBottom: 16,
                gap: 12,
              }}>
                {def.definitions.map((d, i) => (
                  <View key={i}>
                    <Text style={{
                      fontFamily: 'DMSans_700Bold',
                      fontSize: 13,
                      color: theme.textPrimary,
                      marginBottom: 3,
                    }}>
                      {d.term}
                    </Text>
                    <Text style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 13,
                      lineHeight: 20,
                      color: theme.textSecondary,
                    }}>
                      {d.explanation}
                    </Text>
                  </View>
                ))}
              </Animated.View>
            )}

            {/* Example block */}
            {def.example && (
              <Animated.View style={[
                styles.exampleBlock,
                {
                  backgroundColor: theme.bgCard,
                  borderColor: theme.borderCard,
                  borderLeftColor: theme.accentBlueRaw,
                  opacity: contentOpacity,
                  transform: [{ translateY: contentTranslateY }],
                }
              ]}>
                <Text style={[styles.exampleLabel, { color: theme.textMuted }]}>
                  {def.example.label.toUpperCase()}
                </Text>
                {def.example.lines.map((line, i) => (
                  <View key={i} style={styles.exampleRow}>
                    <Text style={[styles.exampleDesc, { color: theme.textSecondary }]}>{line.desc}</Text>
                    <Text style={[styles.exampleValue, { color: theme.textPrimary }]}>{line.value}</Text>
                  </View>
                ))}
                <View style={[styles.exampleDivider, { backgroundColor: theme.borderCard }]} />
                <View style={styles.exampleRow}>
                  <Text style={[styles.exampleDesc, { color: theme.textSecondary, fontFamily: 'DMSans_700Bold' }]}>
                    {def.example.result.desc}
                  </Text>
                  <Text style={[styles.exampleValue, { color: theme.accentBlue, fontFamily: 'DMSans_700Bold' }]}>
                    {def.example.result.value}
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Take a Tour button -- shown when a tutorial is linked to this tooltip
                and the host allows it (hidden inside the Day Summary modal). */}
            {def.tutorialId && !hideTour && (
              <Animated.View style={{ opacity: buttonOpacity, marginTop: 20, alignSelf: 'stretch' }}>
                <Animated.View style={{ opacity: tourPulse }}>
                  <TouchableOpacity
                    onPress={() => {
                      handleClose();
                      setTimeout(() => startTutorial(def.tutorialId!), 350);
                    }}
                    style={[styles.button, {
                      backgroundColor: theme.accentBlueRaw + '18',
                      borderColor: theme.accentBlueRaw,
                      flexDirection: 'row',
                      gap: 8,
                      justifyContent: 'center',
                    }]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="play-circle" size={16} color={theme.accentBlue} />
                    <Text style={[styles.buttonText, { color: theme.accentBlue }]}>Take a Tour</Text>
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>
            )}

            {/* Got it button */}
            <Animated.View style={{ opacity: buttonOpacity, marginTop: def.tutorialId && !hideTour ? 10 : 20, alignSelf: 'stretch' }}>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleClose(); }}
                style={[styles.button, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, { color: theme.accentBlue }]}>Got it</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Footer */}
            <Text style={[styles.footer, { color: theme.textMuted }]}>
              More definitions and guides in Settings → Help
            </Text>

          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 20,
    borderWidth: 0.5,
    borderTopWidth: 2,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 28,
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  exampleBlock: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 0.5,
    borderLeftWidth: 3,
    padding: 14,
    marginBottom: 4,
  },
  exampleLabel: {
    fontSize: 9,
    letterSpacing: 3,
    fontFamily: 'DMSans_700Bold',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  exampleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  exampleDesc: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    flex: 1,
    paddingRight: 8,
  },
  exampleValue: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    textAlign: 'right',
  },
  exampleDivider: {
    height: 0.5,
    marginVertical: 8,
  },
  button: {
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    letterSpacing: 1,
  },
  footer: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    marginTop: 14,
    textAlign: 'center',
  },
});