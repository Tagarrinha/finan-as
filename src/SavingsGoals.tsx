import { useState, useEffect, CSSProperties } from "react";
import { supabase } from "./supabase";
export interface SavingsGoal {
  id: number; descricao: string; emoji: string; meta: number;
  atual: number; prazo: string; cor: string; ativa: boolean;
}
interface CoupleGoal {
  id: string; couple_id: number; nome: string; objetivo: number;
  prazo: string; icon: string; contribuicao_user1: number;
  contribuicao_user2: number; created_by: string;
}
interface Couple {
  id: number; user1_id: string; user2_id: string;
  user1_email: string; user2_email: string; status: string;
}
interface Props {
  userId: string; accent: string; accentDark: string;
  cardBg: string; cardBorder: string; subtext: string;
  positive: string; negative: string;
  goals: SavingsGoal[]; setGoals: (v: SavingsGoal[]) => void;
  monthlyIncome: number; maxGoals?: number; onUpgrade?: () => void;
}
const fmt = (n: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n || 0);
const CORES = ["#f97316","#3b82f6","#8b5cf6","#10b981","#f59e0b","#ec4899","#06b6d4","#ef4444"];
const EMPTY_FORM = { descricao:"", emoji:"🎯", meta:"", prazo:"", cor:"#f97316" };
const EMPTY_COUPLE_FORM = { nome:"", icon:"🎯", objetivo:"", prazo:"" };
const MY_COLOR = "#f97316";
const PARTNER_COLOR = "#ec4899";
export default function SavingsGoals({ userId, accent, accentDark, cardBg, cardBorder, subtext, positive, negative, goals, setGoals, monthlyIncome, maxGoals, onUpgrade }: Props) {
  const [mode, setMode] = useState<"pessoal"|"partilhada">("pessoal");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number|null>(null);
  const [showDeposit, setShowDeposit] = useState<number|null>(null);
  const [depositVal, setDepositVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [couple, setCouple] = useState<Couple|null>(null);
  const [coupleGoals, setCoupleGoals] = useState<CoupleGoal[]>([]);
  const [loadingCouple, setLoadingCouple] = useState(false);
  const [showCoupleForm, setShowCoupleForm] = useState(false);
  const [coupleForm, setCoupleForm] = useState(EMPTY_COUPLE_FORM);
  const [savingCouple, setSavingCouple] = useState(false);
  const [showCoupleDeposit, setShowCoupleDeposit] = useState<string|null>(null);
  const [coupleDepositVal, setCoupleDepositVal] = useState("");
  const totalMeta  = goals.filter(g=>g.ativa).reduce((s,g)=>s+g.meta,0);
  const totalAtual = goals.filter(g=>g.ativa).reduce((s,g)=>s+g.atual,0);
  const done       = goals.filter(g=>g.atual>=g.meta&&g.ativa).length;
  const inp: CSSProperties = { width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 12px", color:"#e2e8f0", fontSize:13, boxSizing:"border-box", outline:"none", fontFamily:"'Sora',sans-serif" };
  useEffect(() => { if(mode === "partilhada") loadCoupleData(); }, [mode]);
  async function loadCoupleData() {
    setLoadingCouple(true);
    const { data: c } = await supabase.from("couples").select("*").or(`user1_id.eq.${userId},user2_id.eq.${userId}`).eq("status","active").maybeSingle();
    if(c) {
      setCouple(c as Couple);
      const { data: cg } = await supabase.from("couple_goals").select("*").eq("couple_id",c.id).order("created_at");
      if(cg) setCoupleGoals(cg as CoupleGoal[]);
    }
    setLoadingCouple(false);
  }
  function openEdit(g: SavingsGoal) {
    setEditingId(g.id);
    setForm({ descricao:g.descricao, emoji:g.emoji, meta:String(g.meta), prazo:g.prazo, cor:g.cor });
    setShowForm(true);
    window.scrollTo({ top:0, behavior:"smooth" });
  }
  function resetForm() { setForm(EMPTY_FORM); setEditingId(null); setShowForm(false); }
  async function saveGoal() {
    if(!form.descricao.trim()||!form.meta||!form.prazo) return;
    setSaving(true);
    if(editingId) {
      await supabase.from("savings_goals").update({ descricao:form.descricao.trim(), emoji:form.emoji, meta:Number(form.meta), prazo:form.prazo, cor:form.cor }).eq("id",editingId);
      setGoals(goals.map(g=>g.id===editingId?{...g,descricao:form.descricao.trim(),emoji:form.emoji,meta:Number(form.meta),prazo:form.prazo,cor:form.cor}:g));
    } else {
      const {data,error} = await supabase.from("savings_goals").insert({ user_id:userId, descricao:form.descricao.trim(), emoji:form.emoji, meta:Number(form.meta), atual:0, prazo:form.prazo, cor:form.cor, ativa:true }).select().single();
      if(!error&&data) setGoals([...goals, data as SavingsGoal]);
    }
    resetForm(); setSaving(false);
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
  async function saveCoupleGoal() {
    if(!couple||!coupleForm.nome.trim()||!coupleForm.objetivo||!coupleForm.prazo) return;
    setSavingCouple(true);
    const { data, error } = await supabase.from("couple_goals").insert({ couple_id:couple.id, nome:coupleForm.nome.trim(), icon:coupleForm.icon, objetivo:Number(coupleForm.objetivo), prazo:coupleForm.prazo, contribuicao_user1:0, contribuicao_user2:0, created_by:userId }).select().single();
    if(!error&&data) setCoupleGoals(p=>[...p, data as CoupleGoal]);
    setCoupleForm(EMPTY_COUPLE_FORM); setShowCoupleForm(false); setSavingCouple(false);
  }
  async function addCoupleDeposit(goal: CoupleGoal) {
    if(!couple) return;
    const v = Number(coupleDepositVal);
    if(isNaN(v)||v<=0) return;
    const isUser1 = couple.user1_id === userId;
    const field = isUser1 ? "contribuicao_user1" : "contribuicao_user2";
    const currentVal = isUser1 ? goal.contribuicao_user1 : goal.contribuicao_user2;
    await supabase.from("couple_goals").update({ [field]: currentVal + v }).eq("id",goal.id);
    setCoupleGoals(p=>p.map(g=>g.id===goal.id?{...g,[field]:currentVal+v}:g));
    setShowCoupleDeposit(null); setCoupleDepositVal("");
  }
  async function deleteCoupleGoal(id: string) {
    if(!window.confirm("Apagar este objetivo partilhado?")) return;
    await supabase.from("couple_goals").delete().eq("id",id);
    setCoupleGoals(p=>p.filter(g=>g.id!==id));
  }
  const isUser1 = couple?.user1_id === userId;
  const partnerName = couple ? (isUser1 ? couple.user2_email?.split("@")[0] : couple.user1_email?.split("@")[0]) : "Parceiro/a";
  const myName = couple ? (isUser1 ? couple.user1_email?.split("@")[0] : couple.user2_email?.split("@")[0]) : "Tu";
  return (
    <div>
      {/* Mode toggle */}
      <div style={{display:"flex",background:"rgba(255,255,255,0.04)",borderRadius:12,padding:4,marginBottom:16,gap:4}}>
        <button onClick={()=>{setMode("pessoal");setShowForm(false);}} style={{flex:1,padding:"10px 0",border:"none",borderRadius:9,background:mode==="pessoal"?`linear-gradient(135deg,${accent},${accentDark})`:"transparent",color:mode==="pessoal"?"#fff":subtext,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>👤 Pessoais</button>
        <button onClick={()=>{setMode("partilhada");setShowForm(false);}} style={{flex:1,padding:"10px 0",border:"none",borderRadius:9,background:mode==="partilhada"?"linear-gradient(135deg,#ec4899,#f97316)":"transparent",color:mode==="partilhada"?"#fff":subtext,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>💑 Partilhadas</button>
      </div>

      {/* ── PESSOAIS ── */}
      {mode==="pessoal"&&<>
        {goals.length > 0 && (
          <div style={{background:`linear-gradient(135deg,${accent}18,${accentDark}10)`,border:`1px solid ${accent}30`,borderRadius:14,padding:"12px 16px",marginBottom:12,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            <div style={{textAlign:"center" as const}}>
              <div style={{fontSize:9,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.07em",marginBottom:3}}>Poupado</div>
              <div style={{fontSize:15,fontWeight:800,color:positive}}>{fmt(totalAtual)}</div>
            </div>
            <div style={{textAlign:"center" as const,borderLeft:`1px solid ${cardBorder}`,borderRight:`1px solid ${cardBorder}`}}>
              <div style={{fontSize:9,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.07em",marginBottom:3}}>Meta total</div>
              <div style={{fontSize:15,fontWeight:800,color:accent}}>{fmt(totalMeta)}</div>
            </div>
            <div style={{textAlign:"center" as const}}>
              <div style={{fontSize:9,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.07em",marginBottom:3}}>Atingidos</div>
              <div style={{fontSize:15,fontWeight:800,color:"#a78bfa"}}>{done}/{goals.filter(g=>g.ativa).length}</div>
            </div>
          </div>
        )}
        <button onClick={()=>{
          if(!showForm&&maxGoals&&goals.length>=maxGoals){onUpgrade?.();return;}
          if(showForm&&!editingId){resetForm();}else{setEditingId(null);setForm(EMPTY_FORM);setShowForm(true);}
        }} style={{width:"100%",marginBottom:12,padding:"11px 0",background:showForm?`${accent}18`:`linear-gradient(135deg,${accent},${accentDark})`,border:showForm?`1px solid ${accent}40`:"none",borderRadius:10,color:showForm?accent:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
          {showForm?(editingId?"✕ Cancelar edição":"✕ Cancelar"):"+ Novo objetivo de poupança"}
        </button>
        {showForm&&(
          <div style={{background:cardBg,border:`1px solid ${editingId?"#f59e0b":accent}40`,borderRadius:14,padding:"16px 18px",marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:editingId?"#f59e0b":accent,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:14}}>{editingId?"✏️ Editar objetivo":"Novo objetivo"}</div>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <input style={{...inp,flex:"0 0 56px",textAlign:"center" as const,fontSize:22}} placeholder="🎯" value={form.emoji} onChange={e=>setForm(f=>({...f,emoji:e.target.value}))} maxLength={2}/>
              <input style={{...inp,flex:1}} placeholder="Nome do objetivo" value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div><div style={{fontSize:10,fontWeight:700,color:subtext,textTransform:"uppercase" as const,marginBottom:5}}>Meta (€)</div><input style={inp} type="number" placeholder="0,00" value={form.meta} onChange={e=>setForm(f=>({...f,meta:e.target.value}))}/></div>
              <div><div style={{fontSize:10,fontWeight:700,color:subtext,textTransform:"uppercase" as const,marginBottom:5}}>Prazo</div><input style={inp} type="date" value={form.prazo} onChange={e=>setForm(f=>({...f,prazo:e.target.value}))}/></div>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:700,color:subtext,textTransform:"uppercase" as const,marginBottom:8}}>Cor</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap" as const}}>
                {CORES.map(c=><div key={c} onClick={()=>setForm(f=>({...f,cor:c}))} style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",border:form.cor===c?"3px solid #fff":"3px solid transparent",boxShadow:form.cor===c?`0 0 0 2px ${c}`:"none"}}/>)}
              </div>
            </div>
            <button onClick={saveGoal} disabled={saving} style={{width:"100%",padding:"11px 0",background:`linear-gradient(135deg,${editingId?"#f59e0b":accent},${editingId?"#d97706":accentDark})`,border:"none",borderRadius:9,color:"#fff",fontWeight:700,fontSize:13,cursor:saving?"not-allowed":"pointer",fontFamily:"'Sora',sans-serif",opacity:saving?0.7:1}}>
              {saving?"A guardar...":(editingId?"✓ Guardar alterações":"Criar objetivo →")}
            </button>
            {editingId&&<button onClick={resetForm} style={{width:"100%",marginTop:8,padding:"9px 0",background:"rgba(255,255,255,0.04)",border:`1px solid ${cardBorder}`,borderRadius:9,color:subtext,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>✕ Cancelar</button>}
          </div>
        )}
        {goals.length===0&&!showForm&&(
          <div style={{textAlign:"center" as const,padding:"40px 0",color:subtext}}>
            <div style={{fontSize:40,marginBottom:12}}>🎯</div>
            <div style={{fontSize:15,fontWeight:700,color:"#e2e8f0",marginBottom:6}}>Sem objetivos ainda</div>
            <div style={{fontSize:13,lineHeight:1.6}}>Cria o teu primeiro objetivo —<br/>férias, carro, fundo de emergência...</div>
          </div>
        )}
        {/* Lista compacta */}
        <div style={{background:cardBg,border:`1px solid ${cardBorder}`,borderRadius:14,padding:"4px 16px",marginBottom:12}}>
          {goals.map(g=>{
            const isDone = g.atual >= g.meta;
            const falta  = Math.max(0, g.meta - g.atual);
            const prazo  = new Date(g.prazo+"T12:00:00");
            const meses  = Math.max(0, Math.round((prazo.getTime()-Date.now())/(1000*60*60*24*30)));
            const pct    = Math.min(100, Math.round((g.atual/g.meta)*100));
            return(
              <div key={g.id}>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0",borderBottom:`1px solid ${cardBorder}`,opacity:g.ativa?1:0.5}}>
                  <div style={{width:34,height:34,borderRadius:10,background:`${g.cor}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{g.emoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#f1f5f9",whiteSpace:"nowrap" as const,overflow:"hidden",textOverflow:"ellipsis",marginBottom:3}}>
                      {g.descricao}{isDone&&<span style={{fontSize:10,color:g.cor,fontWeight:700,marginLeft:6}}>✓</span>}
                    </div>
                    <div style={{height:4,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"hidden",marginBottom:3}}>
                      <div style={{width:`${pct}%`,height:"100%",background:g.cor,borderRadius:99,transition:"width .5s"}}/>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:10,color:g.cor,fontWeight:700}}>{fmt(g.atual)}</span>
                      <span style={{fontSize:9,color:subtext}}>/ {fmt(g.meta)}</span>
                      <span style={{fontSize:9,color:subtext}}>· {prazo.toLocaleDateString("pt-PT",{month:"short",year:"numeric"})}</span>
                      {!isDone&&meses>0&&<span style={{fontSize:9,color:subtext}}>{meses}m</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column" as const,alignItems:"flex-end",gap:5,flexShrink:0}}>
                    <div style={{display:"flex",gap:4}}>
                      {!isDone&&g.ativa&&<button onClick={()=>setShowDeposit(showDeposit===g.id?null:g.id)} style={{width:28,height:28,background:`${g.cor}22`,border:`1px solid ${g.cor}40`,borderRadius:7,color:g.cor,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>💰</button>}
                      <button onClick={()=>openEdit(g)} style={{width:28,height:28,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:7,color:subtext,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button>
                      <button onClick={()=>toggleGoal(g.id)} style={{width:28,height:28,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:7,color:g.ativa?"#f59e0b":subtext,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{g.ativa?"⏸":"▶"}</button>
                      <button onClick={()=>deleteGoal(g.id)} style={{width:28,height:28,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:7,color:"#f87171",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>🗑️</button>
                    </div>
                  </div>
                </div>
                {showDeposit===g.id&&(
                  <div style={{display:"flex",gap:8,padding:"8px 0 12px"}}>
                    <input autoFocus style={{...inp,flex:1}} type="number" placeholder="Valor a adicionar (€)" value={depositVal} onChange={e=>setDepositVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addDeposit(g.id)}/>
                    <button onClick={()=>addDeposit(g.id)} style={{padding:"10px 14px",background:`${g.cor}33`,border:`1px solid ${g.cor}50`,borderRadius:8,color:g.cor,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>✓</button>
                    <button onClick={()=>{setShowDeposit(null);setDepositVal("");}} style={{padding:"10px 10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:subtext,fontSize:13,cursor:"pointer"}}>✕</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>}

      {/* ── PARTILHADAS ── */}
      {mode==="partilhada"&&<>
        {loadingCouple&&<div style={{textAlign:"center" as const,padding:"32px 0",color:subtext}}>A carregar...</div>}
        {!loadingCouple&&!couple&&(
          <div style={{textAlign:"center" as const,padding:"40px 20px",color:subtext}}>
            <div style={{fontSize:40,marginBottom:12}}>💑</div>
            <div style={{fontSize:15,fontWeight:700,color:"#e2e8f0",marginBottom:6}}>Modo casal não ativo</div>
            <div style={{fontSize:13,lineHeight:1.6}}>Ativa o modo casal primeiro para poderes criar metas partilhadas.</div>
          </div>
        )}
        {!loadingCouple&&couple&&<>
          {coupleGoals.length>0&&(()=>{
            const totalObj = coupleGoals.reduce((s,g)=>s+Number(g.objetivo),0);
            const totalPoupado = coupleGoals.reduce((s,g)=>s+Number(g.contribuicao_user1)+Number(g.contribuicao_user2),0);
            const donec = coupleGoals.filter(g=>(Number(g.contribuicao_user1)+Number(g.contribuicao_user2))>=Number(g.objetivo)).length;
            return(
              <div style={{background:"linear-gradient(135deg,rgba(236,72,153,0.12),rgba(249,115,22,0.08))",border:"1px solid rgba(236,72,153,0.25)",borderRadius:14,padding:"12px 16px",marginBottom:12,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                <div style={{textAlign:"center" as const}}><div style={{fontSize:9,color:subtext,textTransform:"uppercase" as const,marginBottom:3}}>Poupado</div><div style={{fontSize:15,fontWeight:800,color:positive}}>{fmt(totalPoupado)}</div></div>
                <div style={{textAlign:"center" as const,borderLeft:`1px solid ${cardBorder}`,borderRight:`1px solid ${cardBorder}`}}><div style={{fontSize:9,color:subtext,textTransform:"uppercase" as const,marginBottom:3}}>Objetivo</div><div style={{fontSize:15,fontWeight:800,color:"#ec4899"}}>{fmt(totalObj)}</div></div>
                <div style={{textAlign:"center" as const}}><div style={{fontSize:9,color:subtext,textTransform:"uppercase" as const,marginBottom:3}}>Atingidos</div><div style={{fontSize:15,fontWeight:800,color:"#a78bfa"}}>{donec}/{coupleGoals.length}</div></div>
              </div>
            );
          })()}
          <button onClick={()=>setShowCoupleForm(v=>!v)} style={{width:"100%",marginBottom:12,padding:"11px 0",background:showCoupleForm?"rgba(236,72,153,0.12)":"linear-gradient(135deg,#ec4899,#f97316)",border:showCoupleForm?"1px solid rgba(236,72,153,0.3)":"none",borderRadius:10,color:showCoupleForm?"#ec4899":"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
            {showCoupleForm?"✕ Cancelar":"+ Nova meta partilhada"}
          </button>
          {showCoupleForm&&(
            <div style={{background:cardBg,border:"1px solid rgba(236,72,153,0.3)",borderRadius:14,padding:"16px 18px",marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:"#ec4899",textTransform:"uppercase" as const,marginBottom:14}}>Nova meta partilhada 💑</div>
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <input style={{...inp,flex:"0 0 56px",textAlign:"center" as const,fontSize:22}} placeholder="🎯" value={coupleForm.icon} onChange={e=>setCoupleForm(f=>({...f,icon:e.target.value}))} maxLength={2}/>
                <input style={{...inp,flex:1}} placeholder="Nome da meta" value={coupleForm.nome} onChange={e=>setCoupleForm(f=>({...f,nome:e.target.value}))}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                <div><div style={{fontSize:10,fontWeight:700,color:subtext,textTransform:"uppercase" as const,marginBottom:5}}>Objetivo (€)</div><input style={inp} type="number" placeholder="0,00" value={coupleForm.objetivo} onChange={e=>setCoupleForm(f=>({...f,objetivo:e.target.value}))}/></div>
                <div><div style={{fontSize:10,fontWeight:700,color:subtext,textTransform:"uppercase" as const,marginBottom:5}}>Prazo</div><input style={inp} type="date" value={coupleForm.prazo} onChange={e=>setCoupleForm(f=>({...f,prazo:e.target.value}))}/></div>
              </div>
              <button onClick={saveCoupleGoal} disabled={savingCouple} style={{width:"100%",padding:"11px 0",background:"linear-gradient(135deg,#ec4899,#f97316)",border:"none",borderRadius:9,color:"#fff",fontWeight:700,fontSize:13,cursor:savingCouple?"not-allowed":"pointer",fontFamily:"'Sora',sans-serif",opacity:savingCouple?0.7:1}}>
                {savingCouple?"A guardar...":"Criar meta partilhada →"}
              </button>
            </div>
          )}
          {coupleGoals.length===0&&!showCoupleForm&&(
            <div style={{textAlign:"center" as const,padding:"40px 0",color:subtext}}>
              <div style={{fontSize:40,marginBottom:12}}>💑</div>
              <div style={{fontSize:15,fontWeight:700,color:"#e2e8f0",marginBottom:6}}>Sem metas partilhadas</div>
              <div style={{fontSize:13,lineHeight:1.6}}>Cria a vossa primeira meta em conjunto.</div>
            </div>
          )}
          {/* Lista compacta partilhadas */}
          <div style={{background:cardBg,border:`1px solid ${cardBorder}`,borderRadius:14,padding:"4px 16px",marginBottom:12}}>
            {coupleGoals.map(g=>{
              const total = Number(g.contribuicao_user1) + Number(g.contribuicao_user2);
              const objetivo = Number(g.objetivo);
              const pct = objetivo > 0 ? Math.min(100, Math.round((total/objetivo)*100)) : 0;
              const isDone = total >= objetivo;
              const falta = Math.max(0, objetivo - total);
              const prazo = new Date(g.prazo+"T12:00:00");
              const meses = Math.max(0, Math.round((prazo.getTime()-Date.now())/(1000*60*60*24*30)));
              const myContrib = isUser1 ? Number(g.contribuicao_user1) : Number(g.contribuicao_user2);
              const partnerContrib = isUser1 ? Number(g.contribuicao_user2) : Number(g.contribuicao_user1);
              return(
                <div key={g.id}>
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0",borderBottom:`1px solid ${cardBorder}`}}>
                    <div style={{width:34,height:34,borderRadius:10,background:"rgba(236,72,153,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{g.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#f1f5f9",whiteSpace:"nowrap" as const,overflow:"hidden",textOverflow:"ellipsis",marginBottom:3}}>
                        {g.nome}{isDone&&<span style={{fontSize:10,color:"#34d399",fontWeight:700,marginLeft:6}}>✓</span>}
                      </div>
                      <div style={{height:4,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"hidden",marginBottom:3}}>
                        <div style={{width:`${pct}%`,height:"100%",background:isDone?"#34d399":"linear-gradient(90deg,#ec4899,#f97316)",borderRadius:99,transition:"width .5s"}}/>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:10,color:MY_COLOR,fontWeight:600}}>{fmt(myContrib)}</span>
                        <span style={{fontSize:9,color:subtext}}>+</span>
                        <span style={{fontSize:10,color:PARTNER_COLOR,fontWeight:600}}>{fmt(partnerContrib)}</span>
                        <span style={{fontSize:9,color:subtext}}>/ {fmt(objetivo)}</span>
                        {!isDone&&meses>0&&<span style={{fontSize:9,color:subtext}}>{meses}m</span>}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:4,flexShrink:0}}>
                      {!isDone&&<button onClick={()=>setShowCoupleDeposit(showCoupleDeposit===g.id?null:g.id)} style={{width:28,height:28,background:"rgba(236,72,153,0.15)",border:"1px solid rgba(236,72,153,0.25)",borderRadius:7,color:"#ec4899",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>💰</button>}
                      <button onClick={()=>deleteCoupleGoal(g.id)} style={{width:28,height:28,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:7,color:"#f87171",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>🗑️</button>
                    </div>
                  </div>
                  {showCoupleDeposit===g.id&&(
                    <div style={{display:"flex",gap:8,padding:"8px 0 12px"}}>
                      <input autoFocus style={{...inp,flex:1}} type="number" placeholder="Valor a contribuir (€)" value={coupleDepositVal} onChange={e=>setCoupleDepositVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCoupleDeposit(g)}/>
                      <button onClick={()=>addCoupleDeposit(g)} style={{padding:"10px 14px",background:"rgba(236,72,153,0.2)",border:"1px solid rgba(236,72,153,0.3)",borderRadius:8,color:"#ec4899",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>✓</button>
                      <button onClick={()=>{setShowCoupleDeposit(null);setCoupleDepositVal("");}} style={{padding:"10px 10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:subtext,fontSize:13,cursor:"pointer"}}>✕</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>}
      </>}
    </div>
  );
}
