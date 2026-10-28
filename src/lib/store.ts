import { useSyncExternalStore } from "react";
import type { SleepLog } from "./sleep";

/**
 * Browser-preview persistence adapter (localStorage, versioned schema).
 * The Android build should swap this for a SQLite repository with the same API.
 */
export type MoodEntry = {
  id: string;
  date: string; // local YYYY-MM-DD
  mood: number;
  stress?: number;
  energy?: number;
  text?: string;
  createdAt: string;
  updatedAt: string;
};
export type Medication = {
  id: string;
  name: string;
  instructions?: string;
  times: string[];
  startDate: string;
  endDate?: string;
  enabled: boolean;
  notes?: string;
};
export type MedEvent = { id: string; medId: string; at: string; action: "taken" | "dismissed" };
export type BreathSession = { id: string; at: string; seconds: number; completed: boolean };
export type Settings = {
  bedtime: string;
  wake: string;
  windDown: { enabled: boolean; minutesBefore: number };
  morning: { enabled: boolean };
  weekdays: number[];
  sections: { lastSleep: boolean; targets: boolean; reminders: boolean; weekly: boolean };
  sound: boolean;
};

export type DB = {
  version: number;
  sleep: SleepLog[];
  mood: MoodEntry[];
  meds: Medication[];
  medEvents: MedEvent[];
  breath: BreathSession[];
  settings: Settings;
};

export const SCHEMA_VERSION = 2;
const KEY = "sleeepx.db";

export const defaultSettings: Settings = {
  bedtime: "23:00",
  wake: "07:00",
  windDown: { enabled: false, minutesBefore: 30 },
  morning: { enabled: false },
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  sections: { lastSleep: true, targets: true, reminders: true, weekly: true },
  sound: false,
};

export function emptyDB(): DB {
  return { version: SCHEMA_VERSION, sleep: [], mood: [], meds: [], medEvents: [], breath: [], settings: defaultSettings };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrate(raw: any): DB {
  const db = { ...emptyDB(), ...raw };
  if (!raw.version || raw.version < 2) {
    db.settings = { ...defaultSettings, ...(raw.settings ?? {}), sections: { ...defaultSettings.sections, ...(raw.settings?.sections ?? {}) } };
    db.breath = raw.breath ?? [];
  }
  db.version = SCHEMA_VERSION;
  return db;
}

let cache: DB | null = null;
export let dbError: string | null = null;
const listeners = new Set<() => void>();
const SERVER = emptyDB();

function load(): DB {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? migrate(JSON.parse(raw)) : emptyDB();
  } catch (e) {
    dbError = "Local storage couldn't be opened. Nothing will be saved.";
    cache = emptyDB();
    console.error(e);
  }
  return cache;
}

export function update(fn: (db: DB) => DB): boolean {
  const next = fn(load());
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    dbError = "Saving failed — storage is unavailable or full.";
    listeners.forEach((l) => l());
    return false;
  }
  cache = next;
  listeners.forEach((l) => l());
  return true;
}

export function wipe() {
  localStorage.removeItem(KEY);
  cache = emptyDB();
  listeners.forEach((l) => l());
}

export function useDB(): DB {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    load,
    () => SERVER,
  );
}

export const uid = () => crypto.randomUUID();
export const nowISO = () => new Date().toISOString();
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function toLocalInput(iso: string) {
  const d = new Date(iso);
  return `${localDate(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function sleepCSV(logs: SleepLog[]) {
  const esc = (s = "") => `"${s.replace(/"/g, '""')}"`;
  return ["start,end,awakenings,quality,notes", ...logs.map((l) => [l.start, l.end, l.awakenings ?? "", l.quality ?? "", esc(l.notes)].join(","))].join("\n");
}

export function validateMood(m: { mood: number; stress?: number; energy?: number }) {
  const ok = (v?: number) => v === undefined || (Number.isInteger(v) && v >= 1 && v <= 5);
  if (!Number.isInteger(m.mood) || m.mood < 1 || m.mood > 5) return "Pick a mood from 1 to 5.";
  if (!ok(m.stress) || !ok(m.energy)) return "Ratings must be 1–5.";
  return null;
}
