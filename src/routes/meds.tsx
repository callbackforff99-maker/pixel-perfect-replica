import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { PageHead, Shell } from "@/components/Shell";
import { localDate, nowISO, uid, update, useDB, type Medication } from "@/lib/store";

export const Route = createFileRoute("/meds")({
  head: () => ({
    meta: [
      { title: "Medication reminders — SleeepX 3_4" },
      { name: "description", content: "Private reminders for your prescribed schedule." },
      { property: "og:title", content: "Medication — SleeepX 3_4" },
      { property: "og:description", content: "Private reminders for your prescribed schedule." },
    ],
  }),
  component: Meds,
});

const blank = () => ({ name: "", instructions: "", times: "08:00", startDate: localDate(), endDate: "", notes: "" });

function Meds() {
  const db = useDB();
  const [f, setF] = useState(blank);
  const [err, setErr] = useState<string | null>(null);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const times = f.times.split(",").map((t) => t.trim()).filter(Boolean);
    if (!f.name.trim()) return setErr("Enter the medication name.");
    if (!times.length || times.some((t) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(t))) return setErr("Times must be HH:MM, separated by commas.");
    if (f.endDate && f.endDate < f.startDate) return setErr("End date must be after start date.");
    setErr(null);
    const m: Medication = { id: uid(), name: f.name.trim(), instructions: f.instructions || undefined, times: [...new Set(times)].sort(), startDate: f.startDate, endDate: f.endDate || undefined, enabled: true, notes: f.notes || undefined };
    if (update((d) => ({ ...d, meds: [...d.meds, m] }))) setF(blank());
  };
  const log = (medId: string, action: "taken" | "dismissed") => update((d) => ({ ...d, medEvents: [...d.medEvents, { id: uid(), medId, at: nowISO(), action }] }));

  return (
    <Shell>
      <PageHead title="Medication" sub="A reminder tool only." />
      <div className="space-y-4 px-4">
        <p className="rounded-xl border border-primary/50 bg-accent p-3 text-sm">
          Enter details exactly as your clinician or pharmacist instructed. This app never suggests, calculates or changes doses. If you miss a dose, follow your prescriber's or pharmacist's advice.
        </p>
        <form onSubmit={add} className="card-x space-y-3">
          <input placeholder="Medication name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="field" />
          <input placeholder="Prescription instructions (optional)" value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} className="field" />
          <label className="block text-sm text-muted-foreground">Reminder times (e.g. 08:00, 20:00)
            <input value={f.times} onChange={(e) => setF({ ...f, times: e.target.value })} className="field mt-1" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm text-muted-foreground">Start<input type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} className="field mt-1" /></label>
            <label className="text-sm text-muted-foreground">End (optional)<input type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} className="field mt-1" /></label>
          </div>
          <input placeholder="Notes (optional)" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="field" />
          {err && <p className="text-sm text-destructive">{err}</p>}
          <button className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground">Add reminder</button>
        </form>

        {!db.meds.length && <p className="text-sm text-muted-foreground">No medication reminders yet.</p>}
        {db.meds.map((m) => {
          const events = db.medEvents.filter((e) => e.medId === m.id).slice(-5).reverse();
          return (
            <section key={m.id} className="card-x space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.times.join(" · ")} · from {m.startDate}{m.endDate ? ` to ${m.endDate}` : ""}</p>
                  {m.instructions && <p className="mt-1 text-sm">{m.instructions}</p>}
                  {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <input aria-label="Enabled" type="checkbox" className="h-5 w-5 accent-primary" checked={m.enabled} onChange={(e) => update((d) => ({ ...d, meds: d.meds.map((x) => (x.id === m.id ? { ...x, enabled: e.target.checked } : x)) }))} />
                  <button aria-label="Delete" onClick={() => confirm(`Delete ${m.name}?`) && update((d) => ({ ...d, meds: d.meds.filter((x) => x.id !== m.id), medEvents: d.medEvents.filter((x) => x.medId !== m.id) }))} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => log(m.id, "taken")} className="rounded-lg bg-secondary px-3 py-1.5 text-sm">Mark taken</button>
                <button onClick={() => log(m.id, "dismissed")} className="rounded-lg border border-border px-3 py-1.5 text-sm">Dismiss</button>
              </div>
              {events.length > 0 && (
                <ul className="text-xs text-muted-foreground">
                  {events.map((e) => <li key={e.id}>{e.action} · {new Date(e.at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</li>)}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </Shell>
  );
}
