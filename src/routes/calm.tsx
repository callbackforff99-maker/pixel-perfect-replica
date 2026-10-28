import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHead, Shell } from "@/components/Shell";
import { nowISO, uid, update, useDB } from "@/lib/store";

export const Route = createFileRoute("/calm")({
  head: () => ({
    meta: [
      { title: "Calm Mind breathing — SleeepX 3_4" },
      { name: "description", content: "Gentle guided breathing sessions." },
      { property: "og:title", content: "Calm — SleeepX 3_4" },
      { property: "og:description", content: "Gentle guided breathing sessions." },
    ],
  }),
  component: Calm,
});

const IN = 4, OUT = 6; // gentle, no breath holding
const checklist = ["Dim the lights", "Put the phone face down", "Water nearby", "Room cool and quiet"];

function Calm() {
  const db = useDB();
  const [len, setLen] = useState(3);
  const [state, setState] = useState<"idle" | "running" | "paused" | "done">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [checked, setChecked] = useState<string[]>([]);
  const audio = useRef<AudioContext | null>(null);
  const total = len * 60;
  const phase = elapsed % (IN + OUT) < IN ? "in" : "out";

  useEffect(() => {
    if (state !== "running") return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  useEffect(() => {
    if (state === "running" && elapsed >= total) finish(true);
    if (state === "running" && db.settings.sound && elapsed % (IN + OUT) === 0 || (state === "running" && db.settings.sound && elapsed % (IN + OUT) === IN)) chime(phase === "in" ? 396 : 264);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  function chime(f: number) {
    audio.current ??= new AudioContext();
    const c = audio.current, o = c.createOscillator(), g = c.createGain();
    o.frequency.value = f;
    g.gain.setValueAtTime(0.05, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.2);
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime + 1.2);
  }

  function finish(completed: boolean) {
    if (elapsed > 0) update((d) => ({ ...d, breath: [...d.breath, { id: uid(), at: nowISO(), seconds: Math.min(elapsed, total), completed }] }));
    setState(completed ? "done" : "idle");
    if (!completed) setElapsed(0);
  }

  const remaining = Math.max(0, total - elapsed);
  return (
    <Shell>
      <PageHead title="Calm Mind" sub="Breathe in 4, out 6. Stop anytime and breathe normally if you feel dizzy." />
      <div className="space-y-4 px-4">
        {state === "done" ? (
          <section className="card-x py-10 text-center shadow-glow">
            <h2 className="text-2xl font-bold">Session complete</h2>
            <p className="mt-2 text-muted-foreground">{len} minute{len > 1 && "s"} of slow breathing. Nicely done.</p>
            <button onClick={() => { setState("idle"); setElapsed(0); }} className="mt-6 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground">Back</button>
          </section>
        ) : (
          <section className="card-x flex flex-col items-center py-8">
            <div className="relative flex h-60 w-60 items-center justify-center">
              <div
                key={state === "running" ? `${phase}-${Math.floor(elapsed / (IN + OUT))}` : "static"}
                className="absolute inset-0 rounded-full bg-primary/30 shadow-glow"
                style={{
                  transform: "scale(.55)",
                  animation: state === "running" ? `${phase === "in" ? "breathe-in" : "breathe-out"} ${phase === "in" ? IN : OUT}s ease-in-out forwards` : undefined,
                  animationPlayState: state === "paused" ? "paused" : "running",
                }}
              />
              <div className="relative text-center">
                <p className="font-display text-2xl font-bold">{state === "idle" ? "Ready" : phase === "in" ? "Breathe in" : "Breathe out"}</p>
                <p className="text-sm text-muted-foreground">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</p>
              </div>
            </div>
            {state === "idle" && (
              <div className="mt-6 flex gap-2">
                {[1, 3, 5].map((m) => (
                  <button key={m} aria-pressed={len === m} onClick={() => setLen(m)} className="rounded-full border border-border px-4 py-1.5 text-sm aria-pressed:border-primary aria-pressed:text-primary-glow">{m} min</button>
                ))}
              </div>
            )}
            <div className="mt-6 flex gap-2">
              {state === "idle" && <button onClick={() => { setElapsed(0); setState("running"); }} className="rounded-xl bg-primary px-8 py-3 font-semibold text-primary-foreground shadow-glow">Start</button>}
              {state === "running" && <button onClick={() => setState("paused")} className="rounded-xl bg-secondary px-6 py-3">Pause</button>}
              {state === "paused" && <button onClick={() => setState("running")} className="rounded-xl bg-primary px-6 py-3 text-primary-foreground">Resume</button>}
              {(state === "running" || state === "paused") && <button onClick={() => finish(false)} className="rounded-xl border border-border px-6 py-3">Stop</button>}
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={db.settings.sound} onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, sound: e.target.checked } }))} className="accent-primary" />
              Soft tone on each phase
            </label>
          </section>
        )}
        <section className="card-x">
          <h2 className="mb-2 font-semibold">Wind-down checklist</h2>
          {checklist.map((c) => (
            <label key={c} className="flex items-center gap-3 py-1.5 text-sm">
              <input type="checkbox" className="accent-primary" checked={checked.includes(c)} onChange={() => setChecked((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))} />
              {c}
            </label>
          ))}
        </section>
        <p className="text-center text-xs text-muted-foreground">{db.breath.filter((b) => b.completed).length} completed sessions so far</p>
      </div>
    </Shell>
  );
}
