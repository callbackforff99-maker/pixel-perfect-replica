import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Pencil, Trash2 } from "lucide-react";
import { PageHead, Rating, Shell } from "@/components/Shell";
import { nowISO, toLocalInput, uid, update, useDB } from "@/lib/store";
import { durationMinutes, fmtDuration, sleepStats, validateSleep, type SleepLog } from "@/lib/sleep";

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
  return { start: toLocalInput(start.toISOString()), end: toLocalInput(end.toISOString()), awakenings: "", quality: undefined as number | undefined, notes: "" };
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
      start: new Date(form.start).toString() === "Invalid Date" ? "x" : new Date(form.start).toISOString(),
      end: new Date(form.end).toString() === "Invalid Date" ? "x" : new Date(form.end).toISOString(),
      awakenings: form.awakenings === "" ? undefined : Number(form.awakenings),
      quality: form.quality,
    };
    const v = validateSleep(input, db.sleep, editing ?? undefined);
    setErr(v);
    setMsg(null);
    if (v) return;
    const ts = nowISO();
    const ok = update((d) => ({
      ...d,
      sleep: editing
        ? d.sleep.map((l) => (l.id === editing ? { ...l, ...input, notes: form.notes || undefined, updatedAt: ts } : l))
        : [...d.sleep, { id: uid(), ...input, notes: form.notes || undefined, createdAt: ts, updatedAt: ts }],
    }));
    if (ok) {
      setMsg(editing ? "Updated." : "Saved.");
      setEditing(null);
      setForm(defaults());
    } else setErr("Couldn't save — storage unavailable.");
  };

  const edit = (l: SleepLog) => {
    setEditing(l.id);
    setForm({ start: toLocalInput(l.start), end: toLocalInput(l.end), awakenings: l.awakenings?.toString() ?? "", quality: l.quality, notes: l.notes ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const del = (id: string) => confirm("Delete this sleep log?") && update((d) => ({ ...d, sleep: d.sleep.filter((l) => l.id !== id) }));

  const stats = sleepStats(db.sleep, range);
  const chart = [...stats.logs]
    .sort((a, b) => a.end.localeCompare(b.end))
    .map((l) => ({ day: new Date(l.end).toLocaleDateString([], { month: "short", day: "numeric" }), hours: +(durationMinutes(l.start, l.end) / 60).toFixed(2) }));
  const history = [...db.sleep].sort((a, b) => b.end.localeCompare(a.end));

  return (
    <Shell>
      <PageHead title="Sleep" sub="Manual logs. Reports are estimates from what you record." />
      <div className="space-y-4 px-4">
        <form onSubmit={submit} className="card-x space-y-3">
          <h2 className="font-semibold">{editing ? "Edit night" : "Log a night"}</h2>
          <label className="block text-sm text-muted-foreground">Fell asleep
            <input type="datetime-local" required value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className="field mt-1" />
          </label>
          <label className="block text-sm text-muted-foreground">Woke up
            <input type="datetime-local" required value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className="field mt-1" />
          </label>
          <label className="block text-sm text-muted-foreground">Night awakenings (optional)
            <input type="number" min={0} max={50} value={form.awakenings} onChange={(e) => setForm({ ...form, awakenings: e.target.value })} className="field mt-1" />
          </label>
          <Rating label="How did it feel? (optional)" value={form.quality} onChange={(q) => setForm({ ...form, quality: q })} />
          <textarea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="field" rows={2} />
          {err && <p className="text-sm text-destructive">{err}</p>}
          {msg && <p className="text-sm text-primary-glow">{msg}</p>}
          <div className="flex gap-2">
            <button className="flex-1 rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-glow">{editing ? "Update" : "Save"}</button>
            {editing && <button type="button" onClick={() => { setEditing(null); setForm(defaults()); setErr(null); }} className="rounded-xl border border-border px-4">Cancel</button>}
          </div>
        </form>

        <section className="card-x">
          <div className="mb-3 flex gap-2">
            {([1, 7, 30] as const).map((r) => (
              <button key={r} aria-pressed={range === r} onClick={() => setRange(r)} className="rounded-full border border-border px-3 py-1 text-sm aria-pressed:border-primary aria-pressed:text-primary-glow">
                {r === 1 ? "Today" : `${r} days`}
              </button>
            ))}
          </div>
          {stats.count ? (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat k="Average" v={fmtDuration(Math.round(stats.avg))} />
                <Stat k="Variability (±)" v={fmtDuration(Math.round(stats.sd))} />
                <Stat k="Typical bedtime" v={stats.bedtime!} />
                <Stat k="Typical wake" v={stats.wake!} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{stats.count} completed log(s). Estimates only — not a medical measurement.</p>
              {chart.length > 1 && (
                <div className="mt-3 h-40">
                  <ResponsiveContainer>
                    <BarChart data={chart}>
                      <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={10} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={10} width={24} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                      <Bar dataKey="hours" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No logs in this range yet.</p>
          )}
        </section>

        <section>
          <h2 className="mb-2 font-semibold">History</h2>
          {!history.length && <p className="text-sm text-muted-foreground">Nothing logged yet.</p>}
          <ul className="space-y-2">
            {history.map((l) => (
              <li key={l.id} className="card-x flex items-center justify-between">
                <div>
                  <p className="font-semibold">{fmtDuration(durationMinutes(l.start, l.end))}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(l.start).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} → {new Date(l.end).toLocaleTimeString([], { timeStyle: "short" })}
                    {l.quality ? ` · quality ${l.quality}/5` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button aria-label="Edit" onClick={() => edit(l)} className="p-2 text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                  <button aria-label="Delete" onClick={() => del(l.id)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
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
    <div className="rounded-lg bg-secondary p-3">
      <p className="text-xs text-muted-foreground">{k}</p>
      <p className="font-display text-lg font-bold">{v}</p>
    </div>
  );
}
