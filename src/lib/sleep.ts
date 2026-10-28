export type SleepLog = {
  id: string;
  start: string; // ISO
  end: string; // ISO
  awakenings?: number | undefined | undefined;
  quality?: number | undefined | undefined;
  notes?: string | undefined;
  createdAt: string;
  updatedAt: string;
};

export const MAX_SLEEP_MIN = 20 * 60;

export function durationMinutes(startISO: string, endISO: string): number {
  return Math.round((new Date(endISO).getTime() - new Date(startISO).getTime()) / 60000);
}

export function validateSleep(
  input: { start: string; end: string; quality?: number | undefined | undefined; awakenings?: number | undefined },
  existing: SleepLog[],
  ignoreId?: string,
): string | null {
  const s = new Date(input.start).getTime();
  const e = new Date(input.end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return "Enter valid start and wake times.";
  if (e <= s) return "Wake time must be after sleep start.";
  if (e - s > MAX_SLEEP_MIN * 60000) return "Sleep longer than 20 hours looks like a mistake.";
  if (e > Date.now() + 5 * 60000) return "Wake time can't be in the future.";
  if (input.quality !== undefined && (input.quality < 1 || input.quality > 5)) return "Quality must be 1–5.";
  if (input.awakenings !== undefined && (input.awakenings < 0 || input.awakenings > 50)) return "Awakenings must be 0–50.";
  const overlap = existing.find(
    (l) => l.id !== ignoreId && new Date(l.start).getTime() < e && new Date(l.end).getTime() > s,
  );
  if (overlap) return "This overlaps an existing sleep log — edit that one instead.";
  return null;
}

export function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.abs(min % 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

/** minutes after 18:00, so bedtimes around midnight average correctly */
function clockFromEvening(iso: string) {
  const d = new Date(iso);
  return (d.getHours() * 60 + d.getMinutes() - 18 * 60 + 1440) % 1440;
}
function clockOfDay(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}
export function fmtClock(min: number) {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function sleepStats(logs: SleepLog[], days: number, now = new Date()) {
  const cutoff = now.getTime() - days * 86400000;
  const inRange = logs.filter((l) => new Date(l.end).getTime() >= cutoff);
  const durs = inRange.map((l) => durationMinutes(l.start, l.end));
  const n = durs.length;
  if (!n) return { count: 0, avg: 0, sd: 0, bedtime: null as string | null, wake: null as string | null, logs: inRange };
  const avg = durs.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(durs.reduce((a, b) => a + (b - avg) ** 2, 0) / n);
  const bed = inRange.reduce((a, l) => a + clockFromEvening(l.start), 0) / n + 18 * 60;
  const wake = inRange.reduce((a, l) => a + clockOfDay(l.end), 0) / n;
  return { count: n, avg, sd, bedtime: fmtClock(bed), wake: fmtClock(wake), logs: inRange };
}
