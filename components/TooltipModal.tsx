import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useEffect, useRef } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { TOOLTIP_REGISTRY, TooltipDefinition } from '../tooltipRegistry';
import { useTheme } from '../theme';
import { useTutorial } from '../context/TutorialContext';
import { Type } from '../typography';
import ButtonShine from './ButtonShine';
import GradientTitle from './GradientTitle';

interface Props {
  tooltipKey: string;
  visible: boolean;
  onClose: () => void;
  hideTour?: boolean;
  // Override the registry-category-derived amber/blue scheme. Needed for dual-context cards like
  // GratitudeStreakCard whose OWN tooltip category is 'Habits' (correct -- it's a secular habit
  // tracker on Home) but which also renders on the Faith tab wearing the amber skin; the icon
  // itself already knows which context it's in, this just lets the modal agree.
  forceFaith?: boolean;
}

// Same lift/sink recipe as GradientNumber (a big icon glyph is roughly square, same as a number glyph --
// not a wide word -- so GradientNumber's tuning fits it better than GradientTitle's stronger word tuning).
const ICON_LIGHT = 0.24;
const ICON_DARK  = 0.20;

function clamp(n: number) { return Math.max(0, Math.min(255, Math.round(n))); }

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');

const lift = (rgb: [number, number, number], amt: number) =>
  toHex(rgb[0] + (255 - rgb[0]) * amt, rgb[1] + (255 - rgb[1]) * amt, rgb[2] + (255 - rgb[2]) * amt);

const sink = (rgb: [number, number, number], amt: number) =>
  toHex(rgb[0] * (1 - amt), rgb[1] * (1 - amt), rgb[2] * (1 - amt));

// The big (i) icon, molded the same way a hero number is. Falls back to a flat icon if the colour isn't
// a plain hex (shouldn't happen here -- accentBlue/accentAmber always are -- but matches GradientNumber's
// own safety net).
function GradientIcon({ name, size, color }: { name: keyof typeof Ionicons.glyphMap; size: number; color: string }) {
  const rgb = parseHex(color);
  if (!rgb) return <Ionicons name={name} size={size} color={color} />;
  const stops: [string, string, string] = [lift(rgb, ICON_LIGHT), color, sink(rgb, ICON_DARK)];
  return (
    <MaskedView maskElement={<Ionicons name={name} size={size} color="#000000" />}>
      <LinearGradient colors={stops} locations={[0, 0.52, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <Ionicons name={name} size={size} color={color} style={{ opacity: 0 }} />
      </LinearGradient>
    </MaskedView>
  );
}

export default function TooltipModal({ tooltipKey, visible, onClose, hideTour, forceFaith }: Props) {
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

  // Faith tooltips (Bible/prayer/etc.) run the app's amber scheme instead of the user's chosen accent --
  // same rule PrayerRequestModal already follows (faith ? accentAmber : accentBlue[Raw]).
  const isFaith = forceFaith ?? (def?.category === 'Faith');
  const accent    = isFaith ? theme.accentAmber : theme.accentBlue;
  const accentRaw = isFaith ? theme.accentAmber : theme.accentBlueRaw;
  const gotItBg     = isFaith ? theme.accentAmber + '18' : theme.accentBlueBg;
  const gotItBorder = isFaith ? theme.accentAmber        : theme.accentBlueBorder;
  const tourBg     = isFaith ? theme.accentAmber + '18' : theme.accentBlueRaw + '18';
  const tourBorder = isFaith ? theme.accentAmber        : theme.accentBlueRaw;

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
            borderTopColor: accentRaw + '55',
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
                backgroundColor: accentRaw + '22',
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslateY }],
              }
            ]}>
              <GradientIcon name="information-circle" size={32} color={accent} />
            </Animated.View>

            {/* Title */}
            <Animated.View style={{
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
              alignSelf: 'stretch',
            }}>
              <GradientTitle title={def.title} color={accent} style={styles.title} />
            </Animated.View>

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
                      fontFamily: Type.uiBold,
                      fontSize: 13,
                      color: d.termColor ?? theme.textPrimary,
                      marginBottom: 3,
                    }}>
                      {d.term}
                    </Text>
                    <Text style={{
                      fontFamily: Type.ui,
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
                  borderLeftColor: accentRaw,
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
                  <Text style={[styles.exampleDesc, { color: theme.textSecondary, fontFamily: Type.uiBold }]}>
                    {def.example.result.desc}
                  </Text>
                  <Text style={[styles.exampleValue, { color: accent, fontFamily: Type.uiBold }]}>
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
                      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                      handleClose();
                      setTimeout(() => startTutorial(def.tutorialId!), 350);
                    }}
                    style={[styles.button, {
                      backgroundColor: tourBg,
                      borderColor: tourBorder,
                      flexDirection: 'row',
                      gap: 8,
                      justifyContent: 'center',
                    }]}
                    activeOpacity={0.8}
                  >
                    <ButtonShine radius={10} />
                    <Ionicons name="play-circle" size={16} color={accent} />
                    <Text style={[styles.buttonText, { color: accent }]}>Take a Tour</Text>
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>
            )}

            {/* Got it button */}
            <Animated.View style={{ opacity: buttonOpacity, marginTop: def.tutorialId && !hideTour ? 10 : 20, alignSelf: 'stretch' }}>
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); handleClose(); }}
                style={[styles.button, { backgroundColor: gotItBg, borderColor: gotItBorder }]}
                activeOpacity={0.8}
              >
                <ButtonShine radius={10} />
                <Text style={[styles.buttonText, { color: accent }]}>Got it</Text>
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
    fontFamily: Type.display,
    fontSize: 24,
    letterSpacing: 0.3,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontFamily: Type.ui,
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
    fontFamily: Type.uiBold,
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
    fontFamily: Type.ui,
    flex: 1,
    paddingRight: 8,
  },
  exampleValue: {
    fontSize: 12,
    fontFamily: Type.uiSemibold,
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
    fontFamily: Type.uiBold,
    fontSize: 15,
    letterSpacing: 1,
  },
  footer: {
    fontFamily: Type.ui,
    fontSize: 11,
    marginTop: 14,
    textAlign: 'center',
  },
});
