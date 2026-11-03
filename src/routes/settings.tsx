import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  Pill,
  LockKeyhole,
  Moon,
  Sun,
  ShieldCheck,
  Download,
  Trash2,
  Bell,
  CalendarDays,
  Clock3,
  Heart,
  LayoutGrid,
  Droplets,
  FileText,
  Settings2,
  Sparkles,
} from "lucide-react";
import { PageHead, Shell } from "@/components/Shell";
import {
  download,
  localDate,
  sleepCSV,
  update,
  useDB,
  wipe,
  type Settings,
} from "@/lib/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Privacy — SleeepX 3_4" },
      { name: "description", content: "Routine, reminders, privacy and data export." },
    ],
  }),
  component: SettingsPage,
});

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function SettingsPage() {
  const db = useDB();
  const s = db.settings;

  const [perm, setPerm] = useState<string>("unknown");

  const set = (p: Partial<Settings>) =>
    update((d) => ({
      ...d,
      settings: { ...d.settings, ...p },
    }));

  useEffect(() => {
    setPerm(
      typeof Notification === "undefined"
        ? "unsupported"
        : Notification.permission
    );
  }, []);

  const anyReminder = s.windDown.enabled || s.morning.enabled;

  const isDark = document.documentElement.classList.contains("dark");

  return (
    <Shell>
      <PageHead
        title="Settings"
        sub="Make SleeepX feel right for you."
      />

      <div className="space-y-5 px-4 pb-6">

        {/* Header card */}
        <section className="card-x relative overflow-hidden bg-gradient-to-br from-[#28151d] via-[#1b151c] to-[#111015] border border-[#47232e] p-5">
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2b2028] text-primary">
              <Settings2 size={23} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Personal space
              </p>
              <h2 className="mt-1 text-xl font-bold">
                Your preferences.
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A little control over your everyday care.
              </p>
            </div>
          </div>

          <Sparkles className="absolute -bottom-4 -right-3 h-24 w-24 text-primary/10" />
        </section>

        {/* Routine */}
        <section className="card-x space-y-5 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <Clock3 size={20} />
            </div>

            <div>
              <h2 className="font-bold">Routine & reminders</h2>
              <p className="text-xs text-muted-foreground">
                Build a gentle daily rhythm
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-medium text-muted-foreground">
              Bedtime
              <input
                type="time"
                value={s.bedtime}
                onChange={(e) => set({ bedtime: e.target.value })}
                className="field mt-2"
              />
            </label>

            <label className="text-xs font-medium text-muted-foreground">
              Wake-up
              <input
                type="time"
                value={s.wake}
                onChange={(e) => set({ wake: e.target.value })}
                className="field mt-2"
              />
            </label>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Moon size={19} className="text-primary" />
                <div>
                  <p className="text-sm font-semibold">Wind-down reminder</p>
                  <p className="text-xs text-muted-foreground">
                    Prepare for bedtime
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                className="h-5 w-5 accent-primary"
                checked={s.windDown.enabled}
                onChange={(e) =>
                  set({
                    windDown: {
                      ...s.windDown,
                      enabled: e.target.checked,
                    },
                  })
                }
              />
            </div>

            {s.windDown.enabled && (
              <select
                value={s.windDown.minutesBefore}
                onChange={(e) =>
                  set({
                    windDown: {
                      ...s.windDown,
                      minutesBefore: +e.target.value,
                    },
                  })
                }
                className="field"
              >
                {[15, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>
                    {m} min before bedtime
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Sun size={19} className="text-primary" />
                <div>
                  <p className="text-sm font-semibold">Morning reminder</p>
                  <p className="text-xs text-muted-foreground">
                    Start your day gently
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                className="h-5 w-5 accent-primary"
                checked={s.morning.enabled}
                onChange={(e) =>
                  set({
                    morning: { enabled: e.target.checked },
                  })
                }
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays size={17} className="text-primary" />
              <p className="text-sm font-semibold">Active days</p>
            </div>

            <div className="flex justify-between gap-1">
              {DAYS.map((day, i) => (
                <button
                  key={i}
                  aria-pressed={s.weekdays.includes(i)}
                  onClick={() =>
                    set({
                      weekdays: s.weekdays.includes(i)
                        ? s.weekdays.filter((x) => x !== i)
                        : [...s.weekdays, i].sort(),
                    })
                  }
                  className="h-10 w-10 rounded-full border border-border text-xs font-semibold transition-colors aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {anyReminder && perm !== "granted" && (
            <div className="rounded-2xl bg-secondary/70 p-4">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-primary" />
                <p className="text-sm font-semibold">
                  Notification permission
                </p>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Allow notifications so your phone can alert you about your routine.
              </p>

              {perm === "default" && (
                <button
                  onClick={async () =>
                    setPerm(await Notification.requestPermission())
                  }
                  className="mt-3 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                >
                  Allow notifications
                </button>
              )}

              {perm === "denied" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Blocked. Enable later in Android Settings → Apps → SleeepX → Notifications.
                </p>
              )}

              {perm === "unsupported" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Notifications are not supported in this environment.
                </p>
              )}
            </div>
          )}

          <p className="text-xs leading-relaxed text-muted-foreground">
            On HyperOS, set battery to No restrictions and enable Autostart
            so reminders aren't delayed. In this preview, reminders are saved
            but not delivered — they fire only in the installed Android app.
          </p>
        </section>

        {/* Appearance and security */}
        <section className="card-x space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <ShieldCheck size={20} />
            </div>

            <div>
              <h2 className="font-bold">Privacy & appearance</h2>
              <p className="text-xs text-muted-foreground">
                Control your app experience
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const dark = !document.documentElement.classList.contains("dark");
              document.documentElement.classList.toggle("dark", dark);
              localStorage.setItem("sleeepx.theme", dark ? "dark" : "light");
            }}
            className="flex w-full items-center gap-3 text-left"
          >
            {isDark ? (
              <Moon size={20} className="text-primary" />
            ) : (
              <Sun size={20} className="text-primary" />
            )}

            <span className="flex-1">
              <span className="block text-sm font-semibold">
                Light / Dark mode
              </span>
              <span className="block text-xs text-muted-foreground">
                Switch the Sage Calm color theme
              </span>
            </span>

            <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-primary">
              Toggle
            </span>
          </button>

          <div className="border-t border-border" />

          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new Event("sleeepx:manage-pin"))
            }
            className="flex w-full items-center gap-3 text-left"
          >
            <LockKeyhole size={20} className="text-primary" />

            <span className="flex-1">
              <span className="block text-sm font-semibold">
                PIN Security
              </span>
              <span className="block text-xs text-muted-foreground">
                Verify your current PIN before changing it
              </span>
            </span>

            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </section>

        {/* Medication */}
        <Link
          to="/meds"
          className="card-x flex items-center gap-3 p-5 transition-colors hover:bg-secondary/40"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
            <Pill size={20} />
          </div>

          <span className="flex-1">
            <span className="block text-sm font-bold">
              Medication reminders
            </span>
            <span className="block text-xs text-muted-foreground">
              Manage your prescribed medicine reminders
            </span>
          </span>

          <ChevronRight size={19} className="text-muted-foreground" />
        </Link>

        {/* Home sections */}
        <section className="card-x space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <LayoutGrid size={20} />
            </div>

            <div>
              <h2 className="font-bold">Home sections</h2>
              <p className="text-xs text-muted-foreground">
                Choose what appears on your home screen
              </p>
            </div>
          </div>

          {(
            Object.keys(s.sections) as (keyof Settings["sections"])[]
          ).map((key) => (
            <label
              key={key}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-sm font-medium">
                {{
                  lastSleep: "Last sleep",
                  targets: "Targets",
                  reminders: "Reminders",
                  weekly: "Weekly summary",
                }[key]}
              </span>

              <input
                type="checkbox"
                className="h-5 w-5 accent-primary"
                checked={s.sections[key]}
                onChange={(e) =>
                  set({
                    sections: {
                      ...s.sections,
                      [key]: e.target.checked,
                    },
                  })
                }
              />
            </label>
          ))}
        </section>

        {/* Data and privacy */}
        <section className="card-x space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <LockKeyhole size={20} />
            </div>

            <div>
              <h2 className="font-bold">Your data & privacy</h2>
              <p className="text-xs text-muted-foreground">
                Your information stays on this device
              </p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            No account, cloud sync, ads, or analytics. PIN protection helps
            control access in this app; it is not a substitute for Android
            device encryption.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() =>
                download(
                  "sleeepx-" + localDate() + ".json",
                  JSON.stringify(db, null, 2),
                  "application/json"
                )
              }
              className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-3 text-xs font-semibold"
            >
              <Download size={16} />
              Export all
            </button>

            <button
              onClick={() =>
                download(
                  "sleeepx-sleep-" + localDate() + ".csv",
                  sleepCSV(db.sleep),
                  "text/csv"
                )
              }
              className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-3 text-xs font-semibold"
            >
              <FileText size={16} />
              Sleep CSV
            </button>
          </div>

          <button
            onClick={() =>
              confirm("Delete ALL local data? This can't be undone.") &&
              confirm("Really delete everything?") &&
              wipe()
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 py-3 text-sm font-semibold text-destructive"
          >
            <Trash2 size={17} />
            Delete all data
          </button>
        </section>

        {/* Footer */}
        <div className="py-3 text-center">
          <p className="text-sm font-semibold text-primary">
            SleeepX 3_4
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your space. Your pace.
          </p>
        </div>
      </div>
    </Shell>
  );
}