import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { View } from 'react-native';
import type { Tutorial } from '../data/tutorials';

export interface TutorialStep {
  targetKey: string;
  title: string;
  body: { discipline: string; balanced: string; mindful: string };
  highlightPadding?: number;
}

export interface ActiveTutorialState {
  tutorial: Tutorial;
  stepIndex: number;
  styleMode: string;
}

export interface TutorialContextType {
  startTutorial: (id: string) => Promise<void>;
  advanceStep: () => void;
  skipTutorial: () => void;
  registerTarget: (key: string, ref: React.RefObject<View | null>) => void;
  unregisterTarget: (key: string) => void;
  getTarget: (key: string) => React.RefObject<View | null> | undefined;
  activeState: ActiveTutorialState | null;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [activeState, setActiveState] = useState<ActiveTutorialState | null>(null);
  const refs = useRef<Record<string, React.RefObject<View | null>>>({});

  const registerTarget = useCallback((key: string, ref: React.RefObject<View | null>) => {
    refs.current[key] = ref;
  }, []);

  const unregisterTarget = useCallback((key: string) => {
    delete refs.current[key];
  }, []);

  const getTarget = useCallback((key: string) => refs.current[key], []);

  const startTutorial = useCallback(async (id: string) => {
    const { TUTORIALS } = await import('../data/tutorials');
    const tutorial = TUTORIALS.find(t => t.id === id);
    if (!tutorial) return;

    let styleMode = 'balanced';
    try {
      const raw = await AsyncStorage.getItem('pj_settings');
      if (raw) styleMode = JSON.parse(raw)?.styleMode ?? 'balanced';
    } catch {}

    setActiveState({ tutorial, stepIndex: 0, styleMode });
  }, []);

  const advanceStep = useCallback(() => {
    setActiveState(prev => {
      if (!prev) return null;
      const next = prev.stepIndex + 1;
      if (next >= prev.tutorial.steps.length) {
        markTutorialSeen(prev.tutorial.id);
        return null;
      }
      return { ...prev, stepIndex: next };
    });
  }, []);

  const skipTutorial = useCallback(() => {
    setActiveState(prev => {
      if (prev) markTutorialSeen(prev.tutorial.id);
      return null;
    });
  }, []);

  return (
    <TutorialContext.Provider value={{
      startTutorial, advanceStep, skipTutorial,
      registerTarget, unregisterTarget, getTarget,
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
