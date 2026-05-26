import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ActiveTutorialState } from '../context/TutorialContext';
import { useTutorial } from '../context/TutorialContext';
import { useTheme } from '../theme';

const { width: SW, height: SH } = Dimensions.get('window');
const PAD        = 8;
const RADIUS     = 14;
const TAB_H      = 64;
const BUBBLE_GAP = 12;
const H_MARGIN   = 16;
const SCRIM      = 'rgba(0,0,0,0.82)';

type TargetRect = { x: number; y: number; w: number; h: number };
type BubblePos  = { above: boolean; value: number };

// Returns true when a measured rect is outside the visible viewport.
// Off-screen targets fall back to full-screen dim + centered bubble so
// the user can always reach Skip -- preventing input-absorber freeze.
// Also returns true when the bottom of the target clips under the tab bar
// (top visible but bottom obscured) -- triggers scroll to bring it clear.
// noTabBar: pass true for screens that have no bottom tab bar (e.g. add-food)
// so elements near the screen bottom are not falsely flagged as off-screen.
function isOffScreen(l: TargetRect | null, noTabBar = false): boolean {
  if (!l) return false;
  if (l.y + l.h < 0) return true;                  // off top
  const tabH = noTabBar ? 0 : TAB_H;
  if (l.y > SH - tabH - 50) return true;           // off bottom
  if (l.y + l.h > SH - tabH - 24) return true;     // bottom clips into tab bar / safe area
  return false;
}

export default function TutorialOverlay() {
  const { activeState, advanceStep, skipTutorial, getTarget, getScrollViews } = useTutorial();
  const { theme } = useTheme();

  const [visible,     setVisible]     = useState(false);
  const [renderState, setRenderState] = useState<ActiveTutorialState | null>(null);
  const [bubblePos,   setBubblePos]   = useState<BubblePos>({ above: false, value: SH * 0.3 });

  // Spotlight animated values -- layout props require useNativeDriver: false
  const spotX = useRef(new Animated.Value(SW * 0.5)).current;
  const spotY = useRef(new Animated.Value(SH * 0.5)).current;
  const spotW = useRef(new Animated.Value(0)).current;
  const spotH = useRef(new Animated.Value(0)).current;

  // Derived animated values for bottom panel top edge and right panel left edge
  const bottomTop = useMemo(() => Animated.add(spotY, spotH), []);
  const rightLeft = useMemo(() => Animated.add(spotX, spotW), []);

  // Overlay and bubble -- opacity/transform use useNativeDriver: true
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const bubbleOpacity  = useRef(new Animated.Value(0)).current;
  const bubbleTransY   = useRef(new Animated.Value(16)).current;

  const [spotActive, setSpotActive] = useState(false);

  const prevTutorialId = useRef<string | null>(null);
  const prevStepIndex  = useRef<number>(-1);
  const isExiting      = useRef(false);

  // ── Measure a registered target view (single attempt) ────────────────────
  const measureTarget = useCallback((key: string): Promise<TargetRect | null> => {
    return new Promise(resolve => {
      if (key === 'none') { resolve(null); return; }
      const ref = getTarget(key);
      if (!ref?.current) { resolve(null); return; }
      setTimeout(() => {
        ref.current!.measureInWindow((x, y, w, h) => {
          resolve(w > 0 && h > 0 ? { x, y, w, h } : null);
        });
      }, 60);
    });
  }, [getTarget]);

  // ── Retry measure -- used after navigation when refs may not be ready yet ─
  const measureTargetWithRetry = useCallback(async (
    key: string,
    maxAttempts = 5,
    delayMs = 150,
  ): Promise<TargetRect | null> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await new Promise<void>(r => setTimeout(r, delayMs));
      }
      const result = await measureTarget(key);
      if (result !== null) return result;
    }
    return null;
  }, [measureTarget]);

  // ── Scroll a registered ScrollView to bring an off-screen target into view ─
  // Uses measureLayout so we get the target's Y within the scroll content,
  // not the viewport -- then calls scrollTo with 80px top padding.
  const scrollToTarget = useCallback(async (key: string): Promise<void> => {
    if (key === 'none') return;
    const targetRef = getTarget(key);
    if (!targetRef?.current) return;
    const svMap = getScrollViews();
    const svRefs = Object.values(svMap);
    for (const svRef of svRefs) {
      if (!svRef?.current) continue;
      let didScroll = false;
      await new Promise<void>(resolve => {
        (targetRef.current as any).measureLayout(
          svRef.current,
          (_x: number, y: number) => {
            (svRef.current as any).scrollTo({ y: Math.max(0, y - 160), animated: true });
            didScroll = true;
            resolve();
          },
          () => resolve(), // layout failed -- try next scroll view
        );
      });
      if (didScroll) {
        // Let the scroll animation settle before re-measuring
        await new Promise<void>(r => setTimeout(r, 450));
        break; // only one active ScrollView at a time per tab
      }
    }
  }, [getTarget, getScrollViews]);

  // ── Compute bubble position (above or below spotlight) ───────────────────
  const computeBubblePos = useCallback((layout: TargetRect | null): BubblePos => {
    if (!layout) return { above: false, value: SH * 0.28 };
    const spotTop    = layout.y - PAD;
    const spotBottom = layout.y + layout.h + PAD;
    const spaceAbove = spotTop;
    const spaceBelow = SH - spotBottom - TAB_H;
    if (spaceAbove >= spaceBelow) {
      // Bubble bottom edge = spotTop - BUBBLE_GAP (in absolute coords from screen bottom)
      const rawValue = SH - (spotTop - BUBBLE_GAP);
      // Clamp so bubble doesn't extend above the screen (title/counter would be cut off).
      // A ~220px bubble needs its bottom at most SH-260px to keep top below status bar (~40px).
      const clamped = Math.min(rawValue, SH - 260);
      return { above: true, value: clamped };
    }
    return { above: false, value: spotBottom + BUBBLE_GAP };
  }, []);

  // ── Animate spotlight panels to a rect ───────────────────────────────────
  const animateSpot = useCallback((layout: TargetRect | null, instant: boolean): Promise<void> => {
    const tx = layout ? layout.x - PAD     : SW * 0.5;
    const ty = layout ? layout.y - PAD     : SH * 0.5;
    const tw = layout ? layout.w + PAD * 2 : 0;
    const th = layout ? layout.h + PAD * 2 : 0;

    if (instant) {
      spotX.setValue(tx); spotY.setValue(ty);
      spotW.setValue(tw); spotH.setValue(th);
      return Promise.resolve();
    }
    return new Promise(resolve => {
      Animated.parallel([
        Animated.timing(spotX, { toValue: tx, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(spotY, { toValue: ty, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(spotW, { toValue: tw, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(spotH, { toValue: th, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]).start(() => resolve());
    });
  }, [spotX, spotY, spotW, spotH]);

  // ── Tutorial entry: measure → (scroll if needed) → snap spotlight → fade in ─
  const doEntry = useCallback(async (state: ActiveTutorialState) => {
    isExiting.current = false;
    overlayOpacity.setValue(0);
    bubbleOpacity.setValue(0);
    bubbleTransY.setValue(16);

    const firstStep = state.tutorial.steps[state.stepIndex];
    const navigateTo = (firstStep as any).navigateTo as string | undefined;
    const navigateDelay = ((firstStep as any).navigateDelay as number) ?? 200;
    const noTabBar = !!((firstStep as any).noTabBarOffset);

    let rawLayout: TargetRect | null;
    if (navigateTo === 'back') {
      router.back();
      await new Promise<void>(r => setTimeout(r, navigateDelay));
      rawLayout = await measureTargetWithRetry(firstStep.targetKey);
    } else if (navigateTo === 'back_twice') {
      router.back();
      await new Promise<void>(r => setTimeout(r, 300));
      router.back();
      await new Promise<void>(r => setTimeout(r, navigateDelay));
      rawLayout = await measureTargetWithRetry(firstStep.targetKey);
    } else if (navigateTo) {
      router.push(navigateTo as never);
      await new Promise<void>(r => setTimeout(r, navigateDelay));
      rawLayout = await measureTargetWithRetry(firstStep.targetKey);
    } else {
      rawLayout = await measureTarget(firstStep.targetKey);
    }

    let layout = isOffScreen(rawLayout, noTabBar) ? null : rawLayout;
    if (isOffScreen(rawLayout, noTabBar)) {
      await scrollToTarget(firstStep.targetKey);
      const remeasured = await measureTargetWithRetry(firstStep.targetKey);
      layout = isOffScreen(remeasured, noTabBar) ? null : remeasured;
    }
    const pos       = computeBubblePos(layout);

    await animateSpot(layout, true);
    setBubblePos(pos);
    setRenderState(state);
    setSpotActive(layout !== null);
    setVisible(true);

    // One frame delay ensures React commits the render before animation starts
    setTimeout(() => {
      Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start(() => {
        Animated.parallel([
          Animated.timing(bubbleOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.spring(bubbleTransY, { toValue: 0, tension: 160, friction: 12, useNativeDriver: true }),
        ]).start();
      });
    }, 16);
  }, [measureTarget, measureTargetWithRetry, scrollToTarget, computeBubblePos, animateSpot]);

  // ── Step transition: bubble out → (navigate?) → move spotlight → bubble in ─
  const doStepTransition = useCallback(async (state: ActiveTutorialState) => {
    const step = state.tutorial.steps[state.stepIndex];

    await new Promise<void>(resolve => {
      Animated.timing(bubbleOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => resolve());
    });

    // If this step requires a screen change, navigate first then retry measurement
    const navigateTo = (step as { navigateTo?: string }).navigateTo;
    const navigateDelay = (step as { navigateDelay?: number }).navigateDelay ?? 200;
    const noTabBar = !!((step as any).noTabBarOffset);

    let rawLayout: TargetRect | null;
    if (navigateTo === 'back') {
      router.back();
      await new Promise<void>(r => setTimeout(r, navigateDelay));
      rawLayout = await measureTargetWithRetry(step.targetKey);
    } else if (navigateTo === 'back_twice') {
      router.back();
      await new Promise<void>(r => setTimeout(r, 300));
      router.back();
      await new Promise<void>(r => setTimeout(r, navigateDelay));
      rawLayout = await measureTargetWithRetry(step.targetKey);
    } else if (navigateTo) {
      router.push(navigateTo as never);
      await new Promise<void>(r => setTimeout(r, navigateDelay));
      rawLayout = await measureTargetWithRetry(step.targetKey);
    } else {
      rawLayout = await measureTarget(step.targetKey);
    }

    let layout = isOffScreen(rawLayout, noTabBar) ? null : rawLayout;
    if (isOffScreen(rawLayout, noTabBar)) {
      await scrollToTarget(step.targetKey);
      const remeasured = await measureTargetWithRetry(step.targetKey);
      layout = isOffScreen(remeasured, noTabBar) ? null : remeasured;
    }
    const pos    = computeBubblePos(layout);
    setBubblePos(pos);
    setRenderState(state);
    await animateSpot(layout, false);
    setSpotActive(layout !== null);

    bubbleTransY.setValue(8);
    Animated.parallel([
      Animated.timing(bubbleOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.spring(bubbleTransY, { toValue: 0, tension: 200, friction: 14, useNativeDriver: true }),
    ]).start();
  }, [measureTarget, measureTargetWithRetry, scrollToTarget, computeBubblePos, animateSpot]);

  // ── Tutorial exit: bubble out → overlay out → unmount ────────────────────
  const doExit = useCallback(() => {
    isExiting.current = true;
    Animated.timing(bubbleOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setVisible(false);
        setRenderState(null);
        isExiting.current = false;
      });
    });
  }, []);

  // ── Main effect: respond to activeState changes ───────────────────────────
  useEffect(() => {
    if (!activeState) {
      if (visible && !isExiting.current) doExit();
      // Reset tracking so the same tutorial can be replayed immediately
      prevTutorialId.current = null;
      prevStepIndex.current  = -1;
      return;
    }

    const isNewTutorial = activeState.tutorial.id !== prevTutorialId.current;
    const isNewStep     = activeState.stepIndex  !== prevStepIndex.current;

    prevTutorialId.current = activeState.tutorial.id;
    prevStepIndex.current  = activeState.stepIndex;

    if (isNewTutorial) {
      doEntry(activeState);
    } else if (isNewStep) {
      doStepTransition(activeState);
    }
  }, [activeState]);

  if (!visible || !renderState) return null;

  const step = renderState.tutorial.steps[renderState.stepIndex];
  if (!step) return null;

  const totalSteps    = renderState.tutorial.steps.length;
  const stepIdx       = renderState.stepIndex;
  const isLastStep    = stepIdx === totalSteps - 1;
  const useDots       = totalSteps <= 6;
  const bodyText      =
    step.body[renderState.styleMode as 'discipline' | 'balanced' | 'mindful'] ??
    step.body.balanced;
  const noDimOverlay  = !!(step as any).noDimOverlay;
  const bubbleAtBottom = !!(step as any).bubbleAtBottom;
  const bubbleStyle   = bubbleAtBottom
    ? { bottom: TAB_H + 16 }
    : bubblePos.above
      ? { bottom: bubblePos.value }
      : { top: bubblePos.value };

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity: overlayOpacity }]}
      pointerEvents="box-none"
    >
      {/* Full-screen touch absorber -- sits below bubble in z-order, blocks all background touches */}
      <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} />

      {/* 4-panel scrim -- skipped on noDimOverlay steps so underlying UI is fully visible */}
      {!noDimOverlay && (
        <>
          <Animated.View
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: spotY, backgroundColor: SCRIM }}
            pointerEvents="none"
          />
          <Animated.View
            style={{ position: 'absolute', top: bottomTop, left: 0, right: 0, bottom: 0, backgroundColor: SCRIM }}
            pointerEvents="none"
          />
          <Animated.View
            style={{ position: 'absolute', top: spotY, height: spotH, left: 0, width: spotX, backgroundColor: SCRIM }}
            pointerEvents="none"
          />
          <Animated.View
            style={{ position: 'absolute', top: spotY, height: spotH, left: rightLeft, right: 0, backgroundColor: SCRIM }}
            pointerEvents="none"
          />
        </>
      )}

      {/* Accent ring overlaid on spotlight cutout -- hidden when no spotlight (avoids 0x0 dot artifact) */}
      {spotActive && !noDimOverlay && (
        <Animated.View
          style={{
            position: 'absolute',
            left: spotX,
            top: spotY,
            width: spotW,
            height: spotH,
            borderRadius: RADIUS,
            borderWidth: 1.5,
            borderColor: theme.accentBlueRaw + '99',
          }}
          pointerEvents="none"
        />
      )}

      {/* Callout bubble */}
      <Animated.View
        style={[
          styles.bubbleWrapper,
          bubbleStyle,
          { opacity: bubbleOpacity, transform: [{ translateY: bubbleTransY }] },
        ]}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.bubble,
            { backgroundColor: theme.bgSheet, borderColor: 'rgba(255,255,255,0.1)' },
          ]}
        >
          {/* Header: progress indicator + skip */}
          <View style={styles.bubbleHeader}>
            {useDots ? (
              <View style={styles.dotsRow}>
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        width: i === stepIdx ? 16 : 6,
                        backgroundColor: i === stepIdx ? theme.accentBlueRaw : 'transparent',
                        borderWidth: i === stepIdx ? 0 : 1.5,
                        borderColor: i === stepIdx ? 'transparent' : theme.textMuted,
                      },
                    ]}
                  />
                ))}
              </View>
            ) : (
              <Text style={[styles.stepText, { color: theme.textSecondary }]}>
                {stepIdx + 1} of {totalSteps}
              </Text>
            )}
            <TouchableOpacity
              onPress={skipTutorial}
              hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
            >
              <Text style={[styles.skipText, { color: theme.textSecondary }]}>Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.accentBlueRaw }]}>{step.title}</Text>

          {/* Body */}
          <Text style={[styles.body, { color: theme.textSecondary }]}>{bodyText}</Text>

          {/* Next / Done */}
          <TouchableOpacity
            onPress={advanceStep}
            style={[
              styles.nextBtn,
              {
                backgroundColor: theme.accentBlueBg,
                borderColor: theme.accentBlueRaw + '4d',
              },
            ]}
            activeOpacity={0.75}
          >
            <Text style={[styles.nextBtnText, { color: theme.accentBlueRaw }]}>
              {isLastStep ? 'DONE' : 'NEXT'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubbleWrapper: {
    position: 'absolute',
    left: H_MARGIN,
    right: H_MARGIN,
  },
  bubble: {
    borderRadius: 14,
    borderWidth: 0.5,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  bubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  stepText: {
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 1,
  },
  skipText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
  },
  title: {
    fontSize: 22,
    fontFamily: 'BebasNeue_400Regular',
    letterSpacing: 1,
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 20,
    marginBottom: 14,
  },
  nextBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  nextBtnText: {
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 1.5,
  },
});
