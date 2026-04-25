import { useState, CSSProperties } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = "https://aiifzqmwnnfnrwmacyxq.supabase.co";
const SUPA_KEY = "sb_publishable_GaZqBKcZGXJagV9mLnM1Zw_3Dq3wm6g";
const supabase = createClient(SUPA_URL, SUPA_KEY);

export interface SavingsGoal {
  id: number;
  descricao: string;
  emoji: string;
  meta: number;
  atual: number;
  prazo: string;
  cor: string;
  ativa: boolean;
}

interface Props {
  userId: string;
  accent: string;
  accentDark: string;
  cardBg: string;
  cardBorder: string;
  subtext: string;
  positive: string;
  negative: string;
  goals: SavingsGoal[];
  setGoals: (v: SavingsGoal[]) => void;
}

const fmt = (n: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n || 0);
const CORES = ["#f97316","#3b82f6","#8b5cf6","#10b981","#f59e0b","#ec4899","#06b6d4","#ef4444"];

export default function SavingsGoals({
  userId, accent, accentDark, cardBg, cardBorder, subtext, positive, negative, goals, setGoals,
}: Props) {
  const today = new Date().toISOString().slice(0,10);
  const [showForm,    setShowForm]    = useState(false);
  const [showDeposit, setShowDeposit] = useState<number|null>(null);
  const [depositVal,  setDepositVal]  = useState("");
  const [saving,      setSaving]      = useState(false);
  const [form, setForm] = useState({
    descricao:"", emoji:"🎯", meta:"", prazo:"", cor:"#f97316",
  });

  const totalMeta  = goals.filter(g=>g.ativa).reduce((s,g)=>s+g.meta,0);
  const totalAtual = goals.filter(g=>g.ativa).reduce((s,g)=>s+g.atual,0);
  const done       = goals.filter(g=>g.atual>=g.meta&&g.ativa).length;

  const inp: CSSProperties = { width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 12px", color:"#e2e8f0", fontSize:13, boxSizing:"border-box", outline:"none", fontFamily:"'Sora',sans-serif" };

  async function addGoal() {
    if(!form.descricao.trim()||!form.meta||!form.prazo) return;
    setSaving(true);
    const row = { user_id:userId, descricao:form.descricao.trim(), emoji:form.emoji, meta:Number(form.meta), atual:0, prazo:form.prazo, cor:form.cor, ativa:true };
    const {data,error} = await supabase.from("savings_goals").insert(row).select().single();
    if(!error&&data) { setGoals([...goals, data as SavingsGoal]); setForm({descricao:"",emoji:"🎯",meta:"",prazo:"",cor:"#f97316"}); setShowForm(false); }
    setSaving(false);
  }

  async function addDeposit(id: number) {
    const v = Number(depositVal);
    if(isNaN(v)||v<=0) return;
    const g = goals.find(x=>x.id===id)!;
    const novoAtual = Math.min(g.meta, g.atual + v);
    await supabase.from("savings_goals").update({atual:novoAtual}).eq("id",id);
    setGoals(goals.map(x=>x.id===id?{...x,atual:novoAtual}:x));
    setShowDeposit(null); setDepositVal("");
  }

  async function deleteGoal(id: number) {
    if(!window.confirm("Apagar este objetivo?")) return;
    await supabase.from("savings_goals").delete().eq("id",id);
    setGoals(goals.filter(g=>g.id!==id));
  }

  async function toggleGoal(id: number) {
    const g = goals.find(x=>x.id===id)!;
    await supabase.from("savings_goals").update({ativa:!g.ativa}).eq("id",id);
    setGoals(goals.map(x=>x.id===id?{...x,ativa:!x.ativa}:x));
  }

  return (
    <div>
      {/* Summary */}
      {goals.length > 0 && (
        <div style={{background:`linear-gradient(135deg,${accent}18,${accentDark}10)`,border:`1px solid ${accent}30`,borderRadius:16,padding:"16px 18px",marginBottom:16,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:10,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.07em",marginBottom:4}}>Poupado</div>
            <div style={{fontSize:17,fontWeight:800,color:positive}}>{fmt(totalAtual)}</div>
          </div>
          <div style={{textAlign:"center",borderLeft:`1px solid ${cardBorder}`,borderRight:`1px solid ${cardBorder}`}}>
            <div style={{fontSize:10,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.07em",marginBottom:4}}>Meta total</div>
            <div style={{fontSize:17,fontWeight:800,color:accent}}>{fmt(totalMeta)}</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:10,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.07em",marginBottom:4}}>Atingidos</div>
            <div style={{fontSize:17,fontWeight:800,color:"#a78bfa"}}>{done}/{goals.filter(g=>g.ativa).length}</div>
          </div>
        </div>
      )}

      {/* Add button */}
      <button onClick={()=>setShowForm(!showForm)} style={{width:"100%",marginBottom:14,padding:"11px 0",background:showForm?`${accent}18`:`linear-gradient(135deg,${accent},${accentDark})`,border:showForm?`1px solid ${accent}40`:"none",borderRadius:10,color:showForm?accent:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif",transition:"all .2s"}}>
        {showForm?"✕ Cancelar":"+ Novo objetivo de poupança"}
      </button>

      {/* Form */}
      {showForm&&(
        <div style={{background:cardBg,border:`1px solid ${accent}30`,borderRadius:14,padding:"16px 18px",marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:accent,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:14}}>Novo objetivo</div>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <input style={{...inp,flex:"0 0 56px",textAlign:"center",fontSize:22}} placeholder="🎯" value={form.emoji} onChange={e=>setForm(f=>({...f,emoji:e.target.value}))} maxLength={2}/>
            <input style={{...inp,flex:1}} placeholder="Nome do objetivo (ex: Férias, Carro...)" value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.07em",marginBottom:5}}>Meta (€)</div>
              <input style={inp} type="number" placeholder="0,00" value={form.meta} onChange={e=>setForm(f=>({...f,meta:e.target.value}))}/>
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.07em",marginBottom:5}}>Prazo</div>
              <input style={inp} type="date" value={form.prazo} onChange={e=>setForm(f=>({...f,prazo:e.target.value}))}/>
            </div>
          </div>
          {/* Color picker */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:700,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.07em",marginBottom:8}}>Cor</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap" as const}}>
              {CORES.map(c=><div key={c} onClick={()=>setForm(f=>({...f,cor:c}))} style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",border:form.cor===c?"3px solid #fff":"3px solid transparent",boxShadow:form.cor===c?`0 0 0 2px ${c}`:"none",transition:"all .15s"}}/>)}
            </div>
          </div>
          <button onClick={addGoal} disabled={saving} style={{width:"100%",padding:"11px 0",background:`linear-gradient(135deg,${accent},${accentDark})`,border:"none",borderRadius:9,color:"#fff",fontWeight:700,fontSize:13,cursor:saving?"not-allowed":"pointer",fontFamily:"'Sora',sans-serif",opacity:saving?0.7:1}}>
            {saving?"A guardar...":"Criar objetivo →"}
          </button>
        </div>
      )}

      {/* Empty state */}
      {goals.length===0&&!showForm&&(
        <div style={{textAlign:"center" as const,padding:"40px 0",color:subtext}}>
          <div style={{fontSize:40,marginBottom:12}}>🎯</div>
          <div style={{fontSize:15,fontWeight:700,color:"#e2e8f0",marginBottom:6}}>Sem objetivos ainda</div>
          <div style={{fontSize:13,lineHeight:1.6}}>Cria o teu primeiro objetivo —<br/>férias, carro, fundo de emergência...</div>
        </div>
      )}

      {/* Goals list */}
      {goals.map(g=>{
        const pct    = Math.min(100,Math.round((g.atual/g.meta)*100));
        const done   = pct >= 100;
        const falta  = Math.max(0, g.meta - g.atual);
        const prazo  = new Date(g.prazo+"T12:00:00");
        const meses  = Math.max(0, Math.round((prazo.getTime()-Date.now())/(1000*60*60*24*30)));
        const porMes = meses>0 ? falta/meses : 0;

        return(
          <div key={g.id} style={{background:done?`${g.cor}0d`:cardBg,border:`1px solid ${done?g.cor:g.ativa?cardBorder:"rgba(255,255,255,0.03)"}`,borderRadius:16,padding:"16px 18px",marginBottom:12,opacity:g.ativa?1:0.5,transition:"all .2s"}}>
            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:42,height:42,borderRadius:12,background:`${g.cor}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{g.emoji}</div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>{g.descricao}</div>
                  <div style={{fontSize:11,color:subtext,marginTop:2}}>Prazo: {prazo.toLocaleDateString("pt-PT",{month:"long",year:"numeric"})}</div>
                </div>
              </div>
              {done&&<div style={{background:`${g.cor}20`,border:`1px solid ${g.cor}50`,borderRadius:99,padding:"3px 10px",fontSize:11,fontWeight:700,color:g.cor,flexShrink:0}}>✓ Atingido!</div>}
            </div>

            {/* Progress */}
            <div style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:14,fontWeight:800,color:g.cor}}>{fmt(g.atual)}</span>
                <span style={{fontSize:13,color:subtext}}>{fmt(g.meta)}</span>
              </div>
              <div style={{height:10,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"hidden",position:"relative"}}>
                <div style={{width:`${pct}%`,height:"100%",background:done?`linear-gradient(90deg,${g.cor},${g.cor}bb)`:g.cor,borderRadius:99,transition:"width .6s ease"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                <span style={{fontSize:11,color:subtext}}>{pct}% concluído</span>
                {!done&&meses>0&&<span style={{fontSize:11,color:subtext}}>{meses} {meses===1?"mês":"meses"} restantes</span>}
              </div>
            </div>

            {/* Stats row */}
            {!done&&g.ativa&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"8px 12px"}}>
                  <div style={{fontSize:10,color:subtext,marginBottom:2}}>Falta</div>
                  <div style={{fontSize:14,fontWeight:700,color:negative}}>{fmt(falta)}</div>
                </div>
                <div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"8px 12px"}}>
                  <div style={{fontSize:10,color:subtext,marginBottom:2}}>Por mês</div>
                  <div style={{fontSize:14,fontWeight:700,color:g.cor}}>{meses>0?fmt(porMes):"—"}</div>
                </div>
              </div>
            )}

            {/* Deposit form */}
            {showDeposit===g.id&&(
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <input autoFocus style={{...inp,flex:1}} type="number" placeholder="Valor a adicionar (€)" value={depositVal} onChange={e=>setDepositVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addDeposit(g.id)}/>
                <button onClick={()=>addDeposit(g.id)} style={{padding:"10px 14px",background:`${g.cor}33`,border:`1px solid ${g.cor}50`,borderRadius:8,color:g.cor,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>✓</button>
                <button onClick={()=>{setShowDeposit(null);setDepositVal("");}} style={{padding:"10px 10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:subtext,fontSize:13,cursor:"pointer"}}>✕</button>
              </div>
            )}

            {/* Actions */}
            <div style={{display:"flex",gap:6}}>
              {!done&&g.ativa&&(
                <button onClick={()=>setShowDeposit(showDeposit===g.id?null:g.id)} style={{flex:2,padding:"7px 0",background:`${g.cor}22`,border:`1px solid ${g.cor}40`,borderRadius:8,color:g.cor,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
                  {showDeposit===g.id?"✕ Cancelar":"💰 Adicionar poupança"}
                </button>
              )}
              <button onClick={()=>toggleGoal(g.id)} style={{flex:1,padding:"7px 0",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:8,color:g.ativa?"#f59e0b":subtext,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
                {g.ativa?"⏸ Pausar":"▶ Ativar"}
              </button>
              <button onClick={()=>deleteGoal(g.id)} style={{padding:"7px 10px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,color:"#f87171",fontSize:11,cursor:"pointer"}}>🗑️</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
