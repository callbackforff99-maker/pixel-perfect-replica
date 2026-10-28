import { describe, expect, it } from "vitest";
import { durationMinutes, sleepStats, validateSleep, type SleepLog } from "./sleep";
import { migrate, validateMood } from "./store";

const log = (start: string, end: string, id = "a"): SleepLog => ({ id, start, end, createdAt: start, updatedAt: start });

describe("sleep", () => {
  it("handles overnight durations", () => {
    expect(durationMinutes("2026-01-01T23:30:00", "2026-01-02T07:00:00")).toBe(450);
  });
  it("rejects wake before start", () => {
    expect(validateSleep({ start: "2026-01-02T07:00:00", end: "2026-01-01T23:00:00" }, [])).toMatch(/after/);
  });
  it("rejects invalid timestamps", () => {
    expect(validateSleep({ start: "x", end: "y" }, [])).toMatch(/valid/);
  });
  it("rejects overlapping duplicates but allows editing itself", () => {
    const existing = [log("2026-01-01T23:00:00", "2026-01-02T07:00:00")];
    const input = { start: "2026-01-01T23:00:00", end: "2026-01-02T07:00:00" };
    expect(validateSleep(input, existing)).toMatch(/overlaps/);
    expect(validateSleep(input, existing, "a")).toBeNull();
  });
  it("averages bedtimes across midnight", () => {
    const now = new Date("2026-01-04T12:00:00");
    const s = sleepStats([log("2026-01-01T23:30:00", "2026-01-02T07:00:00", "a"), log("2026-01-03T00:30:00", "2026-01-03T08:00:00", "b")], 7, now);
    expect(s.bedtime).toBe("00:00");
    expect(s.count).toBe(2);
  });
});

describe("store", () => {
  it("migrates v1 data keeping records", () => {
    const db = migrate({ version: 1, sleep: [log("2026-01-01T23:00:00", "2026-01-02T07:00:00")], settings: { bedtime: "22:00" } });
    expect(db.version).toBe(2);
    expect(db.sleep).toHaveLength(1);
    expect(db.settings.bedtime).toBe("22:00");
    expect(db.settings.sections.weekly).toBe(true);
  });
  it("validates mood ratings", () => {
    expect(validateMood({ mood: 0 })).not.toBeNull();
    expect(validateMood({ mood: 3, stress: 6 })).not.toBeNull();
    expect(validateMood({ mood: 3 })).toBeNull();
  });
});
