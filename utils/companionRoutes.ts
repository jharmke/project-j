// utils/companionRoutes.ts
//
// The Companion's deep-link route table. The assistant references a screen with a [[route:key]]
// token (taught in the system prompt); the client (AssistantChat) turns each recognized token into
// a tappable pill that navigates here, and SILENTLY DROPS any unrecognized key (so a bad link can
// never send someone to a broken route). Same safety shape as the [[stat:key]] substitution.
//
// KEEP IN SYNC with the route-key list in functions/src/companionSystemPrompt.ts (the prompt tells
// the model which keys exist). If you add/rename a key here, update it there in the same session.
// Every path below is a real registered route (see app/_layout.tsx) or a tab; settings sections use
// the `section` deep-link param (settings.tsx auto-expands that section).

export type CompanionRoute = { path: string; params?: Record<string, string>; label: string };

export const COMPANION_ROUTES: Record<string, CompanionRoute> = {
  // Settings sections (auto-expand via the `section` param)
  appearance:    { path: '/settings', params: { section: 'appearance' },    label: 'Appearance settings' },
  goals:         { path: '/settings', params: { section: 'goals' },         label: 'Goals settings' },
  faith_style:   { path: '/settings', params: { section: 'faith_style' },   label: 'Faith & Style settings' },
  health:        { path: '/settings', params: { section: 'health' },        label: 'Health settings' },
  vacation:      { path: '/settings', params: { section: 'vacation' },      label: 'Vacation Mode' },
  notifications: { path: '/settings', params: { section: 'notifications' }, label: 'Notification settings' },
  settings:      { path: '/settings',                                       label: 'Settings' },

  // Destination screens
  sleep_hub:     { path: '/sleep',                                          label: 'Sleep' },
  recovery_hub:  { path: '/sleep', params: { tab: 'recovery' },             label: 'Recovery' },
  achievements:  { path: '/achievements',                                   label: 'Achievements' },
  challenges:    { path: '/challenges',                                     label: 'Challenges' },
  comparison:    { path: '/comparison-report',                             label: 'Comparison Report' },
  evr:           { path: '/diagnostic-report',                             label: 'Effort vs Results' },
  bible:         { path: '/bible',                                          label: 'Bible reader' },
  prayer:        { path: '/prayer',                                         label: 'Prayer' },
  plans:         { path: '/plans',                                          label: 'Reading Plans' },
  journal:       { path: '/journal',                                        label: 'Journal' },
  mission:       { path: '/mission',                                        label: 'What makes this app different' },
  body:          { path: '/body-measurements',                             label: 'Body Measurements' },

  // Tabs
  home:          { path: '/(tabs)',                                         label: 'Home' },
  workout:       { path: '/(tabs)/workout',                                 label: 'Workout tab' },
  log:           { path: '/(tabs)/log',                                     label: 'Log tab' },
  stats:         { path: '/(tabs)/stats',                                   label: 'Stats tab' },
  profile:       { path: '/(tabs)/profile',                                 label: 'Profile tab' },
  faith:         { path: '/(tabs)/faith',                                   label: 'Faith tab' },
};

// Deterministic fallback: the model (Haiku) is inconsistent about emitting [[route:key]] tokens, so
// the client ALSO scans a reply for these distinctive destination names and attaches the matching
// pill. Ordered most-specific first; DISTINCTIVE destination phrases only (no generic tab names or
// single common words), so a pill only appears when a reply genuinely points at that screen. Used
// by AssistantChat after the token pass; capped so pills never get noisy.
export const ROUTE_TRIGGERS: { key: string; phrases: string[] }[] = [
  { key: 'recovery_hub', phrases: ['sleep & recovery', 'sleep and recovery', 'recovery hub', 'recovery tab'] },
  { key: 'challenges',   phrases: ['challenges', 'new challenge'] },
  { key: 'achievements', phrases: ['achievements'] },
  { key: 'evr',          phrases: ['effort vs results', 'effort vs. results'] },
  { key: 'comparison',   phrases: ['comparison report'] },
  { key: 'vacation',     phrases: ['vacation mode'] },
  { key: 'faith_style',  phrases: ['faith & style', 'coaching mode', 'faith journey'] },
  { key: 'appearance',   phrases: ['appearance'] },
  { key: 'health',       phrases: ['apple health'] },
  { key: 'body',         phrases: ['body measurements'] },
  { key: 'goals',        phrases: ['goals settings', 'goals section'] },
  { key: 'bible',        phrases: ['bible reader'] },
];
