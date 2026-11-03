import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Pencil,
  Trash2,
  Moon,
  Clock3,
  Sparkles,
  CalendarDays,
  BedDouble,
} from "lucide-react";
import { PageHead, Rating, Shell } from "@/components/Shell";
import { localDate, nowISO, toLocalInput, uid, update, useDB } from "@/lib/store";
import {
  durationMinutes,
  fmtDuration,
  sleepStats,
  validateSleep,
  type SleepLog,
} from "@/lib/sleep";

export const Route = createFileRoute("/sleep")({
  head: () => ({
    meta: [
      { title: "Sleep log & reports — SleeepX 3_4" },
      { name: "description", content: "Log nights and view sleep reports." },
      { property: "og:title", content: "Sleep — SleeepX 3_4" },
      { property: "og:description", content: "Log nights and view sleep reports." },
    ],
  }),
  component: SleepPage,
});

function defaults() {
  const end = new Date();
  end.setSeconds(0, 0);
  const start = new Date(end.getTime() - 8 * 3600000);

  return {
    start: toLocalInput(start.toISOString()),
    end: toLocalInput(end.toISOString()),
    awakenings: "",
    quality: undefined as number | undefined,
    notes: "",
  };
}

function SleepPage() {
  const db = useDB();

  const [form, setForm] = useState(defaults);
  const [editing, setEditing] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [range, setRange] = useState<1 | 7 | 30>(7);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    const input = {
      start:
        new Date(form.start).toString() === "Invalid Date"
          ? "x"
          : new Date(form.start).toISOString(),
      end:
        new Date(form.end).toString() === "Invalid Date"
          ? "x"
          : new Date(form.end).toISOString(),
      awakenings:
        form.awakenings === "" ? undefined : Number(form.awakenings),
      quality: form.quality,
    };

    const logDay = localDate(new Date(input.end));
    const alreadyLogged = db.sleep.some(
      (log) => log.id !== editing && localDate(new Date(log.end)) === logDay,
    );
    if (alreadyLogged) {
      setErr("Only one sleep log is allowed per day. Edit the existing day's log instead.");
      setMsg(null);
      return;
    }

    const validation = validateSleep(
      input,
      db.sleep,
      editing ?? undefined,
    );

    setErr(validation);
    setMsg(null);

    if (validation) return;

    const timestamp = nowISO();

    const ok = update((d) => ({
      ...d,
      sleep: editing
        ? d.sleep.map((log) =>
            log.id === editing
              ? {
                  ...log,
                  ...input,
                  notes: form.notes || undefined,
                  updatedAt: timestamp,
                }
              : log,
          )
        : [
            ...d.sleep,
            {
              id: uid(),
              ...input,
              notes: form.notes || undefined,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          ],
    }));

    if (ok) {
      setMsg(
        editing
          ? "Your sleep log has been updated."
          : "Sleep log saved. Rest well.",
      );

      setEditing(null);
      setForm(defaults());
    } else {
      setErr("Couldn't save — storage unavailable.");
    }
  };

  const edit = (log: SleepLog) => {
    setEditing(log.id);

    setForm({
      start: toLocalInput(log.start),
      end: toLocalInput(log.end),
      awakenings: log.awakenings?.toString() ?? "",
      quality: log.quality,
      notes: log.notes ?? "",
    });

    setErr(null);
    setMsg(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const del = (id: string) => {
    const savedPin = window.localStorage.getItem("sleeepx.pin.v1");
    if (!savedPin) {
      alert("Set a PIN in Settings before deleting sleep data.");
      return;
    }
    const enteredPin = window.prompt("Enter your SleeepX PIN to delete this day's sleep data.");
    if (enteredPin !== savedPin) {
      alert("Incorrect PIN. Nothing was deleted.");
      return;
    }
    if (!confirm("Delete this day's sleep data? This cannot be undone.")) return;
    update((d) => ({ ...d, sleep: d.sleep.filter((log) => log.id !== id) }));
  };

  const stats = sleepStats(db.sleep, range);

  const chart = [...stats.logs]
    .sort((a, b) => a.end.localeCompare(b.end))
    .map((log) => ({
      day: new Date(log.end).toLocaleDateString([], {
        month: "short",
        day: "numeric",
      }),
      hours: +(
        durationMinutes(log.start, log.end) / 60
      ).toFixed(2),
    }));

  const history = [...db.sleep].sort((a, b) =>
    b.end.localeCompare(a.end),
  );

  return (
    <Shell>
      <PageHead
        title="Sleep"
        sub="A little record of how well you rest."
      />

      <div className="space-y-5 px-4 pb-5">

        {/* HERO SECTION */}
        <section className="relative overflow-hidden rounded-[1.6rem] border border border-[#47232e] bg-gradient-to-br from-[#28151d] via-[#1b151c] to-[#111015] p-5">

          <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[#bd3654]/15 blur-2xl" />

          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#e45170]">
                <Moon className="h-3.5 w-3.5" />
                Your rest matters
              </p>

              <h2 className="max-w-[230px] text-2xl font-bold leading-tight">
                Understand your sleep, one night at a time.
              </h2>

              <p className="mt-2 max-w-[250px] text-sm leading-relaxed text-[#b5a5ad]">
                Keep track of your nights. Notice your patterns without pressure.
              </p>
            </div>

            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#2b2028] text-[#e45170] shadow-sm">
              <BedDouble className="h-7 w-7" />
            </div>
          </div>

          <div className="relative mt-5 flex items-center gap-2 text-xs font-medium text-[#b5a5ad]">
            <Sparkles className="h-4 w-4" />
            Small steps. Softer nights.
          </div>
        </section>

        {/* SLEEP JOURNAL FORM */}
        <form
          onSubmit={submit}
          className="card-x space-y-4 !rounded-[1.4rem] !p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {editing ? "Update record" : "Sleep journal"}
              </p>

              <h2 className="mt-1 text-xl font-bold">
                {editing ? "Edit this night" : "Log your sleep"}
              </h2>
            </div>

            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary text-primary">
              <Clock3 className="h-5 w-5" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Fell asleep

              <span className="mt-1.5 block">
                <input
                  type="datetime-local"
                  required
                  value={form.start}
                  onChange={(e) =>
                    setForm({ ...form, start: e.target.value })
                  }
                  className="field"
                />
              </span>
            </label>

            <label className="block text-sm font-medium">
              Woke up

              <span className="mt-1.5 block">
                <input
                  type="datetime-local"
                  required
                  value={form.end}
                  onChange={(e) =>
                    setForm({ ...form, end: e.target.value })
                  }
                  className="field"
                />
              </span>
            </label>
          </div>

          <label className="block text-sm font-medium">
            Night awakenings{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>

            <input
              type="number"
              min={0}
              max={50}
              value={form.awakenings}
              onChange={(e) =>
                setForm({ ...form, awakenings: e.target.value })
              }
              placeholder="How many times did you wake up?"
              className="field mt-1.5"
            />
          </label>

          <div className="rounded-2xl bg-secondary/70 p-3">
            <Rating
              label="How did your sleep feel?"
              value={form.quality}
              onChange={(quality) =>
                setForm({ ...form, quality })
              }
            />
          </div>

          <label className="block text-sm font-medium">
            A note about this night{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>

            <textarea
              placeholder="Anything you want to remember..."
              value={form.notes}
              onChange={(e) =>
                setForm({ ...form, notes: e.target.value })
              }
              className="field mt-1.5 resize-none"
              rows={3}
            />
          </label>

          {err && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {err}
            </p>
          )}

          {msg && (
            <p
              role="status"
              className="rounded-xl bg-secondary px-3 py-2 text-sm text-primary"
            >
              {msg}
            </p>
          )}

          <div className="flex gap-2">
            <button className="flex-1 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground shadow-glow">
              {editing ? "Save changes" : "Save sleep log"}
            </button>

            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm(defaults());
                  setErr(null);
                  setMsg(null);
                }}
                className="rounded-xl border border-border px-4 font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* SLEEP INSIGHTS */}
        <section className="card-x !rounded-[1.4rem] !p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Your patterns
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Sleep insights
              </h2>
            </div>

            <CalendarDays className="h-5 w-5 text-primary" />
          </div>

          <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
            {([1, 7, 30] as const).map((r) => (
              <button
                type="button"
                key={r}
                aria-pressed={range === r}
                onClick={() => setRange(r)}
                className="rounded-lg px-2 py-2 text-xs font-semibold aria-pressed:bg-card aria-pressed:text-primary aria-pressed:shadow-sm"
              >
                {r === 1 ? "Today" : r === 7 ? "7 days" : "30 days"}
              </button>
            ))}
          </div>

          {stats.count ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Stat
                  k="Average sleep"
                  v={fmtDuration(Math.round(stats.avg))}
                />

                <Stat
                  k="Variation"
                  v={fmtDuration(Math.round(stats.sd))}
                />

                <Stat
                  k="Typical bedtime"
                  v={stats.bedtime!}
                />

                <Stat
                  k="Typical wake-up"
                  v={stats.wake!}
                />
              </div>

              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {stats.count} completed{" "}
                {stats.count === 1 ? "log" : "logs"} ·
                Estimates from your entries, not a medical measurement.
              </p>

              {chart.length > 1 && (
                <div className="mt-5 h-48">
                  <p className="mb-2 text-sm font-semibold">
                    Hours slept
                  </p>

                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chart}
                      margin={{
                        top: 4,
                        right: 4,
                        left: -20,
                        bottom: 0,
                      }}
                    >
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        stroke="var(--muted-foreground)"
                        fontSize={10}
                      />

                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        stroke="var(--muted-foreground)"
                        fontSize={10}
                        width={28}
                      />

                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                        }}
                        formatter={(value) => [
                         String(value) + " hours",
                          "Sleep",
                        ]}
                      />

                      <Bar
                        dataKey="hours"
                        fill="var(--primary)"
                        radius={[7, 7, 7, 7]}
                        maxBarSize={32}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl bg-secondary/70 px-4 py-7 text-center">
              <Moon className="mx-auto mb-2 h-7 w-7 text-primary/70" />

              <p className="font-semibold">
                Your sleep story starts here
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Save a sleep log to see your patterns and insights.
              </p>
            </div>
          )}
        </section>

        {/* SLEEP HISTORY */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Past nights
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Sleep history
              </h2>
            </div>

            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              {history.length} logs
            </span>
          </div>

          {!history.length && (
            <div className="card-x rounded-2xl py-6 text-center text-sm text-muted-foreground">
              Nothing here yet. Your saved nights will appear here.
            </div>
          )}

          <ul className="space-y-2.5">
            {history.map((log) => (
              <li
                key={log.id}
                className="card-x flex items-center justify-between gap-3 !rounded-2xl !p-3.5"
              >
                <div className="min-w-0">
                  <p className="text-lg font-bold">
                    {fmtDuration(
                      durationMinutes(log.start, log.end),
                    )}
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(log.start).toLocaleDateString([], {
                      dateStyle: "medium",
                    })}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(log.start).toLocaleTimeString([], {
                      timeStyle: "short",
                    })}
                    {" → "}
                    {new Date(log.end).toLocaleTimeString([], {
                      timeStyle: "short",
                    })}
                    {log.quality ? " · quality " + log.quality + "/5" : ""}
                  </p>

                  {log.notes && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {log.notes}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    aria-label="Edit sleep log"
                    onClick={() => edit(log)}
                    className="rounded-xl bg-secondary p-2.5 text-muted-foreground hover:text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    aria-label="Delete sleep log"
                    onClick={() => del(log.id)}
                    className="rounded-xl bg-secondary p-2.5 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Shell>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl bg-secondary p-3.5">
      <p className="text-xs text-muted-foreground">{k}</p>
      <p className="mt-1 font-display text-lg font-bold">{v}</p>
    </div>
  );
}