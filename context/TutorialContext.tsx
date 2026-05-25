import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { View } from 'react-native';
import type { Tutorial, TutorialStep as TutorialStepData } from '../data/tutorials';

export interface TutorialStep {
  targetKey: string;
  title: string;
  body: { discipline: string; balanced: string; mindful: string };
  highlightPadding?: number;
  skipIfTargetMissing?: boolean;
  skipForModes?: ('discipline' | 'balanced' | 'mindful')[];
  navigateTo?: string;
  navigateDelay?: number;
  tutorialAction?: string;
  /** Set true for steps on screens that have no bottom tab bar (e.g. add-food).
   *  Removes the TAB_H offset from isOffScreen so elements near the bottom of
   *  those screens are not falsely flagged as off-screen. */
  noTabBarOffset?: boolean;
}

function findNextValidStep(
  fromIndex: number,
  steps: TutorialStepData[],
  styleMode: string,
  registeredRefs: Record<string, React.RefObject<View | null>>
): number {
  let i = fromIndex;
  while (i < steps.length) {
    const step = steps[i];
    const skippedForMode = step.skipForModes?.includes(styleMode as 'discipline' | 'balanced' | 'mindful');
    const skippedForMissing = step.skipIfTargetMissing && step.targetKey !== 'none' && !registeredRefs[step.targetKey]?.current;
    if (!skippedForMode && !skippedForMissing) return i;
    i++;
  }
  return steps.length;
}

export interface ActiveTutorialState {
  tutorial: Tutorial;
  stepIndex: number;
  styleMode: string;
}

export interface TutorialContextType {
  startTutorial: (id: string) => Promise<void>;
  advanceStep: () => Promise<void>;
  skipTutorial: () => void;
  registerTarget: (key: string, ref: React.RefObject<View | null>) => void;
  unregisterTarget: (key: string) => void;
  getTarget: (key: string) => React.RefObject<View | null> | undefined;
  registerTutorialAction: (key: string, callback: () => Promise<void>) => void;
  unregisterTutorialAction: (key: string) => void;
  registerScrollView: (key: string, ref: React.RefObject<any>) => void;
  unregisterScrollView: (key: string) => void;
  getScrollViews: () => Record<string, React.RefObject<any>>;
  registerIdResolver: (id: string, resolver: () => string) => void;
  unregisterIdResolver: (id: string) => void;
  activeState: ActiveTutorialState | null;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [activeState, setActiveStateReact] = useState<ActiveTutorialState | null>(null);
  const activeStateRef = useRef<ActiveTutorialState | null>(null);
  const refs = useRef<Record<string, React.RefObject<View | null>>>({});
  const actions = useRef<Record<string, () => Promise<void>>>({});
  const scrollViewRefs = useRef<Record<string, React.RefObject<any>>>({});
  const idResolvers = useRef<Record<string, () => string>>({});

  const setActiveState = useCallback((value: ActiveTutorialState | null) => {
    activeStateRef.current = value;
    setActiveStateReact(value);
  }, []);

  const registerTarget = useCallback((key: string, ref: React.RefObject<View | null>) => {
    refs.current[key] = ref;
  }, []);

  const unregisterTarget = useCallback((key: string) => {
    delete refs.current[key];
  }, []);

  const getTarget = useCallback((key: string) => refs.current[key], []);

  const registerTutorialAction = useCallback((key: string, callback: () => Promise<void>) => {
    actions.current[key] = callback;
  }, []);

  const unregisterTutorialAction = useCallback((key: string) => {
    delete actions.current[key];
  }, []);

  const registerScrollView = useCallback((key: string, ref: React.RefObject<any>) => {
    scrollViewRefs.current[key] = ref;
  }, []);

  const unregisterScrollView = useCallback((key: string) => {
    delete scrollViewRefs.current[key];
  }, []);

  const getScrollViews = useCallback(() => scrollViewRefs.current, []);

  const registerIdResolver = useCallback((id: string, resolver: () => string) => {
    idResolvers.current[id] = resolver;
  }, []);

  const unregisterIdResolver = useCallback((id: string) => {
    delete idResolvers.current[id];
  }, []);

  const startTutorial = useCallback(async (id: string) => {
    const resolvedId = idResolvers.current[id]?.() ?? id;
    const { TUTORIALS } = await import('../data/tutorials');
    const tutorial = TUTORIALS.find(t => t.id === resolvedId);
    if (!tutorial) return;

    let styleMode = 'balanced';
    try {
      const raw = await AsyncStorage.getItem('pj_settings');
      if (raw) styleMode = JSON.parse(raw)?.styleMode ?? 'balanced';
    } catch {}

    // Fire preAction before first step appears (e.g. inject demo data so it
    // is already on-screen when step 0 opens -- no "it just appeared" surprise)
    const preActionKey = (tutorial as any).preAction as string | undefined;
    if (preActionKey) {
      const action = actions.current[preActionKey];
      if (action) { try { await action(); } catch {} }
    }

    const firstStep = findNextValidStep(0, tutorial.steps, styleMode, refs.current);
    if (firstStep >= tutorial.steps.length) return;
    setActiveState({ tutorial, stepIndex: firstStep, styleMode });
  }, [setActiveState]);

  const advanceStep = useCallback(async () => {
    const prev = activeStateRef.current;
    if (!prev) return;

    const currentStep = prev.tutorial.steps[prev.stepIndex] as TutorialStepData & { tutorialAction?: string };

    if (currentStep?.tutorialAction) {
      const action = actions.current[currentStep.tutorialAction];
      if (action) {
        try { await action(); } catch {}
      }
    }

    const next = findNextValidStep(prev.stepIndex + 1, prev.tutorial.steps, prev.styleMode, refs.current);
    if (next >= prev.tutorial.steps.length) {
      markTutorialSeen(prev.tutorial.id);
      setActiveState(null);
    } else {
      setActiveState({ ...prev, stepIndex: next });
    }
  }, [setActiveState]);

  const skipTutorial = useCallback(() => {
    const prev = activeStateRef.current;
    if (prev) markTutorialSeen(prev.tutorial.id);
    try { actions.current['deleteTutorialEntry']?.(); } catch {}
    try { actions.current['deleteTutorialExercise']?.(); } catch {}
    try { actions.current['clearTutorialScanState']?.(); } catch {}
    try { actions.current['closeCreatorAfterTutorial']?.(); } catch {}
    try { actions.current['deleteTutorialRecipe']?.(); } catch {}
    try { actions.current['closeRecipeTutorial']?.(); } catch {}
    setActiveState(null);
  }, [setActiveState]);

  return (
    <TutorialContext.Provider value={{
      startTutorial, advanceStep, skipTutorial,
      registerTarget, unregisterTarget, getTarget,
      registerTutorialAction, unregisterTutorialAction,
      registerScrollView, unregisterScrollView, getScrollViews,
      registerIdResolver, unregisterIdResolver,
      activeState,
    }}>
      {children}
    </TutorialContext.Provider>
  );
}

async function markTutorialSeen(id: string) {
  try {
    const raw = await AsyncStorage.getItem('pj_tutorials');
    const data = raw ? JSON.parse(raw) : {};
    data[id] = { seen: true, completedAt: new Date().toISOString() };
    await AsyncStorage.setItem('pj_tutorials', JSON.stringify(data));
  } catch {}
}

export async function isTutorialSeen(id: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem('pj_tutorials');
    if (!raw) return false;
    return !!JSON.parse(raw)[id]?.seen;
  } catch { return false; }
}

export async function resetAllTutorials() {
  try {
    await AsyncStorage.removeItem('pj_tutorials');
    await AsyncStorage.removeItem('pj_tutorial_meta');
  } catch {}
}

export function useTutorial(): TutorialContextType {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error('useTutorial must be used within TutorialProvider');
  return ctx;
}
