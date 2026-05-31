import { useState, CSSProperties } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type TypeKey = "necessidade"|"desejo"|"investimento";
type FreqKey  = "mensal"|"semanal"|"anual";

export interface RecurringExpense {
  id:number; descricao:string; valor:number; cat:string; subcat:string;
  tipo:TypeKey; world:string; frequencia:FreqKey;
  dia_do_mes:number|null; proxima_data:string; ativa:boolean;
}

interface ExpCat { id:string; label:string; icon:string; type:TypeKey; sub?:string[]; }

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
const fmt = (n:number) => new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR"}).format(n||0);
const EMPTY_FORM = { descricao:"", valor:"", cat:"", subcat:"", tipo:"necessidade" as TypeKey, frequencia:"mensal" as FreqKey, dia_do_mes:"1", proxima_data:new Date().toISOString().slice(0,10) };

function nextDate(freq:FreqKey, from:string):string {
  const d = new Date(from+"T12:00:00");
  if(freq==="mensal")  d.setMonth(d.getMonth()+1);
  if(freq==="semanal") d.setDate(d.getDate()+7);
  if(freq==="anual")   d.setFullYear(d.getFullYear()+1);
  return d.toISOString().slice(0,10);
}

interface Props {
  userId: string; world: string; expCats: ExpCat[];
  accent: string; accentDark: string; cardBg: string;
  cardBorder: string; subtext: string; positive: string; negative: string;
  recurring: RecurringExpense[]; setRecurring: (v: RecurringExpense[]) => void;
  onApplyDue: (r: RecurringExpense) => void;
}

export default function RecurringExpenses({ userId, world, expCats, accent, accentDark, cardBg, cardBorder, subtext, positive, negative, recurring, setRecurring, onApplyDue }: Props) {
  const today = new Date().toISOString().slice(0,10);
  const [showForm,  setShowForm]  = useState(false);
  const [editingId, setEditingId] = useState<number|null>(null);
  const [saving,    setSaving]    = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const myRecurring = recurring.filter(r=>r.world===world);
  const dueNow = myRecurring.filter(r=>r.ativa && r.proxima_data<=today);

  const inp:CSSProperties={width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box",outline:"none",fontFamily:"'Sora',sans-serif"};
  const sel:CSSProperties={width:"100%",background:"#111827",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box",outline:"none"};
  const lbl:CSSProperties={fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:5};

  function openEdit(r: RecurringExpense) {
    setEditingId(r.id);
    setForm({ descricao:r.descricao, valor:String(r.valor), cat:r.cat, subcat:r.subcat, tipo:r.tipo, frequencia:r.frequencia, dia_do_mes:String(r.dia_do_mes||1), proxima_data:r.proxima_data });
    setShowForm(true);
    window.scrollTo({ top:0, behavior:"smooth" });
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  }

  async function saveRecurring() {
    if(!form.descricao.trim()||!form.valor||!form.cat) return;
    setSaving(true);
    const payload = { descricao:form.descricao.trim(), valor:Number(form.valor), cat:form.cat, subcat:form.subcat, tipo:form.tipo, frequencia:form.frequencia, dia_do_mes:Number(form.dia_do_mes)||null, proxima_data:form.proxima_data };
    if(editingId) {
      await supabase.from("recurring_expenses").update(payload).eq("id",editingId);
      setRecurring(recurring.map(r=>r.id===editingId?{...r,...payload}:r));
    } else {
      const {data,error} = await supabase.from("recurring_expenses").insert({user_id:userId,...payload,world,ativa:true}).select().single();
      if(!error&&data) setRecurring([...recurring, data as RecurringExpense]);
    }
    resetForm();
    setSaving(false);
  }

  async function toggleActive(r:RecurringExpense) {
    await supabase.from("recurring_expenses").update({ativa:!r.ativa}).eq("id",r.id);
    setRecurring(recurring.map(x=>x.id===r.id?{...x,ativa:!x.ativa}:x));
  }

  async function deleteRecurring(id:number) {
    if(!window.confirm("Apagar esta despesa recorrente?")) return;
    await supabase.from("recurring_expenses").delete().eq("id",id);
    setRecurring(recurring.filter(r=>r.id!==id));
  }

  async function applyAndAdvance(r:RecurringExpense) {
    onApplyDue(r);
    const next = nextDate(r.frequencia, r.proxima_data);
    await supabase.from("recurring_expenses").update({proxima_data:next}).eq("id",r.id);
    setRecurring(recurring.map(x=>x.id===r.id?{...x,proxima_data:next}:x));
  }

  const selCat = expCats.find(c=>c.id===form.cat);

  return (
    <div>
      {/* Due now banner */}
      {dueNow.length>0&&(
        <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:"#f59e0b",marginBottom:8}}>🔔 {dueNow.length} despesa{dueNow.length>1?"s":""} a vencer!</div>
          {dueNow.map(r=>{
            const cat=expCats.find(c=>c.id===r.cat);
            return(
              <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(245,158,11,0.15)"}}>
                <span style={{fontSize:18}}>{cat?.icon||"📦"}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{r.descricao}</div>
                  <div style={{fontSize:11,color:"#94a3b8"}}>{FREQ_META[r.frequencia].label} · {new Date(r.proxima_data+"T12:00:00").toLocaleDateString("pt-PT")}</div>
                </div>
                <div style={{fontSize:14,fontWeight:800,color:negative}}>{fmt(Number(r.valor))}</div>
                <button onClick={()=>applyAndAdvance(r)} style={{padding:"6px 12px",background:`${accent}22`,border:`1px solid ${accent}50`,borderRadius:8,color:accent,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif",whiteSpace:"nowrap"}}>✓ Registar</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit button */}
      <button onClick={()=>{if(showForm&&!editingId){resetForm();}else{setEditingId(null);setForm(EMPTY_FORM);setShowForm(true);}}} style={{width:"100%",marginBottom:14,padding:"11px 0",background:showForm?`${accent}18`:`linear-gradient(135deg,${accent},${accentDark})`,border:showForm?`1px solid ${accent}40`:"none",borderRadius:10,color:showForm?accent:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif",transition:"all .2s"}}>
        {showForm?(editingId?"✕ Cancelar edição":"✕ Cancelar"):"+ Adicionar despesa recorrente"}
      </button>

      {/* Form */}
      {showForm&&(
        <div style={{background:cardBg,border:`1px solid ${editingId?"#f59e0b":accent}40`,borderRadius:14,padding:"16px 18px",marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:editingId?"#f59e0b":accent,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:14}}>
            {editingId?"✏️ Editar despesa recorrente":"Nova despesa recorrente"}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={lbl}>Descrição</label><input style={inp} placeholder="Ex: Ginásio" value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}/></div>
            <div><label style={lbl}>Valor (€)</label><input style={inp} type="number" placeholder="0,00" value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <label style={lbl}>Categoria</label>
              <select style={sel} value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value,subcat:""}))}>
                <option value="">Selecionar...</option>
                {expCats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Frequência</label>
              <select style={sel} value={form.frequencia} onChange={e=>setForm(f=>({...f,frequencia:e.target.value as FreqKey}))}>
                <option value="mensal">📅 Mensal</option>
                <option value="semanal">📆 Semanal</option>
                <option value="anual">🗓️ Anual</option>
              </select>
            </div>
          </div>
          {selCat?.sub&&(
            <div style={{marginBottom:10}}>
              <label style={lbl}>Sub-categoria</label>
              <div style={{display:"flex",flexWrap:"wrap" as const,gap:6}}>
                {selCat.sub.map((s:string)=>{const a=form.subcat===s;return<button key={s} onClick={()=>setForm(f=>({...f,subcat:a?"":s}))} style={{padding:"6px 12px",border:`1.5px solid ${a?accent:"rgba(255,255,255,0.13)"}`,borderRadius:99,background:a?`${accent}22`:"rgba(255,255,255,0.04)",color:a?accent:"#94a3b8",fontSize:12,fontWeight:a?700:500,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>{s}</button>;})}
              </div>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <label style={lbl}>Tipo</label>
              <select style={sel} value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value as TypeKey}))}>
                <option value="necessidade">🏠 Necessidade</option>
                <option value="desejo">✨ Desejo</option>
                <option value="investimento">📈 Investimento</option>
              </select>
            </div>
            <div>
              <label style={lbl}>{editingId?"Próxima data":"Primeira data"}</label>
              <input style={inp} type="date" value={form.proxima_data} onChange={e=>setForm(f=>({...f,proxima_data:e.target.value}))}/>
            </div>
          </div>
          <button onClick={saveRecurring} disabled={saving} style={{width:"100%",padding:"11px 0",background:`linear-gradient(135deg,${editingId?"#f59e0b":accent},${editingId?"#d97706":accentDark})`,border:"none",borderRadius:9,color:"#fff",fontWeight:700,fontSize:13,cursor:saving?"not-allowed":"pointer",fontFamily:"'Sora',sans-serif",opacity:saving?0.7:1}}>
            {saving?"A guardar...":(editingId?"✓ Guardar alterações":"+ Criar despesa recorrente")}
          </button>
          {editingId&&<button onClick={resetForm} style={{width:"100%",marginTop:8,padding:"9px 0",background:"rgba(255,255,255,0.04)",border:`1px solid ${cardBorder}`,borderRadius:9,color:subtext,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>✕ Cancelar</button>}
        </div>
      )}

      {/* Empty */}
      {myRecurring.length===0&&!showForm&&(
        <div style={{textAlign:"center" as const,color:subtext,fontSize:13,padding:"32px 0"}}>
          <div style={{fontSize:32,marginBottom:10}}>🔄</div>
          <div style={{fontWeight:600,color:"#e2e8f0",marginBottom:4}}>Sem despesas recorrentes</div>
          <div>Adiciona despesas fixas como renda, ginásio ou seguros.</div>
        </div>
      )}

      {/* List */}
      {myRecurring.map(r=>{
        const cat=expCats.find(c=>c.id===r.cat);
        const freq=FREQ_META[r.frequencia];
        const isDue=r.proxima_data<=today&&r.ativa;
       return(
          <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${cardBorder}`,opacity:r.ativa?1:0.5}}>
            <span style={{fontSize:17,minWidth:28,textAlign:"center" as const}}>{cat?.icon||"📦"}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0",whiteSpace:"nowrap" as const,overflow:"hidden",textOverflow:"ellipsis"}}>{r.descricao}{r.subcat?<span style={{color:subtext}}> · {r.subcat}</span>:""}</div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2,flexWrap:"nowrap" as const,overflow:"hidden"}}>
                <span style={{fontSize:10,color:freq.color,fontWeight:600,flexShrink:0}}>{freq.icon} {freq.label}</span>
                <span style={{fontSize:10,color:TYPE_META[r.tipo].color,fontWeight:600,flexShrink:0}}>{TYPE_META[r.tipo].label}</span>
                <span style={{fontSize:10,color:subtext,flexShrink:0}}>{new Date(r.proxima_data+"T12:00:00").toLocaleDateString("pt-PT")}</span>
                {isDue&&<span style={{fontSize:10,color:"#f59e0b",fontWeight:700,flexShrink:0}}>🔔</span>}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
              <span style={{fontSize:13,fontWeight:700,color:negative}}>{fmt(Number(r.valor))}</span>
              {isDue&&<button onClick={()=>applyAndAdvance(r)} style={{width:26,height:26,background:`${accent}22`,border:`1px solid ${accent}40`,borderRadius:7,color:accent,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✓</button>}
              <button onClick={()=>openEdit(r)} style={{width:26,height:26,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:7,color:subtext,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button>
              <button onClick={()=>toggleActive(r)} style={{width:26,height:26,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:7,color:r.ativa?"#f59e0b":"#94a3b8",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{r.ativa?"⏸":"▶"}</button>
              <button onClick={()=>deleteRecurring(r.id)} style={{width:26,height:26,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:7,color:"#f87171",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>🗑️</button>
            </div>
          </div>
        );

      {/* Summary */}
      {myRecurring.filter(r=>r.ativa).length>0&&(
        <div style={{background:cardBg,border:`1px solid ${cardBorder}`,borderRadius:12,padding:"12px 16px",marginTop:8}}>
          <div style={{fontSize:10,fontWeight:700,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:8}}>Resumo recorrentes ativas</div>
          {(["mensal","semanal","anual"] as FreqKey[]).map(freq=>{
            const total=myRecurring.filter(r=>r.ativa&&r.frequencia===freq).reduce((s,r)=>s+Number(r.valor),0);
            if(!total) return null;
            const f=FREQ_META[freq];
            return(
              <div key={freq} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${cardBorder}`}}>
                <span style={{fontSize:12,color:"#94a3b8"}}>{f.icon} {f.label}</span>
                <span style={{fontSize:13,fontWeight:700,color:negative}}>{fmt(total)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
