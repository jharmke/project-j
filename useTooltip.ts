import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from './utils/storage';
import { useCallback, useEffect, useState } from 'react';

const PREFIX = 'pj_tooltip_';

export function useTooltip(key: string) {
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(PREFIX + key)
      .then(val => setSeen(val === 'true'))
      .catch(() => setSeen(false));
  }, [key]);

  const markSeen = useCallback(async () => {
    await storageSet(PREFIX + key, 'true');
    setSeen(true);
  }, [key]);

  const reset = useCallback(async () => {
    await AsyncStorage.removeItem(PREFIX + key);
    setSeen(false);
  }, [key]);

  return { seen, markSeen, reset };
}