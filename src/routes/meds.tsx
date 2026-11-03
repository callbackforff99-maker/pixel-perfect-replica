import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X, Clock3 } from "lucide-react";
import { PageHead, Shell } from "@/components/Shell";
import { localDate, nowISO, uid, update, useDB, type Medication } from "@/lib/store";
import { syncMedicationNotifications } from "@/lib/medication-notifications";

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

const blank = () => ({ name: "", instructions: "", times: ["08:00"], startDate: localDate(), endDate: "", notes: "" });

function Meds() {
  const db = useDB();
  const [f, setF] = useState(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void syncMedicationNotifications(db.meds).catch((error) => console.warn("Medication notification sync failed", error));
  }, [db.meds]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const times = f.times.map((t) => t.trim()).filter(Boolean);
    if (!f.name.trim()) return setErr("Enter the medication name.");
    if (!times.length || times.some((t) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(t))) return setErr("Choose a valid time for each reminder.");
    if (f.endDate && f.endDate < f.startDate) return setErr("End date must be after start date.");
    setErr(null);
    const values = {
      name: f.name.trim(),
      instructions: f.instructions.trim() || undefined,
      times: [...new Set(times)].sort(),
      startDate: f.startDate,
      endDate: f.endDate || undefined,
      notes: f.notes.trim() || undefined,
    };
    const ok = update((d) => ({
      ...d,
      meds: editingId
        ? d.meds.map((m) => m.id === editingId ? { ...m, ...values } : m)
        : [...d.meds, { id: uid(), ...values, enabled: true }],
    }));
    if (ok) { setF(blank()); setEditingId(null); }
  };

  const edit = (m: Medication) => {
    setEditingId(m.id);
    setF({ name: m.name, instructions: m.instructions || "", times: m.times.length ? [...m.times] : ["08:00"], startDate: m.startDate, endDate: m.endDate || "", notes: m.notes || "" });
    setErr(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelEdit = () => { setEditingId(null); setF(blank()); setErr(null); };
  const log = (medId: string, action: "taken" | "dismissed" | "skipped" | "missed") =>
    update((d) => ({ ...d, medEvents: [...d.medEvents, { id: uid(), medId, at: nowISO(), action }] }));
  const toggle = (medId: string, enabled: boolean) =>
    update((d) => ({ ...d, meds: d.meds.map((m) => m.id === medId ? { ...m, enabled } : m) }));

  const changeTime = (index: number, value: string) =>
    setF((current) => ({ ...current, times: current.times.map((time, i) => i === index ? value : time) }));

  return (
    <Shell>
      <PageHead title="Medication" sub="Your prescribed schedule, on your terms." />
      <div className="space-y-4 px-4 pb-5">
        <p className="rounded-xl border border-primary/50 bg-accent p-3 text-sm">
          Enter details exactly as your clinician or pharmacist instructed. SleeepX never suggests, calculates or changes doses. If you miss a dose, follow your prescriber's or pharmacist's advice.
        </p>
        <form onSubmit={save} className="card-x space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{editingId ? "Edit reminder" : "Add medication reminder"}</h2>
            {editingId && <button type="button" onClick={cancelEdit} className="rounded-lg p-2 text-muted-foreground" aria-label="Cancel edit"><X size={18}/></button>}
          </div>
          <input placeholder="Medication name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="field" />
          <input placeholder="Prescription instructions (optional)" value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} className="field" />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Reminder time</label>
              <span className="text-xs text-muted-foreground">Tap a time to open the clock</span>
            </div>
            {f.times.map((time, index) => (
              <div key={index} className="flex items-center gap-2">
                <label className="relative flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-input bg-secondary px-3 py-2.5 focus-within:border-primary">
                  <Clock3 size={18} className="shrink-0 text-primary" />
                  <input
                    aria-label={`Reminder time ${index + 1}`}
                    type="time"
                    value={time}
                    onChange={(e) => changeTime(index, e.target.value)}
                    onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* Native picker may already be opening. */ } }}
                    className="w-full min-w-0 bg-transparent text-base font-semibold text-foreground outline-none [color-scheme:dark]"
                  />
                </label>
                {f.times.length > 1 && (
                  <button type="button" aria-label={`Remove time ${index + 1}`} onClick={() => setF({ ...f, times: f.times.filter((_, i) => i !== index) })} className="rounded-xl border border-border p-3 text-muted-foreground hover:text-destructive"><X size={17}/></button>
                )}
              </div>
            ))}
            {f.times.length < 6 && (
              <button type="button" onClick={() => setF({ ...f, times: [...f.times, "20:00"] })} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-primary/50 px-3 py-2 text-sm font-medium text-primary">
                <Plus size={16}/> Add another time
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm text-muted-foreground">Start<input type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} className="field mt-1" /></label>
            <label className="text-sm text-muted-foreground">End (optional)<input type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} className="field mt-1" /></label>
          </div>
          <input placeholder="Notes (optional)" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="field" />
          {err && <p className="text-sm text-destructive">{err}</p>}
          <button className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground">{editingId ? "Save changes" : "Add reminder"}</button>
        </form>

        {!db.meds.length && <p className="text-sm text-muted-foreground">No medication reminders yet.</p>}
        {db.meds.map((m) => {
          const events = db.medEvents.filter((e) => e.medId === m.id).slice(-8).reverse();
          return (
            <section key={m.id} className="card-x space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.times.join(" · ")} · from {m.startDate}{m.endDate ? ` to ${m.endDate}` : ""}</p>
                  {m.instructions && <p className="mt-1 text-sm">{m.instructions}</p>}
                  {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                  <p className={`mt-1 text-xs font-medium ${m.enabled ? "text-primary" : "text-muted-foreground"}`}>{m.enabled ? "Reminder active" : "Reminder paused"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <input aria-label={`Enable ${m.name}`} type="checkbox" className="h-5 w-5 accent-primary" checked={m.enabled} onChange={(e) => toggle(m.id, e.target.checked)} />
                  <button aria-label={`Edit ${m.name}`} onClick={() => edit(m)} className="p-1 text-muted-foreground"><Pencil size={17}/></button>
                  <button aria-label={`Delete ${m.name}`} onClick={() => { if (confirm(`Delete ${m.name} and its history?`)) update((d) => ({ ...d, meds: d.meds.filter((x) => x.id !== m.id), medEvents: d.medEvents.filter((x) => x.medId !== m.id) })); }} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={17}/></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => log(m.id, "taken")} className="rounded-lg bg-secondary px-3 py-2 text-sm">✓ Taken</button>
                <button onClick={() => log(m.id, "skipped")} className="rounded-lg border border-border px-3 py-2 text-sm">Skipped</button>
                <button onClick={() => log(m.id, "missed")} className="rounded-lg border border-border px-3 py-2 text-sm">Missed</button>
                <button onClick={() => log(m.id, "dismissed")} className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">Dismiss</button>
              </div>
              {events.length > 0 && (
                <div className="border-t border-border pt-2">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Recent history</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {events.map((event) => <li key={event.id} className="flex justify-between gap-2"><span className="capitalize">{event.action}</span><span>{new Date(event.at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span></li>)}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
        <p className="text-xs leading-relaxed text-muted-foreground">Android can delay reminders because of battery restrictions, Do Not Disturb or manufacturer settings. On HyperOS, allow SleeepX notifications and set Battery saver to No restrictions for more reliable delivery. Scheduled reminders are refreshed when the app opens.</p>
      </div>
    </Shell>
  );
}
