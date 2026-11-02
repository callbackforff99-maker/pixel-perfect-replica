import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Moon, Wind, Smile, Bell, Sun, Clock3, Heart, Droplets, Phone,
  ChevronRight, BedDouble, Activity, Sparkles
} from "lucide-react";
import { Shell } from "@/components/Shell";
import { useDB, update } from "@/lib/store";
import { durationMinutes, fmtDuration, sleepStats } from "@/lib/sleep";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SleeepX — Home" },
      { name: "description", content: "Your personal sleep and wellness companion." },
    ],
  }),
  component: Home,
});

const t = (iso: string) =>
  new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

function Home() {
  const db = useDB();
  const s = db.settings;
  const last = [...db.sleep].sort((a, b) => b.end.localeCompare(a.end))[0];
  const week = sleepStats(db.sleep, 7);

  const reminders = [
    s.windDown.enabled &&
      `Wind-down · ${s.windDown.minutesBefore} min before ${s.bedtime}`,
    s.morning.enabled && `Morning · ${s.wake}`,
    ...db.meds
      .filter((m) => m.enabled)
      .flatMap((m) => m.times.map((tm) => `${m.name} · ${tm}`)),
  ].filter(Boolean) as string[];

  const today = new Date().toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Shell>
      <div className="space-y-6 px-4 pb-6">

        {/* HEADER */}
        <header className="flex items-center justify-between pt-2">
          <div>
            <p className="text-xs font-bold tracking-[0.22em] text-primary">
              SLEEEPX
            </p>
            <h1 className="mt-1 text-2xl font-bold">Your wellbeing</h1>
            <p className="mt-1 text-sm text-muted-foreground">{today}</p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Moon size={23} />
          </div>
        </header>

        {/* WELCOME CARD */}
        <section className="relative overflow-hidden rounded-[28px] bg-[#e5eee1] p-5 text-[#344b39] dark:bg-[#2b3c30] dark:text-[#e5eee1]">
          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-70">
              <Sparkles size={14} />
              A little peace for today
            </div>

            <h2 className="max-w-[240px] text-2xl font-bold leading-tight">
              Rest well.
              <br />
              Feel better.
            </h2>

            <p className="mt-2 max-w-[230px] text-sm opacity-75">
              Small steps towards a healthier sleep routine.
            </p>

            <Link
              to="/sleep"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#78977e] px-5 py-3 text-sm font-semibold text-white"
            >
              Track your sleep
              <ChevronRight size={16} />
            </Link>
          </div>

          <div className="pointer-events-none absolute -right-7 -top-5 flex h-44 w-44 items-center justify-center rounded-full bg-white/30 dark:bg-white/5">
            <Moon size={86} strokeWidth={1} className="opacity-40" />
          </div>
        </section>

        {/* DAILY CARE — promoted from Settings */}
        <section className="rounded-3xl border border-emerald-500/15 bg-card p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-primary">
              <Heart size={21} />
            </span>
            <div>
              <h2 className="font-bold">Daily Care</h2>
              <p className="text-xs text-muted-foreground">Small tools for your everyday wellbeing</p>
            </div>
          </div>
          <a href="#/daily" className="flex items-center justify-between rounded-2xl bg-secondary/70 p-4 text-sm font-semibold text-primary">
            Open Daily Care <ChevronRight size={18} />
          </a>
        </section>

        {/* MEDICATION REMINDERS — quick access from Home */}
        <section className="card-x space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Bell size={21} /></span>
              <div><h2 className="font-bold">Medication reminders</h2><p className="text-xs text-muted-foreground">{db.meds.filter(m => m.enabled).length} active reminders</p></div>
            </div>
            <Link to="/meds" className="rounded-xl bg-secondary px-3 py-2 text-sm font-semibold text-primary">Open</Link>
          </div>
          {db.meds.filter(m => m.enabled).length ? db.meds.filter(m => m.enabled).slice(0,3).map(m => (
            <div key={m.id} className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2 text-sm">
              <span className="font-medium">{m.name}</span><span className="text-muted-foreground">{m.times.join(" · ")}</span>
            </div>
          )) : <p className="text-sm text-muted-foreground">No reminders yet. Add your prescribed schedule.</p>}
        </section>

        {/* QUICK ACTIONS */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">Quick actions</h2>
            <span className="text-xs text-muted-foreground">Your daily care</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              {
                to: "/sleep",
                label: "Sleep log",
                icon: Moon,
                color: "bg-[#e8eee3]",
              },
              {
                to: "/calm",
                label: "Breathe",
                icon: Wind,
                color: "bg-[#e5eeeb]",
              },
              {
                to: "/journal",
                label: "Mood",
                icon: Smile,
                color: "bg-[#f1ecdf]",
              },
            ].map(({ to, label, icon: Icon, color }) => (
              <Link
                key={to}
                to={to}
                className="flex min-h-[108px] flex-col items-center justify-center gap-3 rounded-2xl border border-border/70 bg-card p-3 text-center transition-transform active:scale-95"
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}>
                  <Icon className="h-6 w-6 text-[#66866d]" />
                </span>
                <span className="text-xs font-semibold">{label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* LAST SLEEP */}
        {s.sections.lastSleep && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">Sleep overview</h2>
              <Link to="/sleep" className="text-xs font-semibold text-primary">
                View all
              </Link>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    LAST RECORDED SLEEP
                  </p>

                  {last ? (
                    <p className="mt-2 text-3xl font-bold tracking-tight">
                      {fmtDuration(durationMinutes(last.start, last.end))}
                    </p>
                  ) : (
                    <p className="mt-3 text-lg font-semibold">
                      No sleep recorded
                    </p>
                  )}

                  <p className="mt-2 text-xs text-muted-foreground">
                    {last
                      ? `${t(last.start)} — ${t(last.end)}`
                      : "Start tracking to see your sleep overview."}
                  </p>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <BedDouble size={27} />
                </div>
              </div>

              {!last && (
                <Link
                  to="/sleep"
                  className="mt-4 flex items-center justify-between rounded-xl bg-secondary p-3 text-sm font-semibold text-primary"
                >
                  Add your first sleep log
                  <ChevronRight size={17} />
                </Link>
              )}
            </div>
          </section>
        )}

        {/* TARGET ROUTINE */}
        {s.sections.targets && (
          <section>
            <h2 className="mb-3 text-base font-bold">Your sleep routine</h2>

            <div className="grid grid-cols-2 gap-3">
              <label className="rounded-2xl border border-border/70 bg-card p-4">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Moon size={15} className="text-primary" />
                  Target bedtime
                </span>
                <input
                  type="time"
                  value={s.bedtime}
                  onChange={(e) =>
                    update((d) => ({
                      ...d,
                      settings: { ...d.settings, bedtime: e.target.value },
                    }))
                  }
                  className="mt-3 w-full bg-transparent text-xl font-bold outline-none"
                />
              </label>

              <label className="rounded-2xl border border-border/70 bg-card p-4">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sun size={15} className="text-primary" />
                  Target wake
                </span>
                <input
                  type="time"
                  value={s.wake}
                  onChange={(e) =>
                    update((d) => ({
                      ...d,
                      settings: { ...d.settings, wake: e.target.value },
                    }))
                  }
                  className="mt-3 w-full bg-transparent text-xl font-bold outline-none"
                />
              </label>
            </div>
          </section>
        )}

        {/* WEEKLY SUMMARY */}
        {s.sections.weekly && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">Weekly summary</h2>
              <Activity size={18} className="text-primary" />
            </div>

            <div className="rounded-3xl border border-border/70 bg-card p-5">
              {week.count ? (
                <div className="grid grid-cols-3 divide-x divide-border text-center">
                  <div className="px-1">
                    <p className="text-xl font-bold">
                      {fmtDuration(Math.round(week.avg))}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Average sleep
                    </p>
                  </div>

                  <div className="px-1">
                    <p className="text-xl font-bold">{week.bedtime}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Bedtime
                    </p>
                  </div>

                  <div className="px-1">
                    <p className="text-xl font-bold">{week.count}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Sleep logs
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-3 text-center">
                  <Activity className="mx-auto mb-2 text-primary" size={25} />
                  <p className="text-sm font-semibold">Your week starts here</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Log your sleep to see your weekly progress.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* REMINDERS */}
        {s.sections.reminders && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">Reminders</h2>
              <Bell size={18} className="text-primary" />
            </div>

            <div className="rounded-3xl border border-border/70 bg-card p-4">
              {reminders.length ? (
                <ul className="space-y-3">
                  {reminders.map((r) => (
                    <li key={r} className="flex items-center gap-3 text-sm">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary">
                        <Clock3 size={17} />
                      </span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No reminders set. You can enable them in Settings.
                </p>
              )}
            </div>
          </section>
        )}

      </div>
    </Shell>
  );
}
