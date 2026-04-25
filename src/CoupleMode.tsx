import { useState, useEffect, CSSProperties } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = "https://aiifzqmwnnfnrwmacyxq.supabase.co";
const SUPA_KEY = "sb_publishable_GaZqBKcZGXJagV9mLnM1Zw_3Dq3wm6g";
const supabase = createClient(SUPA_URL, SUPA_KEY);

type TypeKey = "necessidade"|"desejo"|"investimento";
interface ExpCat { id:string; label:string; icon:string; type:TypeKey; }

interface Couple {
  id: number; user1_id: string; user2_id: string|null;
  user1_email: string; user2_email: string|null; status: string;
}
interface CoupleExpense {
  id:number; couple_id:number; created_by:string; descricao:string; valor:number;
  cat:string; subcat:string; tipo:TypeKey; data:string;
  split_user1:number; split_user2:number; pago_por:string; liquidado:boolean;
}
interface CoupleAccount { id:number; couple_id:number; saldo:number; contribuicao_user1:number; contribuicao_user2:number; }
interface Settlement { id:number; couple_id:number; pago_por:string; valor:number; nota:string; created_at:string; }

interface Props {
  userId: string; userEmail: string; userName: string;
  expCats: ExpCat[]; accent: string; accentDark: string;
  cardBg: string; cardBorder: string; subtext: string; positive: string; negative: string;
}

const fmt = (n:number) => new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR"}).format(n||0);
const TYPE_META: Record<TypeKey,{label:string;color:string;bg:string}> = {
  necessidade:{label:"Necessidade",color:"#3b82f6",bg:"#1e3a5f33"},
  desejo:     {label:"Desejo",     color:"#f59e0b",bg:"#78350f33"},
  investimento:{label:"Investimento",color:"#10b981",bg:"#064e3b33"},
};
const PARTNER_COLOR = "#ec4899";
const MY_COLOR      = "#f97316";

export default function CoupleMode({ userId, userEmail, userName, expCats, accent, accentDark, cardBg, cardBorder, subtext, positive, negative }: Props) {
  const [couple,      setCouple]      = useState<Couple|null>(null);
  const [account,     setAccount]     = useState<CoupleAccount|null>(null);
  const [expenses,    setExpenses]    = useState<CoupleExpense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState<"conta"|"despesas"|"acerto">("conta");

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting,    setInviting]    = useState(false);
  const [inviteErr,   setInviteErr]   = useState("");

  // Expense form
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState({ descricao:"", valor:"", cat:"", subcat:"", tipo:"necessidade" as TypeKey, data:new Date().toISOString().slice(0,10), split:"50/50", splitMy:"", splitPartner:"" });
  const [saving,     setSaving]     = useState(false);

  // Settlement
  const [showSettle,   setShowSettle]   = useState(false);
  const [settleValor,  setSettleValor]  = useState("");
  const [settleNota,   setSettleNota]   = useState("");

  // Account edit
  const [editContrib,  setEditContrib]  = useState(false);
  const [myContrib,    setMyContrib]    = useState("");
  const [partnerContrib, setPartnerContrib] = useState("");

  useEffect(()=>{ loadCouple(); },[userId]);

  async function loadCouple() {
    setLoading(true);
    // Find couple where user is user1 or user2
    const {data:c} = await supabase.from("couples").select("*")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`).single();
    if(c) {
      setCouple(c as Couple);
      if(c.status==="active") {
        const [expR, accR, setR] = await Promise.all([
          supabase.from("couple_expenses").select("*").eq("couple_id",c.id).order("data",{ascending:false}),
          supabase.from("couple_account").select("*").eq("couple_id",c.id).single(),
          supabase.from("couple_settlements").select("*").eq("couple_id",c.id).order("created_at",{ascending:false}),
        ]);
        if(expR.data) setExpenses(expR.data as CoupleExpense[]);
        if(accR.data) { setAccount(accR.data as CoupleAccount); }
        if(setR.data) setSettlements(setR.data as Settlement[]);
      }
    }
    setLoading(false);
  }

  async function sendInvite() {
    if(!inviteEmail.trim()||inviteEmail===userEmail){setInviteErr("Email inválido.");return;}
    setInviting(true); setInviteErr("");
    // Check if partner exists in auth
    const {data:profile} = await supabase.from("profiles").select("id").eq("id",
      (await supabase.from("profiles").select("id,name").limit(1)).data?.[0]?.id||""
    ).single();
    // Create couple (pending)
    const {data,error} = await supabase.from("couples").insert({
      user1_id:userId, user1_email:userEmail, user2_email:inviteEmail.trim(), status:"pending"
    }).select().single();
    if(error){setInviteErr("Erro ao enviar convite.");setInviting(false);return;}
    setCouple(data as Couple);
    setInviting(false);
  }

  async function acceptInvite() {
    if(!couple) return;
    const {data,error} = await supabase.from("couples").update({user2_id:userId,status:"active"}).eq("id",couple.id).select().single();
    if(!error&&data){
      setCouple(data as Couple);
      // Create joint account
      const {data:acc} = await supabase.from("couple_account").insert({couple_id:couple.id,saldo:0,contribuicao_user1:0,contribuicao_user2:0}).select().single();
      if(acc) setAccount(acc as CoupleAccount);
    }
  }

  async function rejectInvite() {
    if(!couple) return;
    await supabase.from("couples").update({status:"rejected"}).eq("id",couple.id);
    setCouple(null);
  }

  async function addExpense() {
    if(!couple||!form.descricao.trim()||!form.valor||!form.cat) return;
    setSaving(true);
    const total = Number(form.valor);
    const isUser1 = couple.user1_id === userId;
    let s1: number, s2: number;
    if(form.split==="50/50"){ s1=total/2; s2=total/2; }
    else { const my=Number(form.splitMy)||0, pt=Number(form.splitPartner)||0; s1=isUser1?my:pt; s2=isUser1?pt:my; }
    const row = { couple_id:couple.id, created_by:userId, descricao:form.descricao.trim(), valor:total, cat:form.cat, subcat:form.subcat, tipo:form.tipo, data:form.data, split_user1:s1, split_user2:s2, pago_por:userId, liquidado:false };
    const {data,error} = await supabase.from("couple_expenses").insert(row).select().single();
    if(!error&&data){ setExpenses(p=>[data as CoupleExpense,...p]); setForm(f=>({...f,descricao:"",valor:"",subcat:""})); setShowForm(false); }
    setSaving(false);
  }

  async function addSettlement() {
    if(!couple||!settleValor) return;
    const v = Number(settleValor);
    const {data,error} = await supabase.from("couple_settlements").insert({couple_id:couple.id,pago_por:userId,valor:v,nota:settleNota}).select().single();
    if(!error&&data){ setSettlements(p=>[data as Settlement,...p]); setSettleValor(""); setSettleNota(""); setShowSettle(false); }
  }

  async function saveContrib() {
    if(!couple||!account) return;
    const isUser1 = couple.user1_id===userId;
    const u1 = isUser1?Number(myContrib):Number(partnerContrib);
    const u2 = isUser1?Number(partnerContrib):Number(myContrib);
    await supabase.from("couple_account").update({contribuicao_user1:u1,contribuicao_user2:u2}).eq("id",account.id);
    setAccount(a=>a?{...a,contribuicao_user1:u1,contribuicao_user2:u2}:a);
    setEditContrib(false);
  }

  async function dissolveCouple() {
    if(!couple||!window.confirm("Tens a certeza que queres terminar o modo casal? Todos os dados conjuntos serão apagados.")) return;
    await supabase.from("couples").delete().eq("id",couple.id);
    setCouple(null); setAccount(null); setExpenses([]); setSettlements([]);
  }

  const inp:CSSProperties = {width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box",outline:"none",fontFamily:"'Sora',sans-serif"};
  const sel:CSSProperties = {width:"100%",background:"#111827",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box",outline:"none"};
  const tBtn = (a:boolean,cor=accent):CSSProperties => ({flex:1,padding:"9px 4px",border:"none",borderRadius:"8px 8px 0 0",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"'Sora',sans-serif",background:a?"rgba(255,255,255,0.07)":"transparent",color:a?cor:"#475569",borderBottom:a?`2px solid ${cor}`:"2px solid transparent",whiteSpace:"nowrap"});

  if(loading) return <div style={{textAlign:"center",padding:"48px 0",color:subtext,fontFamily:"'Sora',sans-serif"}}>A carregar...</div>;

  // Determine who is who
  const isUser1 = couple?.user1_id === userId;
  const partnerEmail = couple ? (isUser1 ? couple.user2_email : couple.user1_email) : null;
  const myName = userName;
  const partnerName = partnerEmail ? partnerEmail.split("@")[0] : "Parceiro/a";

  // Balance calculations
  const myExpTotal     = expenses.reduce((s,e)=>s+(isUser1?e.split_user1:e.split_user2),0);
  const partnerExpTotal= expenses.reduce((s,e)=>s+(isUser1?e.split_user2:e.split_user1),0);
  const myPaid         = expenses.filter(e=>e.pago_por===userId).reduce((s,e)=>s+e.valor,0);
  const partnerPaid    = expenses.filter(e=>e.pago_por!==userId).reduce((s,e)=>s+e.valor,0);
  const myBalance      = myPaid - myExpTotal;
  const mySettle       = settlements.filter(s=>s.pago_por===userId).reduce((s,x)=>s+x.valor,0);
  const partnerSettle  = settlements.filter(s=>s.pago_por!==userId).reduce((s,x)=>s+x.valor,0);
  const netBalance     = myBalance + mySettle - partnerSettle;

  // ── NO COUPLE — SETUP ─────────────────────────────────────────────────────
  if(!couple) return (
    <div style={{fontFamily:"'Sora',sans-serif"}}>
      <div style={{textAlign:"center",padding:"32px 0 24px"}}>
        <div style={{fontSize:48,marginBottom:12}}>👫</div>
        <div style={{fontSize:18,fontWeight:800,color:"#f1f5f9",marginBottom:6}}>Modo Casal</div>
        <div style={{fontSize:13,color:subtext,lineHeight:1.6}}>Partilha despesas com o teu parceiro/a.<br/>Cada um usa a sua própria conta.</div>
      </div>
      <div style={{background:cardBg,border:`1px solid ${accent}30`,borderRadius:16,padding:"20px"}}>
        <div style={{fontSize:11,fontWeight:700,color:accent,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:14}}>Convidar parceiro/a</div>
        <div style={{fontSize:13,color:subtext,marginBottom:12,lineHeight:1.5}}>Introduz o email com que o teu parceiro/a se registou na app.</div>
        <input style={{...inp,marginBottom:10}} type="email" placeholder="email@exemplo.com" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendInvite()}/>
        {inviteErr&&<div style={{fontSize:12,color:"#f87171",marginBottom:10}}>⚠️ {inviteErr}</div>}
        <button onClick={sendInvite} disabled={inviting} style={{width:"100%",padding:"12px 0",background:`linear-gradient(135deg,${accent},${accentDark})`,border:"none",borderRadius:9,color:"#fff",fontWeight:700,fontSize:14,cursor:inviting?"not-allowed":"pointer",fontFamily:"'Sora',sans-serif",opacity:inviting?0.7:1}}>
          {inviting?"A enviar convite...":"Enviar convite →"}
        </button>
      </div>
      <div style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${cardBorder}`,borderRadius:12,padding:"14px 16px",marginTop:12}}>
        <div style={{fontSize:12,fontWeight:700,color:subtext,marginBottom:8}}>Como funciona:</div>
        {["O teu parceiro/a recebe o convite na sua conta","Aceita e ficam ligados em modo casal","Criam uma conta conjunta com contribuições mensais","Adicionam despesas conjuntas — divide 50/50 ou personalizado","Veem quem deve quanto a quem em tempo real"].map((t,i)=>(
          <div key={i} style={{display:"flex",gap:8,marginBottom:6}}>
            <span style={{fontSize:13,color:accent,flexShrink:0}}>✓</span>
            <span style={{fontSize:12,color:subtext,lineHeight:1.5}}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // ── PENDING INVITE ─────────────────────────────────────────────────────────
  if(couple.status==="pending") {
    const isSender = couple.user1_id === userId;
    return (
      <div style={{fontFamily:"'Sora',sans-serif"}}>
        {isSender ? (
          <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:16,padding:"24px",textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:12}}>⏳</div>
            <div style={{fontSize:16,fontWeight:800,color:"#f1f5f9",marginBottom:8}}>Convite enviado!</div>
            <div style={{fontSize:13,color:subtext,marginBottom:16,lineHeight:1.6}}>Aguarda que <strong style={{color:"#f59e0b"}}>{couple.user2_email}</strong> aceite o convite na app.</div>
            <div style={{background:"rgba(245,158,11,0.12)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#f59e0b"}}>
              O convite fica pendente até ser aceite ou rejeitado.
            </div>
            <button onClick={dissolveCouple} style={{marginTop:16,padding:"9px 20px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:9,color:"#f87171",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Cancelar convite</button>
          </div>
        ) : (
          <div style={{background:`${accent}08`,border:`1px solid ${accent}30`,borderRadius:16,padding:"24px",textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:12}}>💌</div>
            <div style={{fontSize:16,fontWeight:800,color:"#f1f5f9",marginBottom:8}}>Tens um convite!</div>
            <div style={{fontSize:13,color:subtext,marginBottom:20,lineHeight:1.6}}><strong style={{color:accent}}>{couple.user1_email}</strong> convidou-te para o Modo Casal.</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={acceptInvite} style={{flex:1,padding:"12px 0",background:`linear-gradient(135deg,${accent},${accentDark})`,border:"none",borderRadius:9,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>✓ Aceitar</button>
              <button onClick={rejectInvite} style={{flex:1,padding:"12px 0",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:9,color:"#f87171",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>✕ Rejeitar</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── ACTIVE COUPLE ─────────────────────────────────────────────────────────
  return (
    <div style={{fontFamily:"'Sora',sans-serif"}}>
      {/* Header casal */}
      <div style={{background:`linear-gradient(135deg,${MY_COLOR}15,${PARTNER_COLOR}10)`,border:`1px solid ${MY_COLOR}25`,borderRadius:16,padding:"16px 18px",marginBottom:14,display:"flex",alignItems:"center",gap:12}}>
        <div style={{display:"flex"}}>
          <div style={{width:40,height:40,borderRadius:"50%",background:`${MY_COLOR}25`,border:`2px solid ${MY_COLOR}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,zIndex:1}}>👤</div>
          <div style={{width:40,height:40,borderRadius:"50%",background:`${PARTNER_COLOR}25`,border:`2px solid ${PARTNER_COLOR}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,marginLeft:-12}}>👤</div>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:800,color:"#f1f5f9"}}>{myName} & {partnerName}</div>
          <div style={{fontSize:11,color:subtext,marginTop:2}}>{partnerEmail} · modo casal ativo</div>
        </div>
        <button onClick={dissolveCouple} style={{padding:"5px 10px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:8,color:"#f87171",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>✕ Terminar</button>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:2,marginBottom:16,background:"rgba(255,255,255,0.03)",borderRadius:"10px 10px 0 0",borderBottom:`1px solid ${cardBorder}`}}>
        {(["conta","despesas","acerto"] as const).map(t=>(
          <button key={t} style={tBtn(tab===t,t==="conta"?"#a78bfa":t==="despesas"?accent:PARTNER_COLOR)} onClick={()=>setTab(t)}>
            {t==="conta"?"🏦 Conta":t==="despesas"?"💳 Despesas":"⚖️ Acerto"}
          </button>
        ))}
      </div>

      {/* ── CONTA CONJUNTA ── */}
      {tab==="conta"&&<>
        <div style={{background:"linear-gradient(135deg,rgba(167,139,250,0.1),rgba(236,72,153,0.07))",border:"1px solid rgba(167,139,250,0.2)",borderRadius:14,padding:"18px",marginBottom:14,textAlign:"center" as const}}>
          <div style={{fontSize:10,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:4}}>Saldo da conta conjunta</div>
          <div style={{fontSize:30,fontWeight:800,color:"#a78bfa",letterSpacing:"-0.5px",marginBottom:4}}>{fmt(account?.saldo||0)}</div>
          <div style={{fontSize:11,color:subtext}}>contribuições mensais: {fmt((account?.contribuicao_user1||0)+(account?.contribuicao_user2||0))}</div>
        </div>

        {/* Contributions */}
        {!editContrib?(
          <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              {[{nome:myName,cor:MY_COLOR,contrib:isUser1?account?.contribuicao_user1:account?.contribuicao_user2},{nome:partnerName,cor:PARTNER_COLOR,contrib:isUser1?account?.contribuicao_user2:account?.contribuicao_user1}].map((p,i)=>(
                <div key={i} style={{background:`${p.cor}0d`,border:`1px solid ${p.cor}25`,borderRadius:12,padding:"12px",textAlign:"center" as const}}>
                  <div style={{fontSize:12,fontWeight:700,color:p.cor,marginBottom:6}}>{p.nome}</div>
                  <div style={{fontSize:18,fontWeight:800,color:"#e2e8f0"}}>{fmt(p.contrib||0)}</div>
                  <div style={{fontSize:10,color:subtext,marginTop:2}}>contribuição/mês</div>
                </div>
              ))}
            </div>
            <button onClick={()=>{setEditContrib(true);setMyContrib(String(isUser1?account?.contribuicao_user1||0:account?.contribuicao_user2||0));setPartnerContrib(String(isUser1?account?.contribuicao_user2||0:account?.contribuicao_user1||0));}} style={{width:"100%",padding:"9px 0",background:`${accent}18`,border:`1px solid ${accent}35`,borderRadius:9,color:accent,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif",marginBottom:14}}>✏️ Editar contribuições</button>
          </>
        ):(
          <div style={{background:cardBg,border:`1px solid ${cardBorder}`,borderRadius:12,padding:"14px",marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:subtext,textTransform:"uppercase" as const,marginBottom:10}}>Contribuições mensais</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <div><div style={{fontSize:11,color:MY_COLOR,marginBottom:4}}>{myName} (€/mês)</div><input style={inp} type="number" value={myContrib} onChange={e=>setMyContrib(e.target.value)}/></div>
              <div><div style={{fontSize:11,color:PARTNER_COLOR,marginBottom:4}}>{partnerName} (€/mês)</div><input style={inp} type="number" value={partnerContrib} onChange={e=>setPartnerContrib(e.target.value)}/></div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={saveContrib} style={{flex:1,padding:"9px 0",background:`linear-gradient(135deg,${accent},${accentDark})`,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Guardar</button>
              <button onClick={()=>setEditContrib(false)} style={{padding:"9px 14px",background:"rgba(255,255,255,0.05)",border:`1px solid ${cardBorder}`,borderRadius:8,color:subtext,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Month expenses summary */}
        <div style={{background:cardBg,border:`1px solid ${cardBorder}`,borderRadius:12,padding:"14px 16px"}}>
          <div style={{fontSize:10,fontWeight:700,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:12}}>Despesas conjuntas este mês</div>
          {expenses.length===0?<div style={{textAlign:"center" as const,color:subtext,fontSize:13,padding:"16px 0"}}>Sem despesas conjuntas.</div>
          :expenses.slice(0,5).map(e=>{
            const cat=expCats.find(c=>c.id===e.cat);
            const myShare = isUser1?e.split_user1:e.split_user2;
            return(
              <div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:`1px solid ${cardBorder}`}}>
                <span style={{fontSize:18}}>{cat?.icon||"📦"}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{e.descricao}</div>
                  <div style={{fontSize:10,color:subtext}}>A tua parte: <span style={{color:MY_COLOR,fontWeight:700}}>{fmt(myShare)}</span></div>
                </div>
                <span style={{fontSize:13,fontWeight:700,color:negative}}>{fmt(e.valor)}</span>
              </div>
            );
          })}
        </div>
      </>}

      {/* ── DESPESAS ── */}
      {tab==="despesas"&&<>
        <button onClick={()=>setShowForm(!showForm)} style={{width:"100%",marginBottom:14,padding:"11px 0",background:showForm?`${accent}18`:`linear-gradient(135deg,${accent},${accentDark})`,border:showForm?`1px solid ${accent}40`:"none",borderRadius:10,color:showForm?accent:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
          {showForm?"✕ Cancelar":"+ Adicionar despesa conjunta"}
        </button>

        {showForm&&(
          <div style={{background:cardBg,border:`1px solid ${accent}30`,borderRadius:14,padding:"16px",marginBottom:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <div><div style={{fontSize:10,color:subtext,marginBottom:5}}>Descrição</div><input style={inp} placeholder="Ex: Renda" value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}/></div>
              <div><div style={{fontSize:10,color:subtext,marginBottom:5}}>Valor (€)</div><input style={inp} type="number" placeholder="0,00" value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <div><div style={{fontSize:10,color:subtext,marginBottom:5}}>Categoria</div>
                <select style={sel} value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))}>
                  <option value="">Selecionar...</option>
                  {expCats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div><div style={{fontSize:10,color:subtext,marginBottom:5}}>Data</div><input style={inp} type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))}/></div>
            </div>
            {/* Split mode */}
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,color:subtext,marginBottom:8}}>Divisão</div>
              <div style={{display:"flex",gap:6,marginBottom:form.split==="custom"?10:0}}>
                {["50/50","custom"].map(s=>(
                  <button key={s} onClick={()=>setForm(f=>({...f,split:s}))} style={{flex:1,padding:"8px 0",border:`1px solid ${form.split===s?accent:"rgba(255,255,255,0.1)"}`,borderRadius:8,background:form.split===s?`${accent}20`:"transparent",color:form.split===s?accent:"#64748b",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
                    {s==="50/50"?"⚖️ 50/50":"✏️ Personalizado"}
                  </button>
                ))}
              </div>
              {form.split==="custom"&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div><div style={{fontSize:11,color:MY_COLOR,marginBottom:4}}>{myName} (€)</div><input style={inp} type="number" placeholder="0" value={form.splitMy} onChange={e=>setForm(f=>({...f,splitMy:e.target.value}))}/></div>
                  <div><div style={{fontSize:11,color:PARTNER_COLOR,marginBottom:4}}>{partnerName} (€)</div><input style={inp} type="number" placeholder="0" value={form.splitPartner} onChange={e=>setForm(f=>({...f,splitPartner:e.target.value}))}/></div>
                </div>
              )}
            </div>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10,color:subtext,marginBottom:5}}>Tipo</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                {(Object.entries(TYPE_META) as [TypeKey,typeof TYPE_META[TypeKey]][]).map(([t,m])=>(
                  <button key={t} onClick={()=>setForm(f=>({...f,tipo:t}))} style={{padding:"8px 4px",border:`1.5px solid ${form.tipo===t?m.color:"rgba(255,255,255,0.08)"}`,borderRadius:9,background:form.tipo===t?m.bg:"transparent",color:form.tipo===t?m.color:"#4b5563",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"'Sora',sans-serif",textAlign:"center" as const}}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={addExpense} disabled={saving} style={{width:"100%",padding:"11px 0",background:`linear-gradient(135deg,${accent},${accentDark})`,border:"none",borderRadius:9,color:"#fff",fontWeight:700,fontSize:13,cursor:saving?"not-allowed":"pointer",fontFamily:"'Sora',sans-serif",opacity:saving?0.7:1}}>
              {saving?"A guardar...":"+ Adicionar despesa"}
            </button>
          </div>
        )}

        {expenses.length===0&&!showForm&&(
          <div style={{textAlign:"center" as const,padding:"32px 0",color:subtext}}>
            <div style={{fontSize:32,marginBottom:10}}>💳</div>
            <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0",marginBottom:4}}>Sem despesas conjuntas</div>
            <div style={{fontSize:12}}>Adiciona a primeira despesa partilhada.</div>
          </div>
        )}

        {expenses.map(e=>{
          const cat=expCats.find(c=>c.id===e.cat);
          const myShare=isUser1?e.split_user1:e.split_user2;
          const ptShare=isUser1?e.split_user2:e.split_user1;
          const iPaid=e.pago_por===userId;
          return(
            <div key={e.id} style={{background:cardBg,border:`1px solid ${cardBorder}`,borderRadius:12,padding:"12px 14px",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8}}>
                <div style={{width:36,height:36,borderRadius:10,background:`${accent}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{cat?.icon||"📦"}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#e2e8f0"}}>{e.descricao}</div>
                  <div style={{fontSize:10,color:subtext}}>{new Date(e.data+"T12:00:00").toLocaleDateString("pt-PT")} · {iPaid?"Tu pagaste":partnerName+" pagou"}</div>
                </div>
                <div style={{textAlign:"right" as const}}>
                  <div style={{fontSize:15,fontWeight:800,color:negative}}>{fmt(e.valor)}</div>
                  <div style={{fontSize:10,color:subtext}}>total</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                <div style={{background:`${MY_COLOR}12`,borderRadius:8,padding:"6px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,color:MY_COLOR,fontWeight:600}}>{myName}</span>
                  <span style={{fontSize:12,fontWeight:700,color:MY_COLOR}}>{fmt(myShare)}</span>
                </div>
                <div style={{background:`${PARTNER_COLOR}12`,borderRadius:8,padding:"6px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,color:PARTNER_COLOR,fontWeight:600}}>{partnerName}</span>
                  <span style={{fontSize:12,fontWeight:700,color:PARTNER_COLOR}}>{fmt(ptShare)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </>}

      {/* ── ACERTO ── */}
      {tab==="acerto"&&<>
        {/* Net balance */}
        <div style={{background:netBalance>=0?"rgba(52,211,153,0.08)":"rgba(251,113,133,0.08)",border:`1px solid ${netBalance>=0?"rgba(52,211,153,0.3)":"rgba(251,113,133,0.3)"}`,borderRadius:16,padding:"20px",marginBottom:14,textAlign:"center" as const}}>
          <div style={{fontSize:11,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:6}}>
            {netBalance>=0?"A receber de "+partnerName:"A pagar a "+partnerName}
          </div>
          <div style={{fontSize:32,fontWeight:800,color:netBalance>=0?positive:negative,letterSpacing:"-0.5px"}}>{fmt(Math.abs(netBalance))}</div>
        </div>

        {/* Individual balances */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          {[{nome:myName,cor:MY_COLOR,paid:myPaid,due:myExpTotal},{nome:partnerName,cor:PARTNER_COLOR,paid:partnerPaid,due:partnerExpTotal}].map((p,i)=>(
            <div key={i} style={{background:`${p.cor}0d`,border:`1px solid ${p.cor}25`,borderRadius:12,padding:"12px"}}>
              <div style={{fontSize:12,fontWeight:700,color:p.cor,marginBottom:8}}>{p.nome}</div>
              <div style={{fontSize:10,color:subtext,marginBottom:2}}>Pagou</div>
              <div style={{fontSize:14,fontWeight:700,color:positive,marginBottom:6}}>{fmt(p.paid)}</div>
              <div style={{fontSize:10,color:subtext,marginBottom:2}}>Deve</div>
              <div style={{fontSize:14,fontWeight:700,color:negative}}>{fmt(p.due)}</div>
            </div>
          ))}
        </div>

        {/* Add settlement */}
        <button onClick={()=>setShowSettle(!showSettle)} style={{width:"100%",marginBottom:14,padding:"10px 0",background:showSettle?`${accent}18`:`linear-gradient(135deg,${accent},${accentDark})`,border:showSettle?`1px solid ${accent}40`:"none",borderRadius:10,color:showSettle?accent:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
          {showSettle?"✕ Cancelar":"✓ Registar pagamento"}
        </button>

        {showSettle&&(
          <div style={{background:cardBg,border:`1px solid ${accent}30`,borderRadius:12,padding:"14px",marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:700,color:subtext,textTransform:"uppercase" as const,marginBottom:10}}>Registar que pagaste a {partnerName}</div>
            <input style={{...inp,marginBottom:8}} type="number" placeholder="Valor (€)" value={settleValor} onChange={e=>setSettleValor(e.target.value)}/>
            <input style={{...inp,marginBottom:10}} placeholder="Nota (opcional)" value={settleNota} onChange={e=>setSettleNota(e.target.value)}/>
            <button onClick={addSettlement} style={{width:"100%",padding:"10px 0",background:`linear-gradient(135deg,${accent},${accentDark})`,border:"none",borderRadius:9,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Registar</button>
          </div>
        )}

        {/* Settlement history */}
        {settlements.length>0&&(
          <div style={{background:cardBg,border:`1px solid ${cardBorder}`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{fontSize:10,fontWeight:700,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:10}}>Histórico de pagamentos</div>
            {settlements.map(s=>{
              const iPaid=s.pago_por===userId;
              return(
                <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${cardBorder}`}}>
                  <span style={{fontSize:18}}>{iPaid?"💸":"💰"}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,color:"#e2e8f0"}}>{iPaid?`Pagaste a ${partnerName}`:`${partnerName} pagou-te`}</div>
                    {s.nota&&<div style={{fontSize:10,color:subtext}}>{s.nota}</div>}
                    <div style={{fontSize:10,color:subtext}}>{new Date(s.created_at).toLocaleDateString("pt-PT")}</div>
                  </div>
                  <span style={{fontSize:13,fontWeight:700,color:iPaid?negative:positive}}>{fmt(s.valor)}</span>
                </div>
              );
            })}
          </div>
        )}
      </>}
    </div>
  );
}
