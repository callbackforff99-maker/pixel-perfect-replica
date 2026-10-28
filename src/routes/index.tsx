import { createFileRoute, Link } from "@tanstack/react-router";
import { Moon, Wind, Smile, Bell } from "lucide-react";
import { Shell } from "@/components/Shell";
import { useDB, update } from "@/lib/store";
import { durationMinutes, fmtDuration, sleepStats } from "@/lib/sleep";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SleeepX 3_4 — Home" },
      { name: "description", content: "Private sleep and calm dashboard." },
      { property: "og:title", content: "SleeepX 3_4" },
      { property: "og:description", content: "Private sleep and calm dashboard." },
    ],
  }),
  component: Home,
});

const t = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function Home() {
  const db = useDB();
  const s = db.settings;
  const last = [...db.sleep].sort((a, b) => b.end.localeCompare(a.end))[0];
  const week = sleepStats(db.sleep, 7);
  const reminders = [
    s.windDown.enabled && `Wind-down · ${s.windDown.minutesBefore} min before ${s.bedtime}`,
    s.morning.enabled && `Morning · ${s.wake}`,
    ...db.meds.filter((m) => m.enabled).flatMap((m) => m.times.map((tm) => `${m.name} · ${tm}`)),
  ].filter(Boolean) as string[];

  return (
    <Shell>
      <header className="mb-6 px-4">
        <p className="font-display text-sm font-bold tracking-[0.3em] text-primary-glow">SLEEEPX</p>
        <h1 className="mt-1 text-3xl font-bold">
          {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
        </h1>
      </header>
      <div className="space-y-3 px-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { to: "/sleep", label: "Log sleep", icon: Moon },
            { to: "/calm", label: "Breathe", icon: Wind },
            { to: "/journal", label: "Mood", icon: Smile },
          ].map(({ to, label, icon: I }) => (
            <Link key={to} to={to} className="card-x flex flex-col items-center gap-2 text-sm hover:border-primary">
              <I className="h-5 w-5 text-primary-glow" />
              {label}
            </Link>
          ))}
        </div>

        {s.sections.lastSleep && (
          <section className="card-x shadow-glow">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Last recorded sleep</p>
            {last ? (
              <>
                <p className="mt-2 font-display text-4xl font-bold">{fmtDuration(durationMinutes(last.start, last.end))}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(last.start)} → {t(last.end)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No sleep logged yet. <Link to="/sleep" className="text-primary-glow">Add your first night</Link>.
              </p>
            )}
          </section>
        )}

        {s.sections.targets && (
          <section className="card-x grid grid-cols-2 gap-3">
            {(["bedtime", "wake"] as const).map((k) => (
              <label key={k} className="text-xs uppercase tracking-widest text-muted-foreground">
                {k === "bedtime" ? "Target bedtime" : "Target wake"}
                <input
                  type="time"
                  value={s[k]}
                  onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, [k]: e.target.value } }))}
                  className="field mt-1 text-lg"
                />
              </label>
            ))}
          </section>
        )}

        {s.sections.reminders && (
          <section className="card-x">
            <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Bell className="h-3.5 w-3.5" /> Reminders
            </p>
            {reminders.length ? (
              <ul className="space-y-1 text-sm">{reminders.map((r) => <li key={r}>{r}</li>)}</ul>
            ) : (
              <p className="text-sm text-muted-foreground">None set. Turn them on in Settings.</p>
            )}
          </section>
        )}

        {s.sections.weekly && (
          <section className="card-x">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Last 7 days</p>
            {week.count ? (
              <div className="mt-2 grid grid-cols-3 text-center">
                <div><p className="font-display text-xl font-bold">{fmtDuration(Math.round(week.avg))}</p><p className="text-xs text-muted-foreground">avg</p></div>
                <div><p className="font-display text-xl font-bold">{week.bedtime}</p><p className="text-xs text-muted-foreground">bedtime</p></div>
                <div><p className="font-display text-xl font-bold">{week.count}</p><p className="text-xs text-muted-foreground">logs</p></div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Your weekly summary appears after you log a night.</p>
            )}
          </section>
        )}
      </div>
    </Shell>
  );
}
