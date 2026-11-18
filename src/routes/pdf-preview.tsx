import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Share2, Printer, Moon, CalendarDays, BedDouble, BarChart3, BookOpen, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { canvasPagesToPdfBlob, downloadPdfBlob } from "@/lib/pdf-export";
import { Shell } from "@/components/Shell";
import { useDB, type DB } from "@/lib/store";
import { durationMinutes, fmtDuration } from "@/lib/sleep";

export const Route = createFileRoute("/pdf-preview")({
  head: () => ({ meta: [{ title: "PDF Preview — SleepX" }] }),
  component: PdfPreview,
});

const dateLabel = (iso: string) => new Date(iso).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const moodEmoji = (n?: number) => n ? ["😞","😕","😐","🙂","😄"][Math.max(0, Math.min(4, n - 1))] : "—";

function buildPdf(db: DB, logs: DB["sleep"][], start: Date, end: Date): Blob {
  const moodEntries = db.mood.filter(entry => entry.date >= start.toISOString().slice(0,10) && entry.date <= end.toISOString().slice(0,10)).sort((a,b)=>a.date.localeCompare(b.date));
  const avg = logs.length ? Math.round(logs.reduce((sum, log) => sum + durationMinutes(log.start, log.end), 0) / logs.length) : 0;
  const total = logs.reduce((sum, log) => sum + durationMinutes(log.start, log.end), 0);
  const best = logs.length ? Math.max(...logs.map(log => durationMinutes(log.start, log.end))) : 0;
  const range = dateLabel(start.toISOString()) + " – " + dateLabel(end.toISOString());
  const lines = [
    "YOUR PERSONAL SLEEP REPORT",
    range,
    "",
    "OVERVIEW",
    "Average sleep: " + (avg ? fmtDuration(avg) : "—"),
    "Recorded days: " + logs.length,
    "Total sleep: " + (total ? fmtDuration(total) : "—"),
    "Best sleep: " + (best ? fmtDuration(best) : "—"),
    "",
    "SLEEP RECORDS",
    ...logs.map(log => dateLabel(log.end) + "   " + fmtDuration(durationMinutes(log.start, log.end)) + "   Fell asleep " + timeLabel(log.start) + "   Woke up " + timeLabel(log.end)),
    "",
    "MOOD & NOTES",
    ...moodEntries.flatMap(entry => [
      entry.date + "   Mood " + moodEmoji(entry.mood) + "   Stress " + moodEmoji(entry.stress) + "   Energy " + moodEmoji(entry.energy),
      ...(entry.text ? [entry.text] : [])
    ]),
    "",
    "Personal record • Based only on entries saved on this device.",
    "Developed by ZEROX"
  ];
  const pages: HTMLCanvasElement[] = [];
  const pageLines = 29;
  for (let offset = 0; offset < Math.max(1, lines.length); offset += pageLines) {
    const canvas = document.createElement("canvas");
    canvas.width = 1240;
    canvas.height = 1754;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare the PDF page.");
    ctx.fillStyle = "#f7f3f4"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#100c10"; ctx.fillRect(0, 0, canvas.width, 300);
    ctx.fillStyle = "#bd2343"; ctx.fillRect(0, 0, 14, 300);
    ctx.fillStyle = "#f04468"; ctx.font = "bold 66px Arial"; ctx.fillText("SleepX", 72, 112);
    ctx.fillStyle = "#e8dce1"; ctx.font = "22px Arial"; ctx.fillText("YOUR SPACE. YOUR PACE.", 76, 158);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 34px Arial"; ctx.fillText("SLEEP & WELLNESS RECORD", 72, 232);
    ctx.fillStyle = "#bd2343"; ctx.font = "bold 23px Arial"; ctx.fillText("PERSONAL RECORD", 72, 370);
    ctx.fillStyle = "#30232a"; ctx.font = "20px Arial"; ctx.fillText("Generated on this device • " + range, 72, 414);
    let y = 500;
    const page = lines.slice(offset, offset + pageLines);
    page.forEach((line, index) => {
      if (!line) { y += 18; return; }
      const isHeading = ["YOUR PERSONAL SLEEP REPORT","OVERVIEW","SLEEP RECORDS","MOOD & NOTES"].includes(line);
      ctx.font = isHeading ? "bold 25px Arial" : "20px Arial";
      ctx.fillStyle = isHeading ? "#a92345" : "#30232a";
      const words = line.split(/\\s+/);
      let current = "";
      for (const word of words) {
        const next = current ? current + " " + word : word;
        if (current && ctx.measureText(next).width > 1080) { ctx.fillText(current, 76, y); y += 32; current = word; }
        else current = next;
      }
      if (current) { ctx.fillText(current, 76, y); y += isHeading ? 43 : 34; }
    });
    ctx.fillStyle = "#bd2343"; ctx.fillRect(72, 1645, 1096, 2);
    ctx.fillStyle = "#8b7780"; ctx.font = "17px Arial"; ctx.fillText("SLEEPX • CRIMSON EDITION", 72, 1690);
    ctx.fillText("Page " + (pages.length + 1), 1080, 1690);
    pages.push(canvas);
  }
  return canvasPagesToPdfBlob(pages);
}

function PdfPreview() {
  const db=useDB();
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState<{kind:"success"|"error";text:string}|null>(null);
  const [page,setPage]=useState(1);
  const end=new Date(); const start=new Date(end.getTime()-29*86400000); start.setHours(0,0,0,0);
  const logs=useMemo(()=>db.sleep.filter(l=>new Date(l.end)>=start&&new Date(l.end)<=end).sort((a,b)=>a.end.localeCompare(b.end)),[db.sleep]);
  const stats=logs.map(l=>durationMinutes(l.start,l.end));
  const avg=stats.length?Math.round(stats.reduce((a,b)=>a+b,0)/stats.length):0;
  const chart=[...logs].slice(-18);
  const exportPdf=()=>buildPdf(db,logs,start,end);
  const filename="SleepX_Report_"+new Date().toISOString().slice(0,10)+".pdf";
  const save=async()=>{
    setBusy(true);setStatus(null);
    try{
      const blob=exportPdf();
      await downloadPdfBlob(blob,filename);
      setStatus({kind:"success",text:"Your PDF download has started. If it doesn't appear, check your browser's downloads."});
    }catch(e){setStatus({kind:"error",text:e instanceof Error?e.message:"Couldn't create the PDF. Please try again."});}
    finally{setBusy(false);}
  };
  const share=async()=>{
    try{
      const blob=exportPdf();
      const file=new File([blob],filename,{type:"application/pdf"});
      if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:"SleepX Report"});}
      else {await downloadPdfBlob(blob,filename);setStatus({kind:"success",text:"Your PDF download has started."});}
    }catch{setStatus({kind:"error",text:"Sharing isn't available on this device. Try Download instead."});}
  };
  const print=()=>{
    try{
      const url=URL.createObjectURL(exportPdf());
      const win=window.open(url,"_blank");
      if(!win){URL.revokeObjectURL(url);setStatus({kind:"error",text:"Allow pop-ups to print this report."});return;}
      win.onload=()=>win.print();
      window.setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(e){setStatus({kind:"error",text:e instanceof Error?e.message:"Couldn't prepare the PDF for printing."});}
  };
  return <Shell><div className="space-y-4 px-4 pb-8">
    <header className="flex items-center gap-3 pt-1"><Link to="/sleep" className="grid h-10 w-10 place-items-center rounded-xl bg-secondary"><ArrowLeft size={19}/></Link><div className="flex-1"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-primary">SleepX</p><h1 className="text-xl font-bold">PDF Preview</h1><p className="text-xs text-muted-foreground">Your 30 days sleep report</p></div><span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">Crimson</span></header>
    <div className="rounded-[1.5rem] border border-[#7c2940] bg-[#0d0a0d] p-3 shadow-[0_16px_45px_rgba(189,54,84,.14)]">
      <div className="min-h-[560px] rounded-xl border border-[#6e263b] bg-gradient-to-b from-[#1b0d14] via-[#100c10] to-black p-4 text-white">
        <div className="flex items-center justify-between"><div><p className="text-2xl font-extrabold tracking-tight">Sleep<span className="text-[#ed4268]">X</span></p><p className="text-[9px] tracking-[.2em] text-rose-200/70">YOUR SPACE. YOUR PACE.</p></div><Moon className="text-[#ed4268]" size={30}/></div>
        <div className="my-7 border-y border-rose-900/70 py-6"><p className="text-[10px] font-semibold tracking-[.18em] text-rose-300">YOUR PERSONAL</p><h2 className="mt-1 text-3xl font-bold">Sleep Report</h2><p className="mt-2 text-xs text-rose-100/70">{dateLabel(start.toISOString())} – {dateLabel(end.toISOString())}</p></div>
        {page===1?<><div className="grid grid-cols-2 gap-2">{[{i:BedDouble,l:"Average sleep",v:avg?fmtDuration(avg):"—"},{i:CalendarDays,l:"Recorded days",v:String(logs.length)},{i:Moon,l:"Total sleep",v:fmtDuration(stats.reduce((a,b)=>a+b,0))},{i:BarChart3,l:"Best sleep",v:stats.length?fmtDuration(Math.max(...stats)):"—"}].map(({i:Icon,l,v})=><div key={l} className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-3"><Icon size={17} className="mb-2 text-[#f04b70]"/><p className="text-[10px] text-rose-100/60">{l}</p><p className="mt-1 text-lg font-bold">{v}</p></div>)}</div><div className="mt-5 rounded-xl border border-rose-900/50 bg-black/30 p-3"><p className="mb-3 flex items-center gap-2 text-sm font-semibold"><BarChart3 size={16} className="text-primary"/>Sleep Duration Overview</p><div className="flex h-28 items-end gap-1">{chart.map(l=><div key={l.id} className="flex-1 rounded-t bg-gradient-to-t from-[#8c1535] to-[#f04b70]" style={{height:Math.max(5,Math.min(100,durationMinutes(l.start,l.end)/600*100))+"%"}}/>)}</div><div className="mt-2 flex justify-between text-[9px] text-rose-100/50"><span>{chart[0]?dateLabel(chart[0].end):"No data"}</span><span>{chart.at(-1)?dateLabel(chart.at(-1)!.end):"—"}</span></div></div></>:<div className="rounded-xl border border-rose-900/50 bg-black/30 p-3"><p className="mb-3 flex items-center gap-2 text-sm font-semibold"><BookOpen size={16} className="text-primary"/>Daily Sleep Journal</p>{logs.slice((page-2)*8,(page-1)*8).map(l=><div key={l.id} className="flex justify-between border-b border-rose-900/30 py-2 text-xs"><span>{dateLabel(l.end)}</span><span>{fmtDuration(durationMinutes(l.start,l.end))}</span><span>{moodEmoji(db.mood.find(m=>m.date===l.end.slice(0,10))?.mood)}</span></div>)}{!logs.length&&<p className="py-8 text-center text-xs text-rose-100/60">No sleep logs recorded yet.</p>}</div>}
        <div className="mt-7 flex items-center justify-between border-t border-rose-900/50 pt-3 text-[9px] text-rose-100/60"><span>Developed by ZEROX</span><span>Page {page} / 3</span></div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-5"><button onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-full bg-secondary p-2" aria-label="Previous page"><ChevronLeft size={18}/></button><span className="min-w-16 rounded-full bg-secondary px-4 py-2 text-center text-sm">{page} / 3</span><button onClick={()=>setPage(p=>Math.min(3,p+1))} className="rounded-full bg-secondary p-2" aria-label="Next page"><ChevronRight size={18}/></button></div>
    </div>
    {status&&<div role="status" className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${status.kind==="success"?"border-emerald-500/30 bg-emerald-500/10 text-emerald-300":"border-destructive/30 bg-destructive/10 text-destructive"}`}>{status.kind==="success"?<CheckCircle2 size={18}/>:<AlertCircle size={18}/>}<span>{status.text}</span></div>}
    <div className="grid grid-cols-3 gap-2"><button disabled={busy} onClick={save} className="flex flex-col items-center gap-2 rounded-2xl bg-primary py-4 text-xs font-bold text-primary-foreground disabled:opacity-60">{busy?<Loader2 className="animate-spin"/>:<Download/>}Download</button><button onClick={share} className="flex flex-col items-center gap-2 rounded-2xl border border-primary/60 py-4 text-xs font-bold text-foreground"><Share2/>Share</button><button onClick={print} className="flex flex-col items-center gap-2 rounded-2xl border border-primary/60 py-4 text-xs font-bold text-foreground"><Printer/>Print</button></div>
    <p className="text-center text-[11px] text-muted-foreground">Report uses your saved entries only. No records are invented.</p>
  </div></Shell>;
}
