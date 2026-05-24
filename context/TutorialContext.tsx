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
  activeState: ActiveTutorialState | null;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [activeState, setActiveStateReact] = useState<ActiveTutorialState | null>(null);
  const activeStateRef = useRef<ActiveTutorialState | null>(null);
  const refs = useRef<Record<string, React.RefObject<View | null>>>({});
  const actions = useRef<Record<string, () => Promise<void>>>({});

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

  const startTutorial = useCallback(async (id: string) => {
    const { TUTORIALS } = await import('../data/tutorials');
    const tutorial = TUTORIALS.find(t => t.id === id);
    if (!tutorial) return;

    let styleMode = 'balanced';
    try {
      const raw = await AsyncStorage.getItem('pj_settings');
      if (raw) styleMode = JSON.parse(raw)?.styleMode ?? 'balanced';
    } catch {}

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
    setActiveState(null);
  }, [setActiveState]);

  return (
    <TutorialContext.Provider value={{
      startTutorial, advanceStep, skipTutorial,
      registerTarget, unregisterTarget, getTarget,
      registerTutorialAction, unregisterTutorialAction,
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
