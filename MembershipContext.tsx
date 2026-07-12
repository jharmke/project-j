import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
  PurchasesStoreProduct,
} from 'react-native-purchases';
import { REVENUECAT_IOS_KEY, SUPPORTER_ENTITLEMENT_ID, TIP_PRODUCT_IDS } from './config';
import { useAuth } from './AuthContext';

// Single source of truth for Supporter status + the purchase surface. Reads the RevenueCat `supporter`
// entitlement (real purchases) and, IN DEV ONLY, also honors the legacy pj_settings.devProUnlocked toggle
// so Justin can test free-vs-Supporter without a real purchase. Everything is guarded: if the native
// react-native-purchases module isn't present yet (e.g. before the pending native rebuild), the app does
// NOT crash -- isSupporter falls back to the dev override / false and the purchase methods no-op.
//
// Purchases are tied to the Firebase user id (Purchases.logIn) so a Supporter's status restores across
// devices/reinstalls, matching the app's existing cloud-restore design.

type PurchaseResult = 'success' | 'cancelled' | 'error';

interface MembershipValue {
  isSupporter: boolean;
  loading: boolean;
  offering: PurchasesOffering | null;      // the `default` offering (Monthly + Annual packages)
  tipProducts: PurchasesStoreProduct[];    // the 4 consumable tips, low -> high
  purchasePackage: (pkg: PurchasesPackage) => Promise<PurchaseResult>;
  purchaseTip: (product: PurchasesStoreProduct) => Promise<PurchaseResult>;
  restore: () => Promise<boolean>;         // true if a Supporter entitlement was restored
  refresh: () => Promise<void>;
}

const noopResult = async (): Promise<PurchaseResult> => 'error';

const MembershipContext = createContext<MembershipValue>({
  isSupporter: false,
  loading: true,
  offering: null,
  tipProducts: [],
  purchasePackage: noopResult,
  purchaseTip: noopResult,
  restore: async () => false,
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
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [tipProducts, setTipProducts] = useState<PurchasesStoreProduct[]>([]);
  const configured = useRef(false);

  // DEV-ONLY: mirror the legacy Settings dev toggle so free-vs-Supporter is testable without a purchase.
  const readDevOverride = useCallback(async () => {
    if (!__DEV__) return;
    try {
      const raw = await AsyncStorage.getItem('pj_settings');
      if (raw) setDevOverride(!!JSON.parse(raw).devProUnlocked);
    } catch {}
  }, []);

  // Fetch the subscription offering + the tip products for the Support screen.
  const loadStoreProducts = useCallback(async () => {
    try {
      const offerings = await Purchases.getOfferings();
      setOffering(offerings.current ?? null);
    } catch {}
    try {
      const products = await Purchases.getProducts([...TIP_PRODUCT_IDS]);
      // Preserve the low -> high order defined in config (getProducts order isn't guaranteed).
      const ordered = TIP_PRODUCT_IDS
        .map(id => products.find(p => p.identifier === id))
        .filter((p): p is PurchasesStoreProduct => !!p);
      setTipProducts(ordered);
    } catch {}
  }, []);

  // Configure RevenueCat ONCE, attach the entitlement listener, read the initial state, load products.
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
      loadStoreProducts();
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
  }, [readDevOverride, loadStoreProducts]);

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
        loadStoreProducts();
      } catch {
        // logOut throws if already anonymous; native module may be absent -> ignore, don't crash.
      }
    })();
  }, [user?.uid, authLoading, loadStoreProducts]);

  const refresh = useCallback(async () => {
    await readDevOverride();
    try {
      const info = await Purchases.getCustomerInfo();
      setEntitled(hasSupporterEntitlement(info));
    } catch {}
    loadStoreProducts();
  }, [readDevOverride, loadStoreProducts]);

  // Buy a subscription package. Updates entitlement on success.
  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<PurchaseResult> => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      setEntitled(hasSupporterEntitlement(customerInfo));
      return 'success';
    } catch (e: any) {
      return e?.userCancelled ? 'cancelled' : 'error';
    }
  }, []);

  // Buy a one-time tip (consumable). Does NOT grant the entitlement (tips are gratitude, not perks); the
  // badge-for-tippers is handled separately in app code from purchase history.
  const purchaseTip = useCallback(async (product: PurchasesStoreProduct): Promise<PurchaseResult> => {
    try {
      const { customerInfo } = await Purchases.purchaseStoreProduct(product);
      setEntitled(hasSupporterEntitlement(customerInfo));
      return 'success';
    } catch (e: any) {
      return e?.userCancelled ? 'cancelled' : 'error';
    }
  }, []);

  const restore = useCallback(async (): Promise<boolean> => {
    try {
      const info = await Purchases.restorePurchases();
      const ok = hasSupporterEntitlement(info);
      setEntitled(ok);
      return ok;
    } catch {
      return false;
    }
  }, []);

  const isSupporter = entitled || (__DEV__ && devOverride);

  return (
    <MembershipContext.Provider
      value={{ isSupporter, loading, offering, tipProducts, purchasePackage, purchaseTip, restore, refresh }}
    >
      {children}
    </MembershipContext.Provider>
  );
}

export const useMembership = () => useContext(MembershipContext);
