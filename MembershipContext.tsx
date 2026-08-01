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
import { enforceIconEntitlement } from './utils/appIcon';
import { claimFirstWeek, firstWeekClaimPending } from './utils/firstWeek';

// Single source of truth for Supporter status + the purchase surface. Reads the RevenueCat `supporter`
// entitlement (real purchases) and, IN DEV ONLY, also honors the legacy pj_settings.devProUnlocked toggle
// so Justin can test free-vs-Supporter without a real purchase. Everything is guarded: if the native
// react-native-purchases module isn't present yet (e.g. before the pending native rebuild), the app does
// NOT crash -- isSupporter falls back to the dev override / false and the purchase methods no-op.
//
// Purchases are tied to the Firebase user id (Purchases.logIn) so a Supporter's status restores across
// devices/reinstalls, matching the app's existing cloud-restore design.

type PurchaseResult = 'success' | 'cancelled' | 'error';

// The real membership facts, straight from the RevenueCat entitlement. NULL whenever there is no real
// entitlement (free user, OR Justin's __DEV__ toggle) -- surfaces must render NOTHING rather than a
// placeholder date. Honest-numbers rule: a shown date must be a real date.
export interface MembershipDetails {
  plan: 'monthly' | 'annual' | null;
  memberSince: Date | null;   // first purchase of the entitlement
  periodEnd: Date | null;     // end of the current paid period
  willRenew: boolean;         // false once they cancel -> periodEnd is when access ENDS, not a renewal
  // TRUE while the 7-day taste is what is unlocking the app (SPEC_monetization.md -> THE FIRST WEEK).
  // ⚠️ You CANNOT detect this from willRenew: that reads false for a free week AND for a cancelled
  // subscription, so it cannot tell them apart. The entitlement's SOURCE is the only honest signal.
  // Someone who buys mid-taste flips to false immediately, because RevenueCat serves whichever
  // entitlement reaches furthest and a real subscription always outlasts the days left.
  isFirstWeek: boolean;
}

interface MembershipValue {
  isSupporter: boolean;
  loading: boolean;
  details: MembershipDetails | null;       // null = no real entitlement (free, or the dev override)
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
  details: null,
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

const toDate = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
};

// Pull plan / member-since / period-end / will-renew off the active entitlement.
function readDetails(info: CustomerInfo | null | undefined): MembershipDetails | null {
  try {
    const ent = info?.entitlements?.active?.[SUPPORTER_ENTITLEMENT_ID];
    if (!ent) return null;
    const product = ent.productIdentifier || '';
    // RevenueCat reports the source as PROMOTIONAL for a granted entitlement, and its product id is
    // machine-generated with an rc_promo_ prefix. Checking both means neither a store rename nor a field
    // we are reading slightly wrong can silently turn a free week into "You're a Supporter".
    const store = String((ent as unknown as { store?: unknown }).store ?? '').toUpperCase();
    const isFirstWeek = store === 'PROMOTIONAL' || product.startsWith('rc_promo_');
    return {
      plan: product.includes('annual') ? 'annual' : product.includes('monthly') ? 'monthly' : null,
      memberSince: toDate(ent.originalPurchaseDate),
      periodEnd: toDate(ent.expirationDate),
      willRenew: !!ent.willRenew,
      isFirstWeek,
    };
  } catch {
    return null;
  }
}

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [entitled, setEntitled] = useState(false);
  const [details, setDetails] = useState<MembershipDetails | null>(null);
  const [devOverride, setDevOverride] = useState(false);
  // The mirror image of devOverride. Once you hold a REAL entitlement, turning the Supporter toggle off
  // does nothing -- `entitled` is true on its own -- so there was no way to look at the free-user pitch
  // again without cancelling your own subscription. This forces the free state in dev regardless.
  const [devForceFree, setDevForceFree] = useState(false);
  const [loading, setLoading] = useState(true);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [tipProducts, setTipProducts] = useState<PurchasesStoreProduct[]>([]);
  const configured = useRef(false);

  // The ONE place customer info lands. Entitlement + details always move together so a surface can
  // never show "Supporter" with stale dates (or vice versa).
  const applyCustomerInfo = useCallback((info: CustomerInfo | null | undefined) => {
    setEntitled(hasSupporterEntitlement(info));
    setDetails(readDetails(info));
  }, []);

  // DEV-ONLY: mirror the legacy Settings dev toggle so free-vs-Supporter is testable without a purchase.
  const readDevOverride = useCallback(async () => {
    if (!__DEV__) return;
    try {
      const raw = await AsyncStorage.getItem('pj_settings');
      if (raw) {
        const s = JSON.parse(raw);
        setDevOverride(!!s.devProUnlocked);
        setDevForceFree(!!s.devForceFree);
      }
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
      applyCustomerInfo(info);
      setLoading(false);
    };

    try {
      // INFO, not DEBUG: DEBUG logs every cache read and API request, which floods the Metro terminal
      // hundreds of lines at a time and lags the editor. INFO still shows what actually matters here --
      // purchases, entitlement changes, configuration -- which is what we need while the free/paid split
      // is being built. Raise it back to DEBUG temporarily if a specific RevenueCat call needs tracing.
      if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.INFO);
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
  }, [readDevOverride, loadStoreProducts, applyCustomerInfo]);

  // Tie RevenueCat identity to the Firebase account so purchases restore across devices/reinstalls.
  useEffect(() => {
    if (authLoading || !configured.current) return;
    (async () => {
      try {
        if (user?.uid) {
          const { customerInfo } = await Purchases.logIn(user.uid);
          applyCustomerInfo(customerInfo);
        } else {
          const info = await Purchases.logOut();
          applyCustomerInfo(info);
        }
        loadStoreProducts();
      } catch {
        // logOut throws if already anonymous; native module may be absent -> ignore, don't crash.
      }

      // 7-DAY TASTE, THE SAFETY NET. If the grant at the end of onboarding never reached the server, the
      // user is sitting on free limits during a week they were told was on us. Retry on the next launch
      // that has a signed-in account. Costs one AsyncStorage read when there is nothing pending.
      try {
        if (user?.uid && (await firstWeekClaimPending())) {
          const r = await claimFirstWeek();
          if (r.ok) {
            try { await Purchases.invalidateCustomerInfoCache(); } catch {}
            const info = await Purchases.getCustomerInfo();
            applyCustomerInfo(info);
          }
        }
      } catch {}
    })();
  }, [user?.uid, authLoading, loadStoreProducts, applyCustomerInfo]);

  // ⚠️ INVALIDATE FIRST. RevenueCat caches customer info on the device, so getCustomerInfo() alone can hand
  // back a stale answer -- proven 2026-07-31, when a server-side promotional grant did not appear in the app
  // until it was force-quit and reopened. Anything that changes entitlement OUTSIDE the SDK (the 7-day taste
  // grant, a comped tester) needs the cache cleared or the user sits on the old status.
  const refresh = useCallback(async () => {
    await readDevOverride();
    try {
      try { await Purchases.invalidateCustomerInfoCache(); } catch {}
      const info = await Purchases.getCustomerInfo();
      applyCustomerInfo(info);
    } catch {}
    loadStoreProducts();
  }, [readDevOverride, loadStoreProducts, applyCustomerInfo]);

  // Buy a subscription package. Updates entitlement on success. Also handles a PLAN CHANGE
  // (monthly -> annual): same call, same subscription group, Apple shows its own change sheet.
  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<PurchaseResult> => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      applyCustomerInfo(customerInfo);
      return 'success';
    } catch (e: any) {
      return e?.userCancelled ? 'cancelled' : 'error';
    }
  }, [applyCustomerInfo]);

  // Buy a one-time tip (consumable). Does NOT grant the entitlement (tips are gratitude, not perks); the
  // badge-for-tippers is handled separately in app code from purchase history.
  const purchaseTip = useCallback(async (product: PurchasesStoreProduct): Promise<PurchaseResult> => {
    try {
      const { customerInfo } = await Purchases.purchaseStoreProduct(product);
      applyCustomerInfo(customerInfo);
      return 'success';
    } catch (e: any) {
      return e?.userCancelled ? 'cancelled' : 'error';
    }
  }, [applyCustomerInfo]);

  const restore = useCallback(async (): Promise<boolean> => {
    try {
      const info = await Purchases.restorePurchases();
      applyCustomerInfo(info);
      return hasSupporterEntitlement(info);
    } catch {
      return false;
    }
  }, [applyCustomerInfo]);

  // Force-free wins over everything in dev, including a real entitlement -- that is its whole purpose.
  const isSupporter = (__DEV__ && devForceFree) ? false : (entitled || (__DEV__ && devOverride));

  // LAPSE GUARD, app-wide. The gold app icon is a Supporter perk, so a lapsed Supporter must not keep
  // wearing it. This lives HERE, not on the Settings screen: it was originally in Settings' effect, which
  // meant the icon only reverted if the user happened to OPEN Settings -- so a lapsed user kept the gold
  // icon indefinitely until they wandered in there, and then it changed under them out of nowhere.
  //
  // Gated on `loading` being false: during startup isSupporter is briefly false while RevenueCat resolves,
  // and enforcing then would rip the icon away from a perfectly valid Supporter on every single launch.
  useEffect(() => {
    if (loading) return;
    enforceIconEntitlement(isSupporter);
  }, [loading, isSupporter]);

  return (
    <MembershipContext.Provider
      value={{ isSupporter, loading, details, offering, tipProducts, purchasePackage, purchaseTip, restore, refresh }}
    >
      {children}
    </MembershipContext.Provider>
  );
}

export const useMembership = () => useContext(MembershipContext);
