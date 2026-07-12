import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import Purchases, { CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import { REVENUECAT_IOS_KEY, SUPPORTER_ENTITLEMENT_ID } from './config';
import { useAuth } from './AuthContext';

// Single source of truth for Supporter status. Reads the RevenueCat `supporter` entitlement (real
// purchases) and, IN DEV ONLY, also honors the legacy pj_settings.devProUnlocked toggle so Justin can
// test free-vs-Supporter without a real purchase. Everything is guarded: if the native
// react-native-purchases module isn't present yet (e.g. before the pending native rebuild), the app
// does NOT crash -- isSupporter simply falls back to the dev override / false.
//
// Replaces the old per-screen `__DEV__ || devProUnlocked` checks. Purchases are tied to the Firebase
// user id (Purchases.logIn) so a Supporter's status restores across devices/reinstalls, matching the
// app's existing cloud-restore design.

interface MembershipValue {
  isSupporter: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const MembershipContext = createContext<MembershipValue>({
  isSupporter: false,
  loading: true,
  refresh: async () => {},
});

function hasSupporterEntitlement(info: CustomerInfo | null | undefined): boolean {
  try {
    return !!info?.entitlements?.active?.[SUPPORTER_ENTITLEMENT_ID];
  } catch {
    return false;
  }
}

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [entitled, setEntitled] = useState(false);
  const [devOverride, setDevOverride] = useState(false);
  const [loading, setLoading] = useState(true);
  const configured = useRef(false);

  // DEV-ONLY: mirror the legacy Settings dev toggle so free-vs-Supporter is testable without a purchase.
  const readDevOverride = useCallback(async () => {
    if (!__DEV__) return;
    try {
      const raw = await AsyncStorage.getItem('pj_settings');
      if (raw) setDevOverride(!!JSON.parse(raw).devProUnlocked);
    } catch {}
  }, []);

  // Configure RevenueCat ONCE, attach the entitlement listener, read the initial state.
  useEffect(() => {
    if (configured.current) return;
    configured.current = true;

    const applyInfo = (info: CustomerInfo) => {
      setEntitled(hasSupporterEntitlement(info));
      setLoading(false);
    };

    try {
      if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      Purchases.configure({ apiKey: REVENUECAT_IOS_KEY });
      Purchases.addCustomerInfoUpdateListener(applyInfo);
      Purchases.getCustomerInfo().then(applyInfo).catch(() => setLoading(false));
    } catch {
      // Native module not present yet (before the native rebuild) -> stay un-entitled, don't crash.
      setLoading(false);
    }

    readDevOverride();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') readDevOverride();
    });

    return () => {
      try { Purchases.removeCustomerInfoUpdateListener(applyInfo); } catch {}
      sub.remove();
    };
  }, [readDevOverride]);

  // Tie RevenueCat identity to the Firebase account so purchases restore across devices/reinstalls.
  useEffect(() => {
    if (authLoading || !configured.current) return;
    (async () => {
      try {
        if (user?.uid) {
          const { customerInfo } = await Purchases.logIn(user.uid);
          setEntitled(hasSupporterEntitlement(customerInfo));
        } else {
          const info = await Purchases.logOut();
          setEntitled(hasSupporterEntitlement(info));
        }
      } catch {
        // logOut throws if already anonymous; native module may be absent -> ignore, don't crash.
      }
    })();
  }, [user?.uid, authLoading]);

  const refresh = useCallback(async () => {
    await readDevOverride();
    try {
      const info = await Purchases.getCustomerInfo();
      setEntitled(hasSupporterEntitlement(info));
    } catch {}
  }, [readDevOverride]);

  const isSupporter = entitled || (__DEV__ && devOverride);

  return (
    <MembershipContext.Provider value={{ isSupporter, loading, refresh }}>
      {children}
    </MembershipContext.Provider>
  );
}

export const useMembership = () => useContext(MembershipContext);
