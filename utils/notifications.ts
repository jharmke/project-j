// utils/notifications.ts
//
// The in-app notification hub store (SPEC_otto_notifications.md). A tiny persisted list of
// "worth-seeing" notifications (wins/results + the future adaptive-TDEE suggestion), surfaced
// through Otto's FAB badge + a bell in Otto's chat header. This is SEPARATE from push notifications
// (SPEC_notifications.md handles those / reminders).
//
// LIFECYCLE:
//  - 'replace' (Type A): a single current STATE. A new one with the same id overwrites the old
//    (e.g. the adaptive-TDEE suggestion; a new weekly number replaces the stale one).
//  - 'stack'   (Type B): a discrete EVENT worth seeing on its own (achievements, goal hits, records).
//    Stacks newest-first. Deduped by a STABLE id so the same real event can't be added twice.
//
// Storage: pj_notifications (device-local; notifications are ephemeral). Read-then-merge via an
// in-memory cache; every write emits so the FAB badge + panel update reactively.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const KEY = 'pj_notifications';
const MAX = 100; // hard cap so the list can never grow unbounded

export type NotifLifecycle = 'replace' | 'stack';
export type NotifCategory =
  | 'tdee_suggestion' | 'achievement' | 'daily_goal' | 'record' | 'summary_ready';

export interface NotifItem {
  id: string;                 // stable id: category key for 'replace', per-event id for 'stack'
  lifecycle: NotifLifecycle;
  category: NotifCategory;
  title: string;
  body?: string;
  icon?: string;              // Ionicon name
  iconColor?: string;
  createdAt: number;          // epoch ms
  read: boolean;
  route?: { pathname: string; params?: Record<string, any> }; // tap destination
  data?: any;                 // reserved for inline actions (e.g. TDEE accept/dismiss)
}

// ── in-memory cache + reactive listeners ─────────────────────────────────────
let cache: NotifItem[] | null = null;
const listeners = new Set<() => void>();
function emit() { listeners.forEach(fn => { try { fn(); } catch {} }); }

// ── tour demo overlay ────────────────────────────────────────────────────────
// The guided notification-hub tour needs a realistic pending item so the FAB badge lights up and the
// panel isn't empty mid-walkthrough. This is a DISPLAY-ONLY overlay: it is prepended by the hook,
// never persisted, never written to pj_notifications. So it cannot touch real data, and it vanishes
// the instant the tour ends. Same spirit as the tutorial ifCardState/yvyDemo demo states.
let tourDemoActive = false;
let tourDemoItem: NotifItem | null = null;
export function setNotifTourDemo(active: boolean): void {
  tourDemoActive = active;
  tourDemoItem = active
    ? {
        id: '__tour_demo__', lifecycle: 'stack', category: 'achievement',
        title: 'Sixty Strong', body: 'You logged food 60 days in a row.',
        icon: 'trophy', iconColor: '#d4860a', createdAt: Date.now(), read: false,
      }
    : null;
  emit();
}

export function subscribeNotifications(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

async function load(): Promise<NotifItem[]> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as NotifItem[]) : [];
    if (!Array.isArray(cache)) cache = [];
  } catch { cache = []; }
  return cache!;
}

async function persist(list: NotifItem[]) {
  cache = list;
  try { await AsyncStorage.setItem(KEY, JSON.stringify(list)); } catch {}
  emit();
}

// ── public API ───────────────────────────────────────────────────────────────

// Add (or replace) a notification. Fire-and-forget from synchronous callers is fine.
export async function addNotification(
  input: Omit<NotifItem, 'read' | 'createdAt'> & { read?: boolean; createdAt?: number },
): Promise<void> {
  const list = (await load()).slice();
  const idx = list.findIndex(x => x.id === input.id);
  const item: NotifItem = { read: false, createdAt: Date.now(), ...input };
  if (input.lifecycle === 'replace') {
    if (idx >= 0) list[idx] = { ...item, createdAt: item.createdAt }; else list.unshift(item);
  } else {
    if (idx >= 0) return; // stack dedupe: this exact event is already in the list
    list.unshift(item);
  }
  await persist(list.slice(0, MAX));
}

export async function getNotifications(): Promise<NotifItem[]> {
  return (await load()).slice();
}

export async function markAllRead(): Promise<void> {
  const list = await load();
  if (list.every(n => n.read)) return;
  await persist(list.map(n => (n.read ? n : { ...n, read: true })));
}

// Mark only specific ids read (used to mark "the ones you actually saw" on panel close, so a
// collapsed group you never expanded keeps its unread dots).
export async function markReadIds(ids: string[]): Promise<void> {
  const set = new Set(ids);
  const list = await load();
  if (!list.some(n => set.has(n.id) && !n.read)) return;
  await persist(list.map(n => (set.has(n.id) && !n.read ? { ...n, read: true } : n)));
}

export async function clearNotification(id: string): Promise<void> {
  await persist((await load()).filter(n => n.id !== id));
}

export async function clearAllNotifications(): Promise<void> {
  await persist([]);
}

// ── React hook for the badge + panel ─────────────────────────────────────────
export function useNotifications() {
  const [items, setItems] = useState<NotifItem[]>([]);
  const [demo, setDemo] = useState<NotifItem | null>(tourDemoItem);
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      if (!alive) return;
      setDemo(tourDemoItem);
      getNotifications().then(l => { if (alive) setItems(l); });
    };
    refresh();
    const unsub = subscribeNotifications(refresh);
    return () => { alive = false; unsub(); };
  }, []);
  // The tour demo item is display-only (prepended here, never in the persisted list above).
  const list = demo ? [demo, ...items] : items;
  const unread = list.reduce((n, i) => (i.read ? n : n + 1), 0);
  return { items: list, unread };
}
