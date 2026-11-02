import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Pencil, Trash2, BookHeart, Sparkles, CalendarDays } from "lucide-react";
import { PageHead, Rating, Shell } from "@/components/Shell";
import {
  localDate,
  nowISO,
  uid,
  update,
  useDB,
  validateMood,
  type MoodEntry,
} from "@/lib/store";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "Mood Journal — SleeepX 3_4" },
      { name: "description", content: "Private daily mood check-in." },
    ],
  }),
  component: Journal,
});

type Form = {
  date: string;
  mood?: number;
  stress?: number;
  energy?: number;
  text: string;
};

const blank = (): Form => ({ date: localDate(), text: "" });

function Journal() {
  const db = useDB();
  const [f, setF] = useState<Form>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateMood({
      mood: f.mood ?? 0,
      stress: f.stress,
      energy: f.energy,
    });

    setErr(validation);
    if (validation) return;

    const timestamp = nowISO();

    const data = {
      date: f.date,
      mood: f.mood!,
      stress: f.stress,
      energy: f.energy,
      text: f.text || undefined,
    };

    const ok = update((d) => ({
      ...d,
      mood: editing
        ? d.mood.map((m) =>
            m.id === editing ? { ...m, ...data, updatedAt: timestamp } : m
          )
        : [
            ...d.mood,
            {
              id: uid(),
              ...data,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          ],
    }));

    if (!ok) return setErr("Couldn't save — storage unavailable.");

    setEditing(null);
    setF(blank());
    setErr(null);
  };

  const edit = (m: MoodEntry) => {
    setEditing(m.id);
    setF({
      date: m.date,
      mood: m.mood,
      stress: m.stress,
      energy: m.energy,
      text: m.text ?? "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const del = (id: string) =>
    confirm("Delete this entry?") &&
    update((d) => ({
      ...d,
      mood: d.mood.filter((m) => m.id !== id),
    }));

  const entries = [...db.mood].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.createdAt.localeCompare(a.createdAt)
  );

  const weekAgo = localDate(new Date(Date.now() - 6 * 86400000));

  const chart = [...entries]
    .reverse()
    .filter((m) => m.date >= weekAgo)
    .map((m) => ({
      d: m.date.slice(5),
      mood: m.mood,
      stress: m.stress,
      energy: m.energy,
    }));

  return (
    <Shell>
      <PageHead
        title="Mood Journal"
        sub="A little space to understand how you feel."
      />

      <div className="space-y-5 px-4 pb-6">

        {/* Welcome */}
        <section className="card-x relative overflow-hidden border-0 bg-gradient-to-br from-[#e9f0e7] via-[#f4f7f1] to-[#e3ece3] p-5 dark:from-[#26372c] dark:via-[#293a30] dark:to-[#304337]">
          <div className="relative z-10 flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-primary dark:bg-white/10">
              <BookHeart size={22} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Your private space
              </p>
              <h2 className="mt-1 text-xl font-bold">
                How are you feeling?
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                No pressure. No judgment. Just be honest with yourself.
              </p>
            </div>
          </div>

          <Sparkles className="absolute -bottom-4 -right-3 h-24 w-24 text-primary/10" />
        </section>

        {/* Check-in form */}
        <form onSubmit={save} className="card-x space-y-5 p-5">

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Daily check-in
              </p>
              <h2 className="mt-1 text-lg font-bold">
                {editing ? "Edit your entry" : "Today's reflection"}
              </h2>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <CalendarDays size={19} />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Entry date
            </label>

            <input
              type="date"
              value={f.date}
              max={localDate()}
              onChange={(e) => setF({ ...f, date: e.target.value })}
              className="field"
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-secondary/40 p-4">
              <Rating
                label="How is your mood?"
                value={f.mood}
                onChange={(mood) => setF({ ...f, mood })}
              />
            </div>

            <div className="rounded-2xl bg-secondary/40 p-4">
              <Rating
                label="Stress level (optional)"
                value={f.stress}
                onChange={(stress) => setF({ ...f, stress })}
              />
            </div>

            <div className="rounded-2xl bg-secondary/40 p-4">
              <Rating
                label="Energy level (optional)"
                value={f.energy}
                onChange={(energy) => setF({ ...f, energy })}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              What's on your mind?
            </label>

            <textarea
              rows={5}
              placeholder="Write anything you want. Your thoughts, your day, or simply how you feel..."
              value={f.text}
              onChange={(e) => setF({ ...f, text: e.target.value })}
              className="field resize-none leading-relaxed"
            />

            <p className="mt-2 text-xs text-muted-foreground">
              Optional. Write as much or as little as you like.
            </p>
          </div>

          {err && (
            <p className="text-sm text-destructive">{err}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-2xl bg-primary py-3.5 font-semibold text-primary-foreground shadow-glow"
            >
              {editing ? "Update entry" : "Save my check-in"}
            </button>

            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setF(blank());
                  setErr(null);
                }}
                className="rounded-2xl border border-border px-5"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Weekly chart */}
        {chart.length > 1 && (
          <section className="card-x p-5">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your patterns
              </p>
              <h2 className="mt-1 text-lg font-bold">
                This week's mood
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                See how your mood, stress and energy change over time.
              </p>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chart}
                  margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                >
                  <XAxis
                    dataKey="d"
                    stroke="var(--muted-foreground)"
                    fontSize={10}
                  />

                  <YAxis
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    stroke="var(--muted-foreground)"
                    fontSize={10}
                  />

                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                    }}
                  />

                  <Line
                    dataKey="mood"
                    name="Mood"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />

                  <Line
                    dataKey="stress"
                    name="Stress"
                    stroke="var(--muted-foreground)"
                    strokeDasharray="4 4"
                    dot={false}
                  />

                  <Line
                    dataKey="energy"
                    name="Energy"
                    stroke="var(--chart-5)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>Mood</span>
              <span>Stress</span>
              <span>Energy</span>
            </div>
          </section>
        )}

        {/* History */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your memories
              </p>
              <h2 className="mt-1 text-lg font-bold">
                Journal history
              </h2>
            </div>

            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary">
              {entries.length} entries
            </span>
          </div>

          {!entries.length && (
            <div className="card-x py-9 text-center">
              <BookHeart className="mx-auto h-9 w-9 text-primary/50" />

              <p className="mt-3 font-semibold">
                Your journal starts here
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Your saved check-ins will appear here.
              </p>
            </div>
          )}

          <ul className="space-y-3">
            {entries.map((m) => (
              <li key={m.id} className="card-x p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {new Date(m.date + "T12:00").toLocaleDateString(
                        [],
                        {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </p>

                    <p className="mt-2 text-sm text-muted-foreground">
                      Mood <span className="font-semibold text-foreground">{m.mood}/5</span>
{m.stress ? " · Stress " + m.stress + "/5" : ""}
{m.energy ? " · Energy " + m.energy + "/5" : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0">
                    <button
                      aria-label="Edit entry"
                      onClick={() => edit(m)}
                      className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-primary"
                    >
                      <Pencil size={17} />
                    </button>

                    <button
                      aria-label="Delete entry"
                      onClick={() => del(m.id)}
                      className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-destructive"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>

                {m.text && (
                  <p className="mt-3 whitespace-pre-wrap border-t border-border pt-3 text-sm leading-relaxed">
                    {m.text}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>

        <p className="px-3 pb-2 text-center text-xs leading-relaxed text-muted-foreground">
          Your journal stays on this device. It is a personal reflection tool,
          not a medical diagnosis.
        </p>
      </div>
    </Shell>
  );
}