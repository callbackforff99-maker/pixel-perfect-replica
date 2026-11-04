import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Droplets, Download, Eye, Plus, X, Pencil, Trash2, Target, GlassWater, RotateCcw, Check, Clock3 } from "lucide-react";
import { PageHead, Shell } from "@/components/Shell";
import { localDate, useDB } from "@/lib/store";

export const Route = createFileRoute("/daily")({ component: DailyTools });
const WATER_KEY = "sleeepx.water.ml.v2";
const WATER_LOG_KEY = "sleeepx.water.logs.v2";
const WATER_GOAL_KEY = "sleeepx.water.goal.v1";
type WaterLog = { id: string; date: string; ml: number; createdAt: string };
type ReportRow = { date: string; sleep: string; water: number; mood: string };
function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(window.localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}
function shiftDate(value: string, amount: number) {
  const d = new Date(value + "T12:00:00");
  d.setDate(d.getDate() + amount);
  return localDate(d);
}
function formatDate(value: string) {
  return new Date(value + "T12:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}
function buildPdfCanvas(rows: ReportRow[], start: string, end: string, avgSleep: string, totalSleep: number) {
  const width = 1240, height = 1754, perPage = 18;
  const pages: string[] = [];
  const chunks: Uint8Array[] = [];
  const encoder = new TextEncoder();
  const text = (s: string) => encoder.encode(s);
  const wrap = (ctx: CanvasRenderingContext2D, value: string, maxWidth: number) => {
    const words = value.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? line + " " + word : word;
      if (line && ctx.measureText(next).width > maxWidth) { lines.push(line); line = word; }
      else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };
  const drawPage = (pageRows: ReportRow[], pageIndex: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare the PDF page.");
    ctx.fillStyle = "#f7f5f4"; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#100d11"; ctx.fillRect(0, 0, width, 300);
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, "#a92345"); grad.addColorStop(1, "#e45170");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 14, 300);
    ctx.fillStyle = "#f04460"; ctx.font = "bold 64px Arial, sans-serif"; ctx.fillText("SleeepX", 72, 112);
    ctx.fillStyle = "#e9dfe3"; ctx.font = "600 22px Arial, sans-serif"; ctx.fillText("SLEEP  •  TRACK  •  RESTORE", 76, 158);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 34px Arial, sans-serif"; ctx.fillText("SLEEP & WELLNESS RECORD", 72, 230);
    ctx.fillStyle = "#a92345"; ctx.font = "bold 24px Arial, sans-serif"; ctx.fillText("RECORD PERIOD", 72, 370);
    ctx.fillStyle = "#231b21"; ctx.font = "600 30px Arial, sans-serif"; ctx.fillText(formatDate(start) + "  —  " + formatDate(end), 72, 420);
    const metricY = 470, metricW = 330, metricGap = 30;
    const metrics = [["SLEEP ENTRIES", String(totalSleep)], ["AVERAGE SLEEP", avgSleep], ["REPORT PAGE", (pageIndex + 1) + " / " + Math.max(1, Math.ceil(rows.length / perPage))]];
    metrics.forEach((m, i) => {
      const x = 72 + i * (metricW + metricGap);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(x, metricY, metricW, 116);
      ctx.strokeStyle = "#eadde1"; ctx.lineWidth = 2; ctx.strokeRect(x, metricY, metricW, 116);
      ctx.fillStyle = "#8e6875"; ctx.font = "bold 17px Arial, sans-serif"; ctx.fillText(m[0], x + 20, metricY + 38);
      ctx.fillStyle = "#a92345"; ctx.font = "bold 30px Arial, sans-serif"; ctx.fillText(m[1], x + 20, metricY + 82);
    });
    const tableY = 650, rowH = 49;
    const cols = [72, 310, 535, 770, 1168];
    ctx.fillStyle = "#281b23"; ctx.fillRect(72, tableY, 1096, 54);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 18px Arial, sans-serif";
    ["DATE", "SLEEP", "WATER", "MOOD / NOTES"].forEach((label, i) => ctx.fillText(label, cols[i] + 15, tableY + 34));
    pageRows.forEach((row, i) => {
      const y = tableY + 54 + i * rowH;
      ctx.fillStyle = i % 2 ? "#f0e9eb" : "#ffffff"; ctx.fillRect(72, y, 1096, rowH);
      ctx.fillStyle = "#332832"; ctx.font = "600 17px Arial, sans-serif";
      ctx.fillText(row.date, cols[0] + 15, y + 30);
      ctx.fillText(row.sleep, cols[1] + 15, y + 30);
      ctx.fillText(row.water + " ml", cols[2] + 15, y + 30);
      const noteLines = wrap(ctx, row.mood || "—", 370);
      ctx.font = "15px Arial, sans-serif";
      ctx.fillText(noteLines[0] || "—", cols[3] + 15, y + 21);
      if (noteLines[1]) ctx.fillText(noteLines[1], cols[3] + 15, y + 40);
      ctx.strokeStyle = "#e3d7dc"; ctx.beginPath(); ctx.moveTo(72, y + rowH); ctx.lineTo(1168, y + rowH); ctx.stroke();
    });
    const footerY = 1650;
    ctx.fillStyle = "#a92345"; ctx.fillRect(72, footerY, 1096, 2);
    ctx.fillStyle = "#8b7780"; ctx.font = "16px Arial, sans-serif";
    ctx.fillText("Personal record • Data shown is based on entries saved on this device.", 72, footerY + 38);
    ctx.fillStyle = "#a92345"; ctx.font = "bold 17px Arial, sans-serif"; ctx.fillText("DEVELOPED BY ZEROX", 72, footerY + 76);
    return canvas.toDataURL("image/jpeg", 0.88).split(",")[1];
  };
  for (let i = 0; i < Math.max(1, Math.ceil(rows.length / perPage)); i++) {
    pages.push(drawPage(rows.slice(i * perPage, (i + 1) * perPage), i));
  }
  const objects: Uint8Array[] = [];
  const addObject = (parts: Uint8Array[]) => { objects.push(joinBytes(parts)); return objects.length; };
  const pageIds = pages.map((_, i) => 3 + i * 3);
  addObject([text("<< /Type /Catalog /Pages 2 0 R >>")]);
  addObject([text("<< /Type /Pages /Kids [" + pageIds.map(id => id + " 0 R").join(" ") + "] /Count " + pages.length + " >>")]);
  pages.forEach((base64, i) => {
    const imageBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const pageId = 3 + i * 3, contentId = pageId + 1, imageId = pageId + 2;
    addObject([text("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 " + imageId + " 0 R >> >> /Contents " + contentId + " 0 R >>")]);
    const stream = text("q 595 0 0 842 0 0 cm /Im0 Do Q");
    addObject([text("<< /Length " + stream.length + " >>\nstream\n"), stream, text("\nendstream")]);
    addObject([text("<< /Type /XObject /Subtype /Image /Width " + width + " /Height " + height + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + imageBytes.length + " >>\nstream\n"), imageBytes, text("\nendstream")]);
  });
  return objects;
}
function joinBytes(parts: Uint8Array[]) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size); let offset = 0;
  parts.forEach(part => { out.set(part, offset); offset += part.length; });
  return out;
}
function makePdf(objects: Uint8Array[]) {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [encoder.encode("%PDF-1.4\n% SleeepX\n")];
  const offsets = [0]; let length = parts[0].length;
  objects.forEach((obj, i) => {
    offsets.push(length);
    const wrapped = joinBytes([encoder.encode((i + 1) + " 0 obj\n"), obj, encoder.encode("\nendobj\n")]);
    parts.push(wrapped); length += wrapped.length;
  });
  const xrefOffset = length;
  let xref = "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) xref += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  xref += "trailer\n<< /Size " + (objects.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF";
  parts.push(encoder.encode(xref));
  const pdfBytes = joinBytes(parts);
  const exactBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
  return new Blob([exactBuffer], { type: "application/pdf" });
}
function DailyTools() {
  const db = useDB();
  const today = localDate();
  const [water, setWater] = useState<Record<string, number>>(() => {
    const saved = read<Record<string, number> | null>(WATER_KEY, null);
    if (saved) return saved;
    const legacy = read<Record<string, number>>("sleeepx.water.v1", {});
    const migrated = Object.fromEntries(Object.entries(legacy).map(([day, glasses]) => [day, glasses * 250]));
    if (typeof window !== "undefined" && Object.keys(migrated).length) window.localStorage.setItem(WATER_KEY, JSON.stringify(migrated));
    return migrated;
  });
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>(() => read(WATER_LOG_KEY, []));
  const [goal, setGoal] = useState<number>(() => read(WATER_GOAL_KEY, 2000));
  const [customOpen, setCustomOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState("300");
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalAmount, setGoalAmount] = useState("2000");
  const [editingLog, setEditingLog] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("250");
  const [date, setDate] = useState(today);
  const [reportStart, setReportStart] = useState(shiftDate(today, -29));
  const [reportEnd, setReportEnd] = useState(today);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [reportError, setReportError] = useState("");
  const count = water[date] || 0;
  const dayLogs = waterLogs.filter(log => log.date === date).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const persistWater = (nextWater: Record<string, number>, nextLogs: WaterLog[]) => {
    setWater(nextWater); setWaterLogs(nextLogs);
    localStorage.setItem(WATER_KEY, JSON.stringify(nextWater));
    localStorage.setItem(WATER_LOG_KEY, JSON.stringify(nextLogs));
  };
  const addWater = (ml: number) => {
    if (!Number.isFinite(ml) || ml <= 0 || ml > 5000) return;
    const amount = Math.round(ml);
    const nextLogs = [...waterLogs, { id: String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8), date, ml: amount, createdAt: new Date().toISOString() }];
    persistWater({ ...water, [date]: count + amount }, nextLogs);
    setCustomOpen(false);
  };
  const undoWater = () => {
    const latest = dayLogs[0];
    if (!latest) return;
    persistWater({ ...water, [date]: Math.max(0, count - latest.ml) }, waterLogs.filter(log => log.id !== latest.id));
  };
  const deleteWaterLog = (log: WaterLog) => {
    persistWater({ ...water, [date]: Math.max(0, count - log.ml) }, waterLogs.filter(item => item.id !== log.id));
  };
  const saveEditedLog = (log: WaterLog) => {
    const ml = Math.round(Number(editAmount));
    if (!Number.isFinite(ml) || ml <= 0 || ml > 5000) return;
    persistWater({ ...water, [date]: Math.max(0, count - log.ml + ml) }, waterLogs.map(item => item.id === log.id ? { ...item, ml } : item));
    setEditingLog(null);
  };
  const saveGoal = () => {
    const value = Math.round(Number(goalAmount));
    if (!Number.isFinite(value) || value < 250 || value > 10000) return;
    setGoal(value); localStorage.setItem(WATER_GOAL_KEY, JSON.stringify(value)); setGoalOpen(false);
  };
  const lastSevenDays = Array.from({ length: 7 }, (_, index) => shiftDate(date, index - 6));
  const maxWater = Math.max(goal, ...lastSevenDays.map(day => water[day] || 0), 1);
  const progress = Math.min(100, Math.round((count / Math.max(goal, 1)) * 100));
  const report = useMemo(() => {
    if (!reportStart || !reportEnd || reportStart > reportEnd) return [];
    const days: string[] = [];
    for (let d = new Date(reportStart + "T12:00:00"); localDate(d) <= reportEnd; d.setDate(d.getDate() + 1)) days.push(localDate(d));
    return days.map(day => {
      const logs = db.sleep.filter(x => x.end.slice(0, 10) === day);
      const mins = logs.reduce((sum, x) => sum + Math.max(0, (new Date(x.end).getTime() - new Date(x.start).getTime()) / 60000), 0);
      const moods = db.mood.filter(x => x.date === day);
      const moodText = moods.map(x => [x.mood ? "Mood " + x.mood + "/5" : "", x.stress != null ? "Stress " + x.stress + "/5" : "", x.text || ""].filter(Boolean).join(" · ")).filter(Boolean).join(" | ");
      return { date: day, sleep: logs.length ? (mins / 60).toFixed(1) + " h" : "—", water: water[day] || 0, mood: moodText || "—" };
    });
  }, [db.sleep, db.mood, water, reportStart, reportEnd]);
  const sleepLogsInRange = db.sleep.filter(x => x.end.slice(0, 10) >= reportStart && x.end.slice(0, 10) <= reportEnd);
  const averageSleep = sleepLogsInRange.length
    ? (sleepLogsInRange.reduce((sum, x) => sum + Math.max(0, new Date(x.end).getTime() - new Date(x.start).getTime()), 0) / sleepLogsInRange.length / 3600000).toFixed(1) + " h"
    : "—";
  const openPreview = () => {
    if (!reportStart || !reportEnd || reportStart > reportEnd) { setReportError("Start date must be before or equal to end date."); return; }
    setReportError(""); setPreviewOpen(true);
  };
  const downloadReport = async () => {
    if (!report.length || downloading) return;
    setDownloading(true); setReportError("");
    try {
      const images = buildPdfCanvas(report, reportStart, reportEnd, averageSleep, sleepLogsInRange.length);
      const blob = makePdf(images);
      const filename = "SleeepX-Record-" + reportStart + "-to-" + reportEnd + ".pdf";
      const file = new File([blob], filename, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: "SleeepX Record", text: "Sleep and wellness record: " + reportStart + " to " + reportEnd });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.download = filename; link.style.display = "none";
        document.body.appendChild(link); link.click(); link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setReportError("PDF তৈরি করা যায়নি। আবার চেষ্টা কর।");
        console.error("SleeepX PDF export failed", error);
      }
    } finally { setDownloading(false); }
  };
  return <Shell>
    <PageHead title="Daily Care" sub="Water tracker and personal records" />
    <div className="space-y-4 px-4 pb-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative space-y-4">
          <div className="flex items-center justify-between">
            <div><h2 className="flex items-center gap-2 font-semibold"><Droplets className="h-5 w-5 text-sky-400" /> Hydration</h2><p className="mt-1 text-[11px] tracking-[0.18em] text-muted-foreground">YOUR DAILY WATER TRACKER</p></div>
            <button onClick={() => { setGoalAmount(String(goal)); setGoalOpen(true); }} aria-label="Edit daily water goal" className="rounded-xl border border-border p-2 text-muted-foreground"><Target className="h-4 w-4" /></button>
          </div>
          <div className="rounded-2xl border border-sky-400/10 bg-gradient-to-br from-sky-400/10 via-secondary to-secondary p-4">
            <p className="text-center text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">TODAY'S INTAKE</p>
            <div className="mt-1 flex items-center justify-center gap-1"><span className="text-4xl font-bold tracking-tight">{count.toLocaleString()}</span><span className="mt-3 text-sm text-muted-foreground">ml</span></div>
            <p className="text-center text-xs text-muted-foreground">of {goal.toLocaleString()} ml daily goal</p>
            <div className="my-4 flex justify-center">
              <div className="relative grid h-36 w-36 place-items-center rounded-full" style={{ background: "conic-gradient(#55bde9 " + progress + "%, rgba(120,140,155,.18) " + progress + "% 100%)" }} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Daily water goal progress">
                <div className="grid h-[118px] w-[118px] place-items-center rounded-full bg-card text-center shadow-inner"><div><GlassWater className="mx-auto h-7 w-7 text-sky-400" /><p className="mt-1 text-2xl font-bold">{progress}%</p><p className="text-[10px] text-muted-foreground">COMPLETED</p></div></div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border/70 pt-3 text-xs"><span className="text-muted-foreground">Remaining</span><span className="font-semibold text-sky-400">{Math.max(0, goal - count).toLocaleString()} ml</span></div>
            {count >= goal && <p className="mt-2 text-center text-xs font-medium text-emerald-500">Daily goal reached. Great work!</p>}
          </div>
          <label className="block text-xs text-muted-foreground">Selected day<input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} className="field mt-1" /></label>
          <div className="space-y-2"><div className="flex items-center justify-between"><p className="text-xs font-semibold tracking-wide">QUICK ADD</p><span className="text-[10px] text-muted-foreground">Choose amount</span></div>
            <div className="grid grid-cols-3 gap-2">
              {[150,250,500].map(ml => <button key={ml} onClick={() => addWater(ml)} className="flex flex-col items-center gap-1 rounded-xl border border-sky-400/15 bg-sky-400/[0.06] px-2 py-3 transition active:scale-95 hover:border-sky-400/40"><GlassWater className="h-5 w-5 text-sky-400" /><span className="text-sm font-semibold">{ml} ml</span></button>)}
            </div>
            <button onClick={() => setCustomOpen(value => !value)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 py-3 text-sm font-semibold text-primary"><Plus className="h-4 w-4" /> CUSTOM AMOUNT</button>
            {customOpen && <div className="flex gap-2 rounded-xl border border-border bg-secondary/50 p-3"><input type="number" min="1" max="5000" inputMode="numeric" value={customAmount} onChange={e => setCustomAmount(e.target.value)} className="field min-w-0 flex-1" aria-label="Custom water amount in milliliters" /><button onClick={() => addWater(Number(customAmount))} className="rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Add</button></div>}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Today's history</h3><button onClick={undoWater} disabled={!dayLogs.length} className="flex items-center gap-1 text-xs text-muted-foreground disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" /> Undo last</button></div>
            {dayLogs.length ? <div className="space-y-2">{dayLogs.map(log => <div key={log.id} className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 p-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-400/10"><Droplets className="h-4 w-4 text-sky-400" /></div>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{log.ml.toLocaleString()} ml</p><p className="text-[11px] text-muted-foreground"><Clock3 className="mr-1 inline h-3 w-3" />{new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div>
              {editingLog === log.id ? <><input type="number" min="1" max="5000" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="field w-20" /><button onClick={() => saveEditedLog(log)} aria-label="Save amount" className="rounded-lg p-2 text-emerald-500"><Check className="h-4 w-4" /></button><button onClick={() => setEditingLog(null)} aria-label="Cancel edit" className="rounded-lg p-2 text-muted-foreground"><X className="h-4 w-4" /></button></> : <><button onClick={() => { setEditingLog(log.id); setEditAmount(String(log.ml)); }} aria-label="Edit water entry" className="rounded-lg p-2 text-muted-foreground"><Pencil className="h-4 w-4" /></button><button onClick={() => deleteWaterLog(log)} aria-label="Delete water entry" className="rounded-lg p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button></>}
            </div>)}</div> : <p className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">No water entries for this day yet. Add your first glass above.</p>}
          </div>
          <div className="space-y-3 border-t border-border pt-4"><div><h3 className="text-sm font-semibold">Last 7 days</h3><p className="text-[11px] text-muted-foreground">Your daily water intake</p></div>
            <div className="flex h-28 items-end justify-between gap-2">{lastSevenDays.map(day => { const value = water[day] || 0; const height = Math.max(5, Math.round((value / maxWater) * 100)); return <div key={day} className="flex h-full flex-1 flex-col items-center justify-end gap-1"><span className="text-[9px] text-muted-foreground">{value ? (value/1000).toFixed(1) + "L" : "—"}</span><div className="flex h-16 w-full items-end overflow-hidden rounded-t-md bg-secondary"><div className="w-full rounded-t-md bg-sky-400 transition-all duration-500" style={{ height: height + "%" }} /></div><span className="text-[9px] text-muted-foreground">{new Date(day + "T12:00:00").toLocaleDateString(undefined, { weekday: "short" })}</span></div>; })}</div>
          </div>
        </div>
      </section>
      {goalOpen && <div className="fixed inset-0 z-[110] grid place-items-center bg-black/70 p-4"><div className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-5 shadow-2xl"><div className="flex items-center justify-between"><h3 className="font-semibold">Daily water goal</h3><button onClick={() => setGoalOpen(false)} aria-label="Close goal settings"><X className="h-5 w-5" /></button></div><p className="text-xs text-muted-foreground">Set a personal target in milliliters (250–10,000 ml).</p><input type="number" min="250" max="10000" step="50" value={goalAmount} onChange={e => setGoalAmount(e.target.value)} className="field" /><div className="flex gap-2"><button onClick={() => setGoalOpen(false)} className="flex-1 rounded-xl border border-border py-3 text-sm">Cancel</button><button onClick={saveGoal} className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground">Save goal</button></div></div></div>}
      <section className="card-x space-y-4">
        <div><h2 className="font-semibold">SleepX Record · PDF</h2><p className="mt-1 text-sm text-muted-foreground">Choose the record period. Preview the report before saving it as a PDF.</p></div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-medium text-muted-foreground">From date<input type="date" max={reportEnd || today} value={reportStart} onChange={e => setReportStart(e.target.value)} className="field mt-1" /></label>
          <label className="text-xs font-medium text-muted-foreground">To date<input type="date" min={reportStart} max={today} value={reportEnd} onChange={e => setReportEnd(e.target.value)} className="field mt-1" /></label>
        </div>
        <div className="rounded-xl border border-border bg-secondary/60 p-3">
          <p className="text-xs text-muted-foreground">Selected report period</p>
          <p className="mt-1 font-semibold">{reportStart ? formatDate(reportStart) : "—"} – {reportEnd ? formatDate(reportEnd) : "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{sleepLogsInRange.length} sleep entries · {report.length} days included</p>
        </div>
        <button onClick={openPreview} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground"><Eye className="h-4 w-4" /> Preview PDF</button>
        {reportError && !previewOpen && <p role="alert" className="text-sm text-red-500">{reportError}</p>}
        <p className="text-xs text-muted-foreground">Your report is generated on this device. No record data is uploaded.</p>
      </section>
    </div>
    {previewOpen && <div className="fixed inset-0 z-[100] flex flex-col bg-[#09080b]/95 text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <button onClick={() => setPreviewOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/75"><ArrowLeft className="h-4 w-4" /> Back</button>
        <p className="text-sm font-semibold">PDF Preview</p>
        <button onClick={() => setPreviewOpen(false)} aria-label="Close preview" className="rounded-lg p-2 text-white/70"><X className="h-5 w-5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <article className="mx-auto max-w-2xl overflow-hidden rounded-xl bg-[#f7f5f4] text-[#241b21] shadow-2xl">
          <header className="border-l-4 border-[#e45170] bg-[#100d11] px-6 py-7 text-white">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#f04460]">SleeepX</h1>
            <p className="mt-2 text-[10px] font-semibold tracking-[0.2em] text-white/65">SLEEP • TRACK • RESTORE</p>
            <h2 className="mt-6 text-lg font-bold tracking-wide">SLEEP & WELLNESS RECORD</h2>
          </header>
          <div className="p-4 sm:p-6">
            <p className="text-[10px] font-bold tracking-[0.18em] text-[#a92345]">RECORD PERIOD</p>
            <p className="mt-1 text-sm font-bold">{formatDate(reportStart)} — {formatDate(reportEnd)}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-white p-3"><p className="text-[9px] font-bold text-[#8e6875]">SLEEP ENTRIES</p><p className="mt-1 text-lg font-bold text-[#a92345]">{sleepLogsInRange.length}</p></div>
              <div className="rounded-lg bg-white p-3"><p className="text-[9px] font-bold text-[#8e6875]">AVG. SLEEP</p><p className="mt-1 text-lg font-bold text-[#a92345]">{averageSleep}</p></div>
              <div className="rounded-lg bg-white p-3"><p className="text-[9px] font-bold text-[#8e6875]">DAYS</p><p className="mt-1 text-lg font-bold text-[#a92345]">{report.length}</p></div>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left text-xs">
                <thead><tr className="bg-[#281b23] text-white"><th className="p-2">Date</th><th className="p-2">Sleep</th><th className="p-2">Water</th><th className="p-2">Mood / Notes</th></tr></thead>
                <tbody>{report.map((row, i) => <tr key={row.date} className={i % 2 ? "bg-[#f0e9eb]" : "bg-white"}><td className="border-b border-[#e3d7dc] p-2 font-medium">{row.date}</td><td className="border-b border-[#e3d7dc] p-2">{row.sleep}</td><td className="border-b border-[#e3d7dc] p-2">{row.water} ml</td><td className="max-w-[180px] border-b border-[#e3d7dc] p-2">{row.mood}</td></tr>)}</tbody>
              </table>
            </div>
            {!report.some(row => row.sleep !== "—" || row.water > 0 || row.mood !== "—") && <p className="mt-4 rounded-lg bg-white p-4 text-center text-xs text-[#8e6875]">No records found in this date range yet.</p>}
            <footer className="mt-6 border-t border-[#d9cbd1] pt-4 text-[10px] text-[#8b7780]">
              <p>Personal record • Data shown is based on entries saved on this device.</p>
              <p className="mt-2 font-bold tracking-[0.2em] text-[#a92345]">DEVELOPED BY ZEROX</p>
            </footer>
          </div>
        </article>
      </div>
      <div className="border-t border-white/10 bg-[#100d11] p-4">
        {reportError && <p role="alert" className="mb-2 text-center text-sm text-red-300">{reportError}</p>}
        <button onClick={downloadReport} disabled={downloading || report.length === 0} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#bd3654] py-3.5 font-bold text-white disabled:opacity-50">
          <Download className="h-4 w-4" /> {downloading ? "Preparing PDF..." : "Download PDF"}
        </button>
      </div>
    </div>}
  </Shell>;
}
