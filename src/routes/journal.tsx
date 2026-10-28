import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Pencil, Trash2 } from "lucide-react";
import { PageHead, Rating, Shell } from "@/components/Shell";
import { localDate, nowISO, uid, update, useDB, validateMood, type MoodEntry } from "@/lib/store";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "Mood journal — SleeepX 3_4" },
      { name: "description", content: "Private daily mood check-in." },
      { property: "og:title", content: "Journal — SleeepX 3_4" },
      { property: "og:description", content: "Private daily mood check-in." },
    ],
  }),
  component: Journal,
});

type Form = { date: string; mood?: number; stress?: number; energy?: number; text: string };
const blank = (): Form => ({ date: localDate(), text: "" });

function Journal() {
  const db = useDB();
  const [f, setF] = useState<Form>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validateMood({ mood: f.mood ?? 0, stress: f.stress, energy: f.energy });
    setErr(v);
    if (v) return;
    const ts = nowISO();
    const data = { date: f.date, mood: f.mood!, stress: f.stress, energy: f.energy, text: f.text || undefined };
    const ok = update((d) => ({
      ...d,
      mood: editing ? d.mood.map((m) => (m.id === editing ? { ...m, ...data, updatedAt: ts } : m)) : [...d.mood, { id: uid(), ...data, createdAt: ts, updatedAt: ts }],
    }));
    if (!ok) return setErr("Couldn't save — storage unavailable.");
    setEditing(null);
    setF(blank());
  };
  const edit = (m: MoodEntry) => { setEditing(m.id); setF({ date: m.date, mood: m.mood, stress: m.stress, energy: m.energy, text: m.text ?? "" }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const del = (id: string) => confirm("Delete this entry?") && update((d) => ({ ...d, mood: d.mood.filter((m) => m.id !== id) }));

  const entries = [...db.mood].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const weekAgo = localDate(new Date(Date.now() - 6 * 86400000));
  const chart = [...entries].reverse().filter((m) => m.date >= weekAgo).map((m) => ({ d: m.date.slice(5), mood: m.mood, stress: m.stress, energy: m.energy }));

  return (
    <Shell>
      <PageHead title="Journal" sub="Private check-in. Stays on this device." />
      <div className="space-y-4 px-4">
        <form onSubmit={save} className="card-x space-y-3">
          <input type="date" value={f.date} max={localDate()} onChange={(e) => setF({ ...f, date: e.target.value })} className="field" />
          <Rating label="Mood" value={f.mood} onChange={(mood) => setF({ ...f, mood })} />
          <Rating label="Stress (optional)" value={f.stress} onChange={(stress) => setF({ ...f, stress })} />
          <Rating label="Energy (optional)" value={f.energy} onChange={(energy) => setF({ ...f, energy })} />
          <textarea rows={3} placeholder="Anything on your mind? (optional)" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} className="field" />
          {err && <p className="text-sm text-destructive">{err}</p>}
          <div className="flex gap-2">
            <button className="flex-1 rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-glow">{editing ? "Update" : "Save check-in"}</button>
            {editing && <button type="button" onClick={() => { setEditing(null); setF(blank()); }} className="rounded-xl border border-border px-4">Cancel</button>}
          </div>
        </form>

        {chart.length > 1 && (
          <section className="card-x h-48">
            <p className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">This week</p>
            <ResponsiveContainer height="85%">
              <LineChart data={chart}>
                <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={10} />
                <YAxis domain={[1, 5]} ticks={[1, 3, 5]} stroke="var(--muted-foreground)" fontSize={10} width={20} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                <Line dataKey="mood" stroke="var(--primary-glow)" strokeWidth={2} dot={false} />
                <Line dataKey="stress" stroke="var(--muted-foreground)" strokeDasharray="4 4" dot={false} />
                <Line dataKey="energy" stroke="var(--chart-5)" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </section>
        )}

        <section>
          <h2 className="mb-2 font-semibold">History</h2>
          {!entries.length && <p className="text-sm text-muted-foreground">No check-ins yet.</p>}
          <ul className="space-y-2">
            {entries.map((m) => (
              <li key={m.id} className="card-x">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{new Date(m.date + "T12:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</p>
                  <div className="flex">
                    <button aria-label="Edit" onClick={() => edit(m)} className="p-2 text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                    <button aria-label="Delete" onClick={() => del(m.id)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Mood {m.mood}/5{m.stress ? ` · stress ${m.stress}` : ""}{m.energy ? ` · energy ${m.energy}` : ""}</p>
                {m.text && <p className="mt-1 whitespace-pre-wrap text-sm">{m.text}</p>}
              </li>
            ))}
          </ul>
        </section>
        <p className="text-center text-xs text-muted-foreground">This journal doesn't diagnose anything. If you're struggling, reach out to someone you trust or a professional.</p>
      </div>
    </Shell>
  );
}
