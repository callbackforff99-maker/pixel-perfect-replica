import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Share2, Printer, Moon, CalendarDays, BedDouble, BarChart3, BookOpen, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { jsPDF } from "jspdf";
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

function buildPdf(db: DB, logs: DB["sleep"][], start: Date, end: Date) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const crimson = [190, 35, 67] as const;
  const dark = [18, 12, 16] as const;
  const text = [42, 34, 39] as const;
  const pageW = 210;
  const margin = 16;
  const durations = logs.map(l => durationMinutes(l.start, l.end));
  const avg = durations.length ? Math.round(durations.reduce((a,b)=>a+b,0) / durations.length) : 0;
  const total = durations.reduce((a,b)=>a+b,0);
  const best = logs.length ? Math.max(...durations) : 0;
  const rangeText = start.toLocaleDateString([], {day:"2-digit",month:"short",year:"numeric"}) + " – " + end.toLocaleDateString([], {day:"2-digit",month:"short",year:"numeric"});

  const header = (title: string, page: number) => {
    pdf.setFillColor(...dark); pdf.rect(0,0,pageW,17,"F");
    pdf.setTextColor(255,255,255); pdf.setFont("helvetica","bold"); pdf.setFontSize(13); pdf.text("SleepX", margin, 11);
    pdf.setTextColor(235,92,119); pdf.setFontSize(8); pdf.text(title.toUpperCase(), pageW-margin, 11, {align:"right"});
    pdf.setTextColor(125,112,119); pdf.setFontSize(8); pdf.text("Developed by ZEROX", margin, 287);
    pdf.text("Page " + page, pageW-margin, 287, {align:"right"});
  };
  const section = (label: string, y: number) => {
    pdf.setTextColor(...crimson); pdf.setFont("helvetica","bold"); pdf.setFontSize(11); pdf.text(label, margin, y);
    pdf.setDrawColor(238,205,213); pdf.line(margin,y+2,pageW-margin,y+2);
  };

  // Cover and overview
  pdf.setFillColor(...dark); pdf.rect(0,0,pageW,297,"F");
  pdf.setDrawColor(...crimson); pdf.setLineWidth(0.8); pdf.roundedRect(9,9,192,279,5,5,"S");
  pdf.setTextColor(245,235,239); pdf.setFont("helvetica","bold"); pdf.setFontSize(30); pdf.text("SleepX", margin, 42);
  pdf.setTextColor(238,80,112); pdf.setFontSize(10); pdf.text("YOUR SPACE. YOUR PACE.", margin, 51);
  pdf.setTextColor(255,255,255); pdf.setFontSize(25); pdf.text("Your Personal", margin, 91); pdf.text("Sleep Report", margin, 103);
  pdf.setTextColor(220,191,201); pdf.setFontSize(11); pdf.text(rangeText, margin, 115);
  pdf.setDrawColor(...crimson); pdf.line(margin,127,pageW-margin,127);
  const cards = [{label:"Average sleep",value:avg?fmtDuration(avg):"—"},{label:"Recorded days",value:String(logs.length)},{label:"Total sleep",value:total?fmtDuration(total):"—"},{label:"Best sleep",value:best?fmtDuration(best):"—"}];
  cards.forEach((c,i)=>{ const x=margin+(i%2)*91, y=143+Math.floor(i/2)*34; pdf.setFillColor(39,23,31); pdf.roundedRect(x,y,85,27,3,3,"F"); pdf.setTextColor(221,181,193); pdf.setFontSize(8); pdf.text(c.label,x+5,y+9); pdf.setTextColor(255,255,255); pdf.setFont("helvetica","bold"); pdf.setFontSize(15); pdf.text(c.value,x+5,y+20); });
  pdf.setTextColor(218,188,198); pdf.setFont("helvetica","normal"); pdf.setFontSize(9); pdf.text("A personal record of your sleep patterns. Not a medical assessment.", margin, 226);
  pdf.setTextColor(238,80,112); pdf.setFontSize(8); pdf.text("SLEEPX  •  CRIMSON EDITION", margin, 269);

  // Analytics page
  pdf.addPage(); header("Sleep analytics",2);
  pdf.setTextColor(...text); pdf.setFont("helvetica","bold"); pdf.setFontSize(19); pdf.text("Sleep overview",margin,33);
  section("SLEEP DURATION",48);
  const chartLogs = [...logs].sort((a,b)=>a.end.localeCompare(b.end)).slice(-30);
  const chartY=63, chartH=55, chartW=pageW-2*margin;
  pdf.setDrawColor(225,214,218); pdf.line(margin,chartY+chartH,pageW-margin,chartY+chartH);
  chartLogs.forEach((l,i)=>{ const h=Math.min(10,durationMinutes(l.start,l.end)/60)/10*chartH; const bw=Math.max(1.2,Math.min(5,chartW/chartLogs.length-1)); const x=margin+i*(chartW/chartLogs.length)+(chartW/chartLogs.length-bw)/2; pdf.setFillColor(...crimson); pdf.roundedRect(x,chartY+chartH-h,bw,h,0.8,0.8,"F"); });
  pdf.setTextColor(120,105,113); pdf.setFontSize(8); pdf.text("Daily sleep duration (hours, capped at 10h for display)",margin,chartY+chartH+8);
  section("YOUR RECORDS",151);
  const rows = [["Metric","Value"],["Average sleep",avg?fmtDuration(avg):"No records"],["Total sleep",total?fmtDuration(total):"No records"],["Recorded days",String(logs.length)],["Best sleep",best?fmtDuration(best):"—"]];
  let y=163;
  rows.forEach((r,i)=>{ if(i===0){pdf.setFillColor(248,235,239);pdf.rect(margin,y-6,chartW,9,"F");} pdf.setTextColor(...(i===0?crimson:text)); pdf.setFont("helvetica",i===0?"bold":"normal"); pdf.setFontSize(9); pdf.text(r[0],margin+3,y); pdf.text(r[1],pageW-margin-3,y,{align:"right"}); y+=12; pdf.setDrawColor(238,228,231); pdf.line(margin,y-7,pageW-margin,y-7); });
  pdf.setTextColor(120,105,113); pdf.setFontSize(8); pdf.text("Only saved sleep logs in the selected date range are included.",margin,236);

  // Journal page(s)
  const entries = [...db.mood].filter(m=>m.date>=start.toISOString().slice(0,10)&&m.date<=end.toISOString().slice(0,10)).sort((a,b)=>a.date.localeCompare(b.date));
  pdf.addPage(); header("Daily journal",3);
  pdf.setTextColor(...text); pdf.setFont("helvetica","bold"); pdf.setFontSize(19); pdf.text("Daily sleep journal",margin,33);
  section("SLEEP LOGS",48);
  let rowY=61;
  pdf.setFillColor(248,235,239); pdf.rect(margin,rowY-7,chartW,10,"F");
  pdf.setTextColor(...crimson); pdf.setFont("helvetica","bold"); pdf.setFontSize(8);
  pdf.text("DATE",margin+2,rowY); pdf.text("DURATION",margin+43,rowY); pdf.text("FELL ASLEEP",margin+86,rowY); pdf.text("WOKE UP",margin+130,rowY);
  rowY+=12;
  pdf.setFont("helvetica","normal"); pdf.setTextColor(...text);
  logs.forEach((l)=>{ if(rowY>255){pdf.addPage();header("Daily journal",pdf.getNumberOfPages());rowY=30;} pdf.setFontSize(8); pdf.text(dateLabel(l.end),margin+2,rowY); pdf.text(fmtDuration(durationMinutes(l.start,l.end)),margin+43,rowY); pdf.text(timeLabel(l.start),margin+86,rowY); pdf.text(timeLabel(l.end),margin+130,rowY); pdf.setDrawColor(238,228,231); pdf.line(margin,rowY+4,pageW-margin,rowY+4); rowY+=11; });
  rowY=Math.max(rowY+9, Math.min(rowY+14,245));
  if(rowY>255){pdf.addPage();header("Daily journal",pdf.getNumberOfPages());rowY=30;}
  section("MOOD & NOTES",rowY); rowY+=13;
  pdf.setFontSize(8); pdf.setTextColor(...text);
  entries.forEach(m=>{ if(rowY>265){pdf.addPage();header("Daily journal",pdf.getNumberOfPages());rowY=30;} pdf.setFont("helvetica","bold");pdf.text(m.date,margin,rowY);pdf.setFont("helvetica","normal");pdf.text("Mood: "+moodEmoji(m.mood)+"   Stress: "+(m.stress?moodEmoji(m.stress):"—")+"   Energy: "+(m.energy?moodEmoji(m.energy):"—"),margin+34,rowY); rowY+=6; if(m.text){const lines=pdf.splitTextToSize(m.text,chartW-34);pdf.text(lines,margin+34,rowY);rowY+=Math.min(lines.length*4,18);} rowY+=4; });
  if(!logs.length && !entries.length){pdf.setTextColor(120,105,113);pdf.text("No sleep or journal records were saved in this period.",margin,rowY+5);}
  return pdf;
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
  const save=async()=>{
    setBusy(true);setStatus(null);
    try{
      const pdf=exportPdf(); const filename="SleepX_Report_"+new Date().toISOString().slice(0,10)+".pdf";
      if(Capacitor.isNativePlatform()){
        const base64=pdf.output("datauristring").split(",")[1];
        const saved=await Filesystem.writeFile({path:filename,data:base64,directory:Directory.Documents,recursive:true});
        setStatus({kind:"success",text:"PDF saved to your device Documents folder."});
        try{await Share.share({title:"SleepX Report",text:"Your SleepX sleep report",url:saved.uri,dialogTitle:"Share SleepX report"});}catch{}
      }else{
        pdf.save(filename);
        setStatus({kind:"success",text:"Your PDF download has started."});
      }
    }catch(e){setStatus({kind:"error",text:e instanceof Error?e.message:"Couldn't save the PDF. Please try again."});}
    finally{setBusy(false);}
  };
  const share=async()=>{
    try{const pdf=exportPdf();const blob=pdf.output("blob");const file=new File([blob],"SleepX_Report.pdf",{type:"application/pdf"});if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:"SleepX Report"});}else{await save();}}catch{setStatus({kind:"error",text:"Sharing isn't available on this device. Try Download instead."});}
  };
  const print=()=>{const pdf=exportPdf();const url=URL.createObjectURL(pdf.output("blob"));const win=window.open(url,"_blank");if(!win){URL.revokeObjectURL(url);setStatus({kind:"error",text:"Allow pop-ups to print this report."});return;}win.onload=()=>win.print();setTimeout(()=>URL.revokeObjectURL(url),60000);};
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
