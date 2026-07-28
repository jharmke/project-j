export const USDA_API_KEY = 'wWZincXQcTvP7B4RUH7z2BPBbqiiQJ8EbxkPE6b2';

// Google Sign-In iOS OAuth client ID. Shared between the initial sign-in screen and the
// Connected Accounts linking flow in Settings so both stay in sync.
export const GOOGLE_IOS_CLIENT_ID = '841973180275-obscsfo4ad9ibir9dtpcago5fuptojlg.apps.googleusercontent.com';

// RevenueCat iOS PUBLIC SDK key. Safe to ship in the app bundle -- this is the public app-specific
// key (starts with appl_), NOT a secret key. Used to configure Purchases at startup (MembershipContext).
export const REVENUECAT_IOS_KEY = 'appl_ERlhWDvhjeFzEczUcOgBiOyAGER';

// The RevenueCat entitlement identifier that grants Supporter status (created in the RC dashboard).
export const SUPPORTER_ENTITLEMENT_ID = 'supporter';

// The 4 one-time consumable tip product IDs (App Store Connect + RevenueCat), low -> high.
export const TIP_PRODUCT_IDS = ['tip_pitchin', 'tip_addfuel', 'tip_powerforward', 'tip_backmission', 'tip_founder'] as const;