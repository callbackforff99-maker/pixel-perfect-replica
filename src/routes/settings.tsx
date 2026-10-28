import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, Pill } from "lucide-react";
import { PageHead, Shell } from "@/components/Shell";
import { download, localDate, sleepCSV, update, useDB, wipe, type Settings } from "@/lib/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & privacy — SleeepX 3_4" },
      { name: "description", content: "Routine, reminders, privacy and data export." },
      { property: "og:title", content: "Settings — SleeepX 3_4" },
      { property: "og:description", content: "Routine, reminders, privacy and data export." },
    ],
  }),
  component: SettingsPage,
});

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function SettingsPage() {
  const db = useDB();
  const s = db.settings;
  const set = (p: Partial<Settings>) => update((d) => ({ ...d, settings: { ...d.settings, ...p } }));
  const [perm, setPerm] = useState<string>("unknown");
  useEffect(() => setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission), []);
  const anyReminder = s.windDown.enabled || s.morning.enabled;

  return (
    <Shell>
      <PageHead title="Settings" />
      <div className="space-y-4 px-4">
        <section className="card-x space-y-3">
          <h2 className="font-semibold">Routine & reminders</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-muted-foreground">Bedtime<input type="time" value={s.bedtime} onChange={(e) => set({ bedtime: e.target.value })} className="field mt-1" /></label>
            <label className="text-sm text-muted-foreground">Wake-up<input type="time" value={s.wake} onChange={(e) => set({ wake: e.target.value })} className="field mt-1" /></label>
          </div>
          <label className="flex items-center justify-between text-sm">
            <span>Wind-down reminder</span>
            <input type="checkbox" className="h-5 w-5 accent-primary" checked={s.windDown.enabled} onChange={(e) => set({ windDown: { ...s.windDown, enabled: e.target.checked } })} />
          </label>
          {s.windDown.enabled && (
            <select value={s.windDown.minutesBefore} onChange={(e) => set({ windDown: { ...s.windDown, minutesBefore: +e.target.value } })} className="field">
              {[15, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min before bedtime</option>)}
            </select>
          )}
          <label className="flex items-center justify-between text-sm">
            <span>Morning reminder</span>
            <input type="checkbox" className="h-5 w-5 accent-primary" checked={s.morning.enabled} onChange={(e) => set({ morning: { enabled: e.target.checked } })} />
          </label>
          <div className="flex justify-between">
            {DAYS.map((d, i) => (
              <button key={i} aria-pressed={s.weekdays.includes(i)} onClick={() => set({ weekdays: s.weekdays.includes(i) ? s.weekdays.filter((x) => x !== i) : [...s.weekdays, i].sort() })}
                className="h-9 w-9 rounded-full border border-border text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground">{d}</button>
            ))}
          </div>
          {anyReminder && perm !== "granted" && (
            <div className="rounded-lg bg-secondary p-3 text-sm">
              <p>Reminders need notification permission so your phone can alert you. Your routine still shows in the app without it.</p>
              {perm === "default" && <button onClick={async () => setPerm(await Notification.requestPermission())} className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-primary-foreground">Allow notifications</button>}
              {perm === "denied" && <p className="mt-2 text-muted-foreground">Blocked. Enable later in Android Settings → Apps → SleeepX → Notifications.</p>}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Delivery depends on the phone. On HyperOS, set battery to "No restrictions" and enable Autostart so reminders aren't delayed. In this preview, reminders are saved but not delivered — they fire only in the installed Android app.</p>
        </section>

        <Link to="/meds" className="card-x flex items-center gap-3">
          <Pill className="h-5 w-5 text-primary-glow" />
          <span className="flex-1">Medication reminders</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        <section className="card-x space-y-2">
          <h2 className="font-semibold">Home sections</h2>
          {(Object.keys(s.sections) as (keyof Settings["sections"])[]).map((k) => (
            <label key={k} className="flex items-center justify-between text-sm">
              <span>{{ lastSleep: "Last sleep", targets: "Targets", reminders: "Reminders", weekly: "Weekly summary" }[k]}</span>
              <input type="checkbox" className="h-5 w-5 accent-primary" checked={s.sections[k]} onChange={(e) => set({ sections: { ...s.sections, [k]: e.target.checked } })} />
            </label>
          ))}
        </section>

        <section className="card-x space-y-3 text-sm">
          <h2 className="font-semibold">Privacy</h2>
          <p className="text-muted-foreground">Everything stays on this device. No account, no cloud sync, no ads, no analytics. Data is stored locally but is <strong>not encrypted</strong>.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => download(`sleeepx-${localDate()}.json`, JSON.stringify(db, null, 2), "application/json")} className="rounded-lg border border-border px-3 py-2">Export all (JSON)</button>
            <button onClick={() => download(`sleeepx-sleep-${localDate()}.csv`, sleepCSV(db.sleep), "text/csv")} className="rounded-lg border border-border px-3 py-2">Sleep logs (CSV)</button>
          </div>
          <button onClick={() => confirm("Delete ALL local data? This can't be undone.") && confirm("Really delete everything?") && wipe()} className="w-full rounded-lg border border-destructive py-2 text-destructive">Delete all data</button>
        </section>
        <p className="text-center text-xs text-muted-foreground">SleeepX 3_4 · ZEROX</p>
      </div>
    </Shell>
  );
}
