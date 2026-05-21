import { useState, CSSProperties } from "react";
import { supabase } from "./supabase";
import { t } from "./i18n";

type TypeKey = "necessidade"|"desejo"|"investimento";
type FreqKey = "mensal"|"semanal"|"anual";

export interface CoupleRecurringExpense {
  id:number; couple_id:number; descricao:string; valor:number;
  cat:string; tipo:TypeKey; frequencia:FreqKey;
  proxima_data:string; ativa:boolean; liquidado_auto:boolean;
}

interface ExpCat { id:string; label:string; icon:string; type:TypeKey; }

const fmt = (n:number) => new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR"}).format(n||0);
const FREQ_META: Record<FreqKey,{label:string;icon:string;color:string}> = {
  mensal:  {label:"Mensal",  icon:"📅", color:"#3b82f6"},
  semanal: {label:"Semanal", icon:"📆", color:"#f59e0b"},
  anual:   {label:"Anual",   icon:"🗓️", color:"#10b981"},
};
const TYPE_META: Record<TypeKey,{label:string;color:string;bg:string}> = {
  necessidade: {label:"Necessidade",color:"#3b82f6",bg:"#1e3a5f33"},
  desejo:      {label:"Desejo",     color:"#f59e0b",bg:"#78350f33"},
  investimento:{label:"Investimento",color:"#10b981",bg:"#064e3b33"},
};

function nextDate(freq:FreqKey, from:string):string {
  const d = new Date(from+"T12:00:00");
  if(freq==="mensal")  d.setMonth(d.getMonth()+1);
  if(freq==="semanal") d.setDate(d.getDate()+7);
  if(freq==="anual")   d.setFullYear(d.getFullYear()+1);
  return d.toISOString().slice(0,10);
}

const EMPTY = { descricao:"", valor:"", cat:"", tipo:"necessidade" as TypeKey, frequencia:"mensal" as FreqKey, proxima_data:new Date().toISOString().slice(0,10), liquidado_auto:true, split:"50/50", splitUser1:"", splitUser2:"" };

interface Props {
  coupleId: number; isUser1: boolean;
  userName: string; partnerName: string;
  expCats: ExpCat[]; accent: string; accentDark: string;
  cardBg: string; cardBorder: string; subtext: string; negative: string;
  items: CoupleRecurringExpense[]; setItems: (v:CoupleRecurringExpense[])=>void;
  onApplyDue: (r:CoupleRecurringExpense)=>void;
  lang: "pt"|"en";
}

export default function CoupleRecurring({ coupleId, isUser1, userName, partnerName, expCats, accent, accentDark, cardBg, cardBorder, subtext, negative, items, setItems, onApplyDue, lang }: Props) {
  const today = new Date().toISOString().slice(0,10);
  const [showForm,  setShowForm]  = useState(false);
  const [editingId, setEditingId] = useState<number|null>(null);
  const [saving,    setSaving]    = useState(false);
  const [form, setForm]           = useState(EMPTY);

  const dueNow = items.filter(r=>r.ativa&&r.proxima_data<=today);

  const inp:CSSProperties={width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box",outline:"none",fontFamily:"'Sora',sans-serif"};
  const sel:CSSProperties={width:"100%",background:"#111827",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box",outline:"none"};
  const lbl:CSSProperties={fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:5};

  const freqLabels = {
    mensal:  {label:t[lang].freqMonthly,  icon:"📅"},
    semanal: {label:t[lang].freqWeekly,   icon:"📆"},
    anual:   {label:t[lang].freqYearly,   icon:"🗓️"},
  };

  function openEdit(r:CoupleRecurringExpense) {
    setEditingId(r.id);
    setForm({ descricao:r.descricao, valor:String(r.valor), cat:r.cat, tipo:r.tipo, frequencia:r.frequencia, proxima_data:r.proxima_data, liquidado_auto:r.liquidado_auto, split:"50/50", splitUser1:"", splitUser2:"" });
    setShowForm(true);
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function resetForm() { setForm(EMPTY); setEditingId(null); setShowForm(false); }

  async function saveItem() {
    if(!form.descricao.trim()||!form.valor||!form.cat) return;
    setSaving(true);
    const payload = { descricao:form.descricao.trim(), valor:Number(form.valor), cat:form.cat, tipo:form.tipo, frequencia:form.frequencia, proxima_data:form.proxima_data, liquidado_auto:form.liquidado_auto };
    if(editingId) {
      await supabase.from("couple_recurring_expenses").update(payload).eq("id",editingId);
      setItems(items.map(r=>r.id===editingId?{...r,...payload}:r));
    } else {
      const {data,error} = await supabase.from("couple_recurring_expenses").insert({couple_id:coupleId,...payload,ativa:true}).select().single();
      if(!error&&data) setItems([...items, data as CoupleRecurringExpense]);
    }
    resetForm();
    setSaving(false);
  }

  async function toggleActive(r:CoupleRecurringExpense) {
    await supabase.from("couple_recurring_expenses").update({ativa:!r.ativa}).eq("id",r.id);
    setItems(items.map(x=>x.id===r.id?{...x,ativa:!x.ativa}:x));
  }

  async function deleteItem(id:number) {
    if(!window.confirm(t[lang].coupleRecDeleteConfirm)) return;
    await supabase.from("couple_recurring_expenses").delete().eq("id",id);
    setItems(items.filter(r=>r.id!==id));
  }

  async function applyAndAdvance(r:CoupleRecurringExpense) {
    onApplyDue(r);
    const next = nextDate(r.frequencia, r.proxima_data);
    await supabase.from("couple_recurring_expenses").update({proxima_data:next}).eq("id",r.id);
    setItems(items.map(x=>x.id===r.id?{...x,proxima_data:next}:x));
  }

  return (
    <div>
      {dueNow.length>0&&(
        <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:"#f59e0b",marginBottom:8}}>🔔 {dueNow.length} {dueNow.length>1?t[lang].coupleRecDuePlural:t[lang].coupleRecDue}!</div>
          {dueNow.map(r=>{
            const cat=expCats.find(c=>c.id===r.cat);
            const myShare=Number(r.valor)/2;
            return(
              <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(245,158,11,0.15)"}}>
                <span style={{fontSize:18}}>{cat?.icon||"📦"}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{r.descricao}</div>
                  <div style={{fontSize:11,color:"#94a3b8"}}>{freqLabels[r.frequencia].label} · {t[lang].coupleRecMyShare} {fmt(myShare)}</div>
                </div>
                <div style={{fontSize:14,fontWeight:800,color:negative}}>{fmt(Number(r.valor))}</div>
                <button onClick={()=>applyAndAdvance(r)} style={{padding:"6px 10px",background:`${accent}22`,border:`1px solid ${accent}50`,borderRadius:8,color:accent,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>{t[lang].coupleRecRegister}</button>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={()=>{if(showForm&&!editingId){resetForm();}else{setEditingId(null);setForm(EMPTY);setShowForm(true);}}} style={{width:"100%",marginBottom:14,padding:"11px 0",background:showForm?`${accent}18`:`linear-gradient(135deg,${accent},${accentDark})`,border:showForm?`1px solid ${accent}40`:"none",borderRadius:10,color:showForm?accent:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
        {showForm?(editingId?t[lang].cancelEdit:t[lang].cancel):t[lang].coupleRecNew}
      </button>

      {showForm&&(
        <div style={{background:cardBg,border:`1px solid ${editingId?"#f59e0b":accent}40`,borderRadius:14,padding:"16px 18px",marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:editingId?"#f59e0b":accent,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:14}}>
            {editingId?t[lang].coupleRecEditTitle:t[lang].coupleRecNewTitle}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={lbl}>{t[lang].description}</label><input style={inp} placeholder={lang==="pt"?"Ex: Prestação banco":"E.g. Mortgage"} value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}/></div>
            <div><label style={lbl}>{t[lang].coupleTotalValue}</label><input style={inp} type="number" placeholder="0,00" value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <label style={lbl}>{t[lang].category}</label>
              <select style={sel} value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))}>
                <option value="">{t[lang].selectCategory}</option>
                {expCats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>{t[lang].recurringFrequency}</label>
              <select style={sel} value={form.frequencia} onChange={e=>setForm(f=>({...f,frequencia:e.target.value as FreqKey}))}>
                <option value="mensal">📅 {t[lang].freqMonthly}</option>
                <option value="semanal">📆 {t[lang].freqWeekly}</option>
                <option value="anual">🗓️ {t[lang].freqYearly}</option>
              </select>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <label style={lbl}>{t[lang].type}</label>
              <select style={sel} value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value as TypeKey}))}>
                <option value="necessidade">🏠 {t[lang].typeNecessidade}</option>
                <option value="desejo">✨ {t[lang].typeDesejo}</option>
                <option value="investimento">📈 {t[lang].typeInvestimento}</option>
              </select>
            </div>
            <div>
              <label style={lbl}>{editingId?t[lang].recurringNextDate:t[lang].recurringFirstDate}</label>
              <input style={inp} type="date" value={form.proxima_data} onChange={e=>setForm(f=>({...f,proxima_data:e.target.value}))}/>
            </div>
          </div>

          <div onClick={()=>setForm(f=>({...f,liquidado_auto:!f.liquidado_auto}))} style={{display:"flex",alignItems:"center",gap:12,background:form.liquidado_auto?"rgba(52,211,153,0.08)":"rgba(255,255,255,0.04)",border:`1px solid ${form.liquidado_auto?"rgba(52,211,153,0.25)":"rgba(255,255,255,0.08)"}`,borderRadius:12,padding:"12px 14px",cursor:"pointer",marginBottom:14}}>
            <div style={{width:38,height:22,borderRadius:99,background:form.liquidado_auto?"#34d399":"rgba(255,255,255,0.12)",position:"relative",transition:"background .2s",flexShrink:0}}>
              <div style={{position:"absolute",top:3,left:form.liquidado_auto?18:3,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:form.liquidado_auto?"#34d399":"#64748b"}}>{t[lang].coupleRecAutoSettle}</div>
              <div style={{fontSize:11,color:subtext,marginTop:2}}>
                {form.liquidado_auto?t[lang].coupleRecAutoSettleOn:t[lang].coupleRecAutoSettleOff}
              </div>
            </div>
          </div>

          <button onClick={saveItem} disabled={saving} style={{width:"100%",padding:"11px 0",background:`linear-gradient(135deg,${editingId?"#f59e0b":accent},${editingId?"#d97706":accentDark})`,border:"none",borderRadius:9,color:"#fff",fontWeight:700,fontSize:13,cursor:saving?"not-allowed":"pointer",fontFamily:"'Sora',sans-serif",opacity:saving?0.7:1}}>
            {saving?t[lang].coupleSaving:(editingId?t[lang].saveChanges:t[lang].coupleRecCreate)}
          </button>
          {editingId&&<button onClick={resetForm} style={{width:"100%",marginTop:8,padding:"9px 0",background:"rgba(255,255,255,0.04)",border:`1px solid ${cardBorder}`,borderRadius:9,color:subtext,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>{t[lang].cancel}</button>}
        </div>
      )}

      {items.length===0&&!showForm&&(
        <div style={{textAlign:"center" as const,color:subtext,fontSize:13,padding:"24px 0"}}>
          <div style={{fontSize:28,marginBottom:8}}>🔄</div>
          <div style={{fontWeight:600,color:"#e2e8f0",marginBottom:4}}>{t[lang].coupleRecEmpty}</div>
          <div>{t[lang].coupleRecEmptyDesc}</div>
        </div>
      )}

      {items.map(r=>{
        const cat=expCats.find(c=>c.id===r.cat);
        const freq=freqLabels[r.frequencia];
        const isDue=r.proxima_data<=today&&r.ativa;
        const myShare=Number(r.valor)/2;
        return(
          <div key={r.id} style={{background:cardBg,border:`1px solid ${isDue?"rgba(245,158,11,0.4)":r.ativa?cardBorder:"rgba(255,255,255,0.04)"}`,borderRadius:14,padding:"14px 16px",marginBottom:10,opacity:r.ativa?1:0.5}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:38,height:38,borderRadius:10,background:`${accent}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{cat?.icon||"📦"}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0"}}>{r.descricao}</div>
                <div style={{display:"flex",gap:6,marginTop:3,flexWrap:"wrap" as const}}>
                  <span style={{fontSize:10,background:`${FREQ_META[r.frequencia].color}20`,color:FREQ_META[r.frequencia].color,padding:"2px 7px",borderRadius:99,fontWeight:700}}>{freq.icon} {freq.label}</span>
                  <span style={{fontSize:10,background:TYPE_META[r.tipo].bg,color:TYPE_META[r.tipo].color,padding:"2px 7px",borderRadius:99,fontWeight:700}}>{TYPE_META[r.tipo].label}</span>
                  <span style={{fontSize:10,background:r.liquidado_auto?"rgba(52,211,153,0.15)":"rgba(245,158,11,0.15)",color:r.liquidado_auto?"#34d399":"#f59e0b",padding:"2px 7px",borderRadius:99,fontWeight:700}}>{r.liquidado_auto?t[lang].coupleRecAuto:t[lang].coupleRecManual}</span>
                  {isDue&&<span style={{fontSize:10,background:"rgba(245,158,11,0.2)",color:"#f59e0b",padding:"2px 7px",borderRadius:99,fontWeight:700}}>{t[lang].coupleRecDueLabel}</span>}
                </div>
              </div>
              <div style={{textAlign:"right" as const}}>
                <div style={{fontSize:15,fontWeight:800,color:negative}}>{fmt(Number(r.valor))}</div>
                <div style={{fontSize:10,color:subtext}}>{t[lang].coupleRecEach} {fmt(myShare)}</div>
                <div style={{fontSize:10,color:subtext}}>{new Date(r.proxima_data+"T12:00:00").toLocaleDateString(lang==="pt"?"pt-PT":"en-GB")}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:6}}>
              {isDue&&<button onClick={()=>applyAndAdvance(r)} style={{flex:2,padding:"7px 0",background:`${accent}22`,border:`1px solid ${accent}40`,borderRadius:8,color:accent,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>{t[lang].coupleRecRegisterNow}</button>}
              <button onClick={()=>openEdit(r)} style={{flex:1,padding:"7px 0",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:8,color:"#f59e0b",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>✏️</button>
              <button onClick={()=>toggleActive(r)} style={{flex:1,padding:"7px 0",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:8,color:r.ativa?"#f59e0b":"#94a3b8",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>{r.ativa?"⏸":"▶"}</button>
              <button onClick={()=>deleteItem(r.id)} style={{padding:"7px 10px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,color:"#f87171",fontSize:11,cursor:"pointer"}}>🗑️</button>
            </div>
          </div>
        );
      })}

      {items.filter(r=>r.ativa).length>0&&(
        <div style={{background:cardBg,border:`1px solid ${cardBorder}`,borderRadius:12,padding:"12px 16px",marginTop:8}}>
          <div style={{fontSize:10,fontWeight:700,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:8}}>{t[lang].coupleRecSummary}</div>
          {(["mensal","semanal","anual"] as FreqKey[]).map(freq=>{
            const total=items.filter(r=>r.ativa&&r.frequencia===freq).reduce((s,r)=>s+Number(r.valor),0);
            if(!total) return null;
            const f=freqLabels[freq];
            return(
              <div key={freq} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${cardBorder}`}}>
                <span style={{fontSize:12,color:"#94a3b8"}}>{f.icon} {f.label}</span>
                <span style={{fontSize:12,color:"#94a3b8"}}>{t[lang].coupleRecTotal} {fmt(total)} · {t[lang].coupleRecEach} {fmt(total/2)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
