import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useTutorial } from '../context/TutorialContext';

export function useTutorialTarget(key: string) {
  const ref = useRef<View>(null);
  const { registerTarget, unregisterTarget } = useTutorial();

  useEffect(() => {
    registerTarget(key, ref);
    return () => unregisterTarget(key);
  }, [key, registerTarget, unregisterTarget]);

  return ref;
}
