import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X, Clock3, Pill, CheckCircle2 } from "lucide-react";
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
  const log = (medId: string, action: "taken" | "dismissed" | "skipped" | "missed", scheduledTime?: string) =>
    update((d) => ({ ...d, medEvents: [...d.medEvents, { id: uid(), medId, at: nowISO(), action, scheduledTime }] }));
  const toggle = (medId: string, enabled: boolean) =>
    update((d) => ({ ...d, meds: d.meds.map((m) => m.id === medId ? { ...m, enabled } : m) }));

  const changeTime = (index: number, value: string) =>
    setF((current) => ({ ...current, times: current.times.map((time, i) => i === index ? value : time) }));

  const todayKey = localDate();
  const todaysDoses = db.meds
    .filter((med) => med.enabled && med.startDate <= todayKey && (!med.endDate || med.endDate >= todayKey))
    .flatMap((med) => med.times.map((time) => ({
      key: `${med.id}-${time}`, medId: med.id, name: med.name,
      instructions: med.instructions, time,
      status: "upcoming" as "upcoming" | "taken" | "skipped" | "missed" | "dismissed",
    })));
  const todaysEvents = db.medEvents.filter((event) => localDate(new Date(event.at)) === todayKey);
  for (const event of todaysEvents) {
    const target = event.scheduledTime
      ? todaysDoses.find((dose) => dose.medId === event.medId && dose.time === event.scheduledTime && dose.status === "upcoming")
      : todaysDoses.find((dose) => dose.medId === event.medId && dose.status === "upcoming");
    if (target) target.status = event.action;
  }
  const takenDoses = todaysDoses.filter((dose) => dose.status === "taken");
  const upcomingDoses = todaysDoses.filter((dose) => dose.status === "upcoming");
  const completedCount = takenDoses.length;
  const totalCount = todaysDoses.length;
  const progress = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Shell>
      <PageHead title="Medication" sub="Your prescribed schedule, on your terms." />
      <div className="space-y-4 px-4 pb-5">
        <section className="relative overflow-hidden rounded-[26px] border border-[#49232f] bg-gradient-to-br from-[#2a151e] via-[#1b151c] to-[#111015] p-4 text-[#f8edf0] shadow-[0_14px_36px_rgba(189,54,84,0.12)]">
          <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#bd3654]/15 blur-3xl" />
          <div className="relative space-y-3">
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#e45170]">Daily overview</p><h2 className="mt-1 text-lg font-bold">Today's Progress</h2></div><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[#e9a9b6]">{completedCount === totalCount && totalCount > 0 ? "Completed" : "In progress"}</span></div>
            <div className="flex items-end justify-between"><p className="text-3xl font-bold tracking-tight">{completedCount}<span className="text-xl text-[#a99ba2]">/{totalCount}</span></p><p className="text-sm font-semibold text-[#ff8296]">{progress}%</p></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#bd3654] to-[#ff7188] transition-all" style={{ width: `${progress}%` }} /></div>
            <p className="text-xs text-[#bcaeb4]">{completedCount} taken · {upcomingDoses.length} remaining today</p>
          </div>
        </section>
        <section className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="text-base font-bold">Today Taken</h2><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">{takenDoses.length} completed</span></div>
          {takenDoses.length ? takenDoses.map((dose) => (
            <article key={dose.key} className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.045] p-3">
              <div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400"><Pill size={21}/></span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{dose.name}</p><p className="text-xs text-muted-foreground">{dose.instructions || "Saved prescription instructions"}</p></div><CheckCircle2 className="shrink-0 text-emerald-400" size={21}/></div>
              <div className="mt-2 flex items-center justify-between border-t border-emerald-500/10 pt-2 text-xs"><span className="text-muted-foreground">Scheduled {formatTime(dose.time)}</span><span className="font-semibold text-emerald-400">TAKEN</span></div>
            </article>
          )) : <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No medicines marked as taken yet today.</p>}
        </section>
        <section className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="text-base font-bold">Upcoming</h2><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{upcomingDoses.length} remaining</span></div>
          {upcomingDoses.length ? upcomingDoses.map((dose) => (
            <article key={dose.key} className="rounded-2xl border border-[#6b3444]/45 bg-gradient-to-br from-[#21191e] to-card p-3">
              <div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Pill size={21}/></span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{dose.name}</p><p className="text-xs text-muted-foreground">{dose.instructions || "Saved prescription instructions"}</p></div><span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-400">UPCOMING</span></div>
              <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-2"><span className="flex items-center gap-1.5 text-sm font-semibold"><Clock3 size={15} className="text-primary"/>{formatTime(dose.time)}</span><span className="text-[11px] text-muted-foreground">Daily reminder</span></div>
              <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => log(dose.medId, "taken", dose.time)} className="rounded-xl bg-emerald-500/10 px-3 py-2.5 text-sm font-semibold text-emerald-400">✓ Mark Taken</button><button type="button" onClick={() => log(dose.medId, "skipped", dose.time)} className="rounded-xl bg-secondary px-3 py-2.5 text-sm font-semibold text-muted-foreground">Skip</button></div>
            </article>
          )) : <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{totalCount ? "All scheduled reminders have been marked." : "Add a medication and its reminder time to see it here."}</p>}
        </section>
        <div className="flex items-center justify-between pt-1"><h2 className="text-base font-bold">Manage Medications</h2><span className="text-xs text-muted-foreground">{db.meds.length} saved</span></div>
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
