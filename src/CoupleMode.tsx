import { useState, useEffect, CSSProperties } from "react";
import { supabase } from "./supabase";
import CoupleRecurring, { CoupleRecurringExpense } from "./CoupleRecurring";

type TypeKey = "necessidade"|"desejo"|"investimento";
interface ExpCat { id:string; label:string; icon:string; type:TypeKey; }
interface Couple { id:number; user1_id:string; user2_id:string|null; user1_email:string; user2_email:string|null; status:string; }
interface CoupleExpense { id:number; couple_id:number; created_by:string; descricao:string; valor:number; cat:string; subcat:string; tipo:TypeKey; data:string; split_user1:number; split_user2:number; pago_por:string; liquidado:boolean; }
interface CoupleAccount { id:number; couple_id:number; saldo:number; contribuicao_user1:number; contribuicao_user2:number; }
interface Settlement { id:number; couple_id:number; pago_por:string; valor:number; nota:string; created_at:string; }

interface Props {
  userId:string; userEmail:string; userName:string;
  expCats:ExpCat[]; accent:string; accentDark:string;
  cardBg:string; cardBorder:string; subtext:string; positive:string; negative:string;
  onSettlement: (valor: number) => void;
}

const fmt = (n:number) => new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR"}).format(n||0);
const TYPE_META: Record<TypeKey,{label:string;color:string;bg:string}> = {
  necessidade:{label:"Necessidade",color:"#3b82f6",bg:"#1e3a5f33"},
  desejo:     {label:"Desejo",     color:"#f59e0b",bg:"#78350f33"},
  investimento:{label:"Investimento",color:"#10b981",bg:"#064e3b33"},
};
const MY_COLOR      = "#f97316";
const PARTNER_COLOR = "#ec4899";

export default function CoupleMode({ userId, userEmail, userName, expCats, accent, accentDark, cardBg, cardBorder, subtext, positive, negative, onSettlement }: Props) {
  const [couple,      setCouple]      = useState<Couple|null>(null);
  const [account,     setAccount]     = useState<CoupleAccount|null>(null);
  const [expenses,    setExpenses]    = useState<CoupleExpense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState<"conta"|"despesas"|"recorrentes"|"acerto">("conta");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting,    setInviting]    = useState(false);
  const [inviteErr,   setInviteErr]   = useState("");
  const [showForm,    setShowForm]    = useState(false);
 const [form, setForm] = useState({
  descricao:"", valor:"", cat:"", subcat:"", tipo:"necessidade" as TypeKey,
  data:new Date().toISOString().slice(0,10), split:"50/50",
  splitMy:"", splitPartner:"", liquidado:true, pagoPor:"me",
});
  const [saving,     setSaving]     = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number|null>(null);
  const [syncMsg,    setSyncMsg]    = useState("");
  const [editContrib,setEditContrib]= useState(false);
  const [myContrib,  setMyContrib]  = useState("");
  const [partnerContrib,setPartnerContrib]=useState("");
  const [recurringItems, setRecurringItems] = useState<CoupleRecurringExpense[]>([]);
  const [editOrcamento, setEditOrcamento] = useState(false);
  const [orcamentoInput, setOrcamentoInput] = useState("");
  const [notifications, setNotifications] = useState<{id:string;mensagem:string;lida:boolean;created_at:string}[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [searchCouple, setSearchCouple] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);

  useEffect(()=>{ loadCouple(); },[userId,userEmail]);

  // Polling de notificações a cada 30 segundos
  useEffect(()=>{
    const interval = setInterval(async()=>{
      const {data} = await supabase.from("notifications").select("*").eq("user_id",userId).eq("lida",false).order("created_at",{ascending:false}).limit(20);
      if(data) setNotifications(data);
    }, 30000);
    return ()=>clearInterval(interval);
  },[userId]);

  async function loadCouple() {
    setLoading(true);
    const {data:c} = await supabase.from("couples").select("*")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId},user2_email.eq.${userEmail}`)
      .order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(c){
      if(c.user2_email===userEmail&&!c.user2_id&&c.user1_id!==userId){
        await supabase.from("couples").update({user2_id:userId}).eq("id",c.id);
        c.user2_id=userId;
      }
      setCouple(c as Couple);
      if(c.status==="active"){
        const [expR,accR,setR,recR,notifR]=await Promise.all([
        supabase.from("couple_expenses").select("*").eq("couple_id",c.id).order("data",{ascending:false}),
        supabase.from("couple_account").select("*").eq("couple_id",c.id).maybeSingle(),
        supabase.from("couple_settlements").select("*").eq("couple_id",c.id).order("created_at",{ascending:false}),
        supabase.from("couple_recurring_expenses").select("*").eq("couple_id",c.id).order("proxima_data"),
        supabase.from("notifications").select("*").eq("user_id",userId).eq("lida",false).order("created_at",{ascending:false}).limit(20),
      ]);
      if(expR.data) setExpenses(expR.data as CoupleExpense[]);
      if(accR.data) setAccount(accR.data as CoupleAccount);
      if(setR.data) setSettlements(setR.data as Settlement[]);
      if(recR.data) setRecurringItems(recR.data as CoupleRecurringExpense[]);
      if(notifR.data) setNotifications(notifR.data);
      }
    }
    setLoading(false);
  }

  async function sendInvite() {
    if(!inviteEmail.trim()||inviteEmail===userEmail){setInviteErr("Email inválido.");return;}
    setInviting(true);setInviteErr("");
    const {data,error}=await supabase.from("couples").insert({
      user1_id:userId,user1_email:userEmail,user2_email:inviteEmail.trim().toLowerCase(),status:"pending"
    }).select().single();
    if(error){setInviteErr("Erro ao enviar convite.");setInviting(false);return;}
    setCouple(data as Couple);
    setInviting(false);
  }

  async function acceptInvite() {
    if(!couple) return;
    const {data,error}=await supabase.from("couples").update({user2_id:userId,status:"active"}).eq("id",couple.id).select().single();
    if(!error&&data){
      setCouple(data as Couple);
      const {data:acc}=await supabase.from("couple_account").insert({couple_id:couple.id,saldo:0,contribuicao_user1:0,contribuicao_user2:0}).select().single();
      if(acc) setAccount(acc as CoupleAccount);
    }
  }

  async function rejectInvite() {
    if(!couple) return;
    await supabase.from("couples").update({status:"rejected"}).eq("id",couple.id);
    setCouple(null);
  }

async function syncToPersonal(e: CoupleExpense) {
  setSyncMsg("A sincronizar com contas pessoais...");
  try {
    const { data: existing } = await supabase
      .from("expenses")
      .select("id")
      .eq("couple_expense_id", e.id);
    
    if (existing && existing.length > 0) {
      setSyncMsg("✓ Já sincronizado!");
      setTimeout(() => setSyncMsg(""), 3500);
      return;
    }

    const { error } = await supabase.rpc("insert_couple_expense", {
      p_user1_id: couple!.user1_id,
      p_user2_id: couple!.user2_id || null,
      p_descricao: e.descricao,
      p_valor1: e.split_user1,
      p_valor2: e.split_user2,
      p_cat: e.cat,
      p_data: e.data,
      p_tipo: e.tipo || "necessidade",
      p_couple_expense_id: e.id,
    });

    if (error) setSyncMsg(`⚠️ Erro: ${error.message}`);
    else setSyncMsg("✓ Registado nas contas pessoais de ambos!");
  } catch {
    setSyncMsg("⚠️ Sincronização falhou.");
  }
  setTimeout(() => setSyncMsg(""), 3500);
}

  async function addExpense() {
    if(!couple||!form.descricao.trim()||!form.valor||!form.cat) return;
    setSaving(true);
    const total=Number(form.valor);
    const isUser1=couple.user1_id===userId;
    let s1:number,s2:number;
    if(form.split==="50/50"){s1=total/2;s2=total/2;}
    else{const my=Number(form.splitMy)||0,pt=Number(form.splitPartner)||0;s1=isUser1?my:pt;s2=isUser1?pt:my;}
    const {data,error}=await supabase.from("couple_expenses").insert({
      couple_id:couple.id,created_by:userId,descricao:form.descricao.trim(),
      valor:total,cat:form.cat,subcat:form.subcat,tipo:form.tipo,
      data:form.data,split_user1:s1,split_user2:s2,pago_por: form.pagoPor==="me" ? userId : (isUser1 ? couple.user2_id : couple.user1_id),liquidado:form.liquidado,
    }).select().single();
    if(!error&&data){
    setExpenses(p=>[data as CoupleExpense,...p]);
      // Notifica o parceiro
      const partnerId = isUser1 ? couple.user2_id : couple.user1_id;
      if(partnerId) await createNotification(partnerId, "nova_despesa", `${userName} adicionou uma despesa conjunta: ${form.descricao.trim()} — ${fmt(Number(form.valor))}`);
      // Se liquidado — sync imediato para contas pessoais
      if(form.liquidado) await syncToPersonal(data as CoupleExpense);
      setForm(f=>({...f,descricao:"",valor:"",subcat:""}));
      setShowForm(false);
      setSuccessMsg("✓ Despesa adicionada!");
      setTimeout(()=>setSuccessMsg(""),3000);
    }
    setSaving(false);
  }

  async function marcarLiquidado(e: CoupleExpense) {
  await supabase.from("couple_expenses").update({liquidado:true}).eq("id",e.id);
  setExpenses(p=>p.map(x=>x.id===e.id?{...x,liquidado:true}:x));
  // Notifica o parceiro
  const partnerId = isUser1 ? couple!.user2_id : couple!.user1_id;
  console.log("Notificar parceiro:", partnerId, "isUser1:", isUser1, "couple:", couple);
  if(partnerId) await createNotification(partnerId, "liquidado", `${userName} liquidou a despesa: ${e.descricao} — ${fmt(Number(e.valor))}`);
  await syncToPersonal(e);
  // Deduz a parte do utilizador actual da conta pessoal
  const myShare = isUser1 ? e.split_user1 : e.split_user2;
  if(myShare > 0) onSettlement(myShare);
}
  async function deleteExpense(e: CoupleExpense) {
  if(!window.confirm(`Apagar "${e.descricao}"? Esta despesa será removida das contas pessoais de ambos.`)) return;
  // Apaga despesas pessoais sincronizadas
  await supabase.from("expenses").delete().eq("couple_expense_id", e.id);
  // Apaga despesa conjunta
  await supabase.from("couple_expenses").delete().eq("id", e.id);
  setExpenses(p => p.filter(x => x.id !== e.id));
}

async function createNotification(partnerId: string, tipo: string, mensagem: string) {
  if(!couple) return;
  await supabase.from("notifications").insert({
    user_id: partnerId,
    couple_id: couple.id,
    tipo,
    mensagem,
    lida: false,
  });
}

async function saveOrcamento() {
  if(!account) return;
  const val = Number(orcamentoInput);
  await supabase.from("couple_account").update({ orcamento_mensal: val }).eq("id", account.id);
  setAccount(a => a ? {...a, orcamento_mensal: val} : a);
  setEditOrcamento(false);
}

 async function saveContrib() {
    if(!couple||!account) return;
    const isUser1=couple.user1_id===userId;
    const u1=isUser1?Number(myContrib):Number(partnerContrib);
    const u2=isUser1?Number(partnerContrib):Number(myContrib);
    await supabase.from("couple_account").update({contribuicao_user1:u1,contribuicao_user2:u2}).eq("id",account.id);
    setAccount(a=>a?{...a,contribuicao_user1:u1,contribuicao_user2:u2}:a);
    setEditContrib(false);
  }
  function openEditExpense(e: CoupleExpense) {
  const isUser1local = couple?.user1_id === userId;
  setEditingExpenseId(e.id);
  setForm({
    descricao: e.descricao,
    valor: String(e.valor),
    cat: e.cat,
    subcat: e.subcat,
    tipo: e.tipo,
    data: e.data,
    split: "custom",
    pagoPor: e.pago_por === userId ? "me" : "partner",
    splitMy: String(isUser1local ? e.split_user1 : e.split_user2),
    splitPartner: String(isUser1local ? e.split_user2 : e.split_user1),
    liquidado: e.liquidado,
  });
  setShowForm(true);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
  async function updateExpense() {
  if(!couple||!editingExpenseId||!form.descricao.trim()||!form.valor||!form.cat) return;
  setSaving(true);
  const total = Number(form.valor);
  const isUser1local = couple.user1_id === userId;
  const my = Number(form.splitMy)||0;
  const pt = Number(form.splitPartner)||0;
  const s1 = isUser1local ? my : pt;
  const s2 = isUser1local ? pt : my;
  await supabase.from("couple_expenses").update({
    descricao: form.descricao.trim(),
    valor: total, cat: form.cat, subcat: form.subcat,
    tipo: form.tipo, data: form.data,
    split_user1: s1, split_user2: s2,
    liquidado: form.liquidado,
  }).eq("id", editingExpenseId);
  // Edge Function trata do delete + re-insert com service role
  if(form.liquidado) {
    await supabase.functions.invoke("couple-expense-sync", {
      body: { couple_expense_id: editingExpenseId, force_resync: true }
    });
  } else {
    // Se não liquidado, apaga as despesas pessoais sincronizadas
    await supabase.functions.invoke("couple-expense-sync", {
      body: { couple_expense_id: editingExpenseId, delete_only: true }
    });
  }
  setExpenses(p => p.map(x => x.id === editingExpenseId
    ? {...x, descricao:form.descricao.trim(), valor:total, cat:form.cat, subcat:form.subcat, tipo:form.tipo, data:form.data, split_user1:s1, split_user2:s2, liquidado:form.liquidado}
    : x
  ));
  setEditingExpenseId(null);
  setForm(f => ({...f, descricao:"", valor:"", subcat:""}));
  setShowForm(false);
  setSaving(false);
  setSuccessMsg("✓ Despesa atualizada!");
  setTimeout(()=>setSuccessMsg(""),3000);
}
  async function dissolveCouple() {
    if(!couple||!window.confirm("Tens a certeza? Todos os dados conjuntos serão apagados.")) return;
    await supabase.from("couples").delete().eq("id",couple.id);
    setCouple(null);setAccount(null);setExpenses([]);setSettlements([]);
  }

  const inp:CSSProperties={width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box",outline:"none",fontFamily:"'Sora',sans-serif"};
  const sel:CSSProperties={width:"100%",background:"#111827",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box",outline:"none"};
  const tBtn=(a:boolean,cor=accent):CSSProperties=>({flex:1,padding:"10px 4px",border:`1px solid ${a?cor:"rgba(255,255,255,0.06)"}`,borderRadius:12,cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"'Sora',sans-serif",background:a?`${cor}18`:"rgba(255,255,255,0.03)",color:a?cor:"#475569",whiteSpace:"nowrap",transition:"all .2s"});

  if(loading) return <div style={{textAlign:"center",padding:"48px 0",color:subtext,fontFamily:"'Sora',sans-serif"}}>A carregar...</div>;

  const isUser1=couple?.user1_id===userId;
  const partnerEmail=couple?(isUser1?couple.user2_email:couple.user1_email):null;
  const partnerName=partnerEmail?partnerEmail.split("@")[0]:"Parceiro/a";

  const liquidadas=expenses.filter(e=>e.liquidado);
  const porLiquidar=expenses.filter(e=>!e.liquidado);

  // Quanto cada um deve no total das por liquidar
  const myDebt=porLiquidar.reduce((s,e)=>s+(isUser1?e.split_user1:e.split_user2),0);
  const partnerDebt=porLiquidar.reduce((s,e)=>s+(isUser1?e.split_user2:e.split_user1),0);
  const totalContributions = (account?.contribuicao_user1||0) + (account?.contribuicao_user2||0);
const totalSettledExpenses = liquidadas.reduce((s,e) => s + Number(e.valor), 0);
const jointBalance = totalContributions - totalSettledExpenses;
  

  // ── NO COUPLE ──────────────────────────────────────────────────────────────
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
        {[
          "O teu parceiro/a abre a app e vai ao tab 👫 Casal",
          "O convite aparece automaticamente",
          "Despesas liquidadas → aparecem nas contas pessoais de ambos com badge 👫",
          "Despesas por liquidar → aparecem no tab ⚖️ Acerto para acompanhar",
        ].map((t,i)=>(
          <div key={i} style={{display:"flex",gap:8,marginBottom:6}}>
            <span style={{fontSize:13,color:accent,flexShrink:0}}>✓</span>
            <span style={{fontSize:12,color:subtext,lineHeight:1.5}}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // ── PENDING ─────────────────────────────────────────────────────────────────
  if(couple.status==="pending"){
    const isSender=couple.user1_id===userId;
    return(
      <div style={{fontFamily:"'Sora',sans-serif"}}>
        {isSender?(
          <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:16,padding:"24px",textAlign:"center" as const}}>
            <div style={{fontSize:36,marginBottom:12}}>⏳</div>
            <div style={{fontSize:16,fontWeight:800,color:"#f1f5f9",marginBottom:8}}>Convite enviado!</div>
            <div style={{fontSize:13,color:subtext,marginBottom:16,lineHeight:1.6}}>Aguarda que <strong style={{color:"#f59e0b"}}>{couple.user2_email}</strong> abra o tab 👫 Casal na app para aceitar.</div>
            <button onClick={dissolveCouple} style={{padding:"9px 20px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:9,color:"#f87171",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Cancelar convite</button>
          </div>
        ):(
          <div style={{background:`${accent}08`,border:`1px solid ${accent}30`,borderRadius:16,padding:"24px",textAlign:"center" as const}}>
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

  // ── ACTIVE ──────────────────────────────────────────────────────────────────
  return(
    <div style={{fontFamily:"'Sora',sans-serif"}}>
      {/* Header compacto */}
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:`rgba(255,255,255,0.03)`,border:`1px solid rgba(255,255,255,0.07)`,borderRadius:14,marginBottom:12,position:"relative"}}>
        {/* Avatares */}
        <div style={{display:"flex",flexShrink:0}}>
          <div style={{width:28,height:28,borderRadius:"50%",background:`${MY_COLOR}30`,border:`2px solid ${MY_COLOR}`,display:"flex",alignItems:"center",justifyContent:"center",zIndex:2}}>
            <span style={{fontSize:10,fontWeight:800,color:MY_COLOR}}>{userName.slice(0,2).toUpperCase()}</span>
          </div>
          <div style={{width:28,height:28,borderRadius:"50%",background:`${PARTNER_COLOR}30`,border:`2px solid ${PARTNER_COLOR}`,display:"flex",alignItems:"center",justifyContent:"center",marginLeft:-8,zIndex:1}}>
            <span style={{fontSize:10,fontWeight:800,color:PARTNER_COLOR}}>{partnerName.slice(0,2).toUpperCase()}</span>
          </div>
        </div>
        {/* Status + stats */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:"#34d399",boxShadow:"0 0 5px #34d399",flexShrink:0}}/>
            <span style={{fontSize:10,color:subtext}}>modo casal ativo</span>
          </div>
          <div style={{display:"flex",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{fontSize:9,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.06em"}}>Geridos</span>
              <span style={{fontSize:12,fontWeight:800,color:"#f1f5f9"}}>{fmt(liquidadas.reduce((s,e)=>s+Number(e.valor),0))}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{fontSize:9,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.06em"}}>Pendente</span>
              <span style={{fontSize:12,fontWeight:800,color:porLiquidar.length>0?"#f59e0b":"#34d399"}}>{fmt(myDebt)}</span>
            </div>
          </div>
        </div>
        {/* Botões */}
        <div style={{display:"flex",gap:6,flexShrink:0,position:"relative"}}>
          <button onClick={()=>setShowNotifications(v=>!v)} style={{width:30,height:30,borderRadius:8,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:13,position:"relative"}}>
            🔔
            {notifications.length>0&&(
              <span style={{position:"absolute",top:-3,right:-3,width:14,height:14,borderRadius:"50%",background:"#ef4444",color:"white",fontSize:8,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {notifications.length}
              </span>
            )}
          </button>
          {showNotifications&&(
            <>
              <div onClick={()=>setShowNotifications(false)} style={{position:"fixed",inset:0,zIndex:10}}/>
              <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,zIndex:20,background:"#0f1117",border:"1px solid rgba(255,255,255,0.1)",borderRadius:16,padding:"12px",minWidth:280,maxWidth:320,boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#f1f5f9"}}>Notificações</div>
                  {notifications.length>0&&(
                    <button onClick={async()=>{await supabase.from("notifications").update({lida:true}).eq("user_id",userId);setNotifications([]);setShowNotifications(false);}} style={{fontSize:11,color:accent,background:"none",border:"none",cursor:"pointer",fontFamily:"'Sora',sans-serif",fontWeight:600}}>
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                {notifications.length===0?(
                  <div style={{textAlign:"center" as const,padding:"16px 0",color:subtext,fontSize:13}}>Sem notificações</div>
                ):notifications.map(n=>(
                  <div key={n.id} style={{padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                    <div style={{fontSize:13,color:"#e2e8f0",lineHeight:1.5}}>{n.mensagem}</div>
                    <div style={{fontSize:10,color:subtext,marginTop:4}}>{new Date(n.created_at).toLocaleDateString("pt-PT",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
                  </div>
                ))}
              </div>
            </>
          )}
          <button onClick={dissolveCouple} style={{width:30,height:30,borderRadius:8,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.12)",display:"flex",alignItems:"center",justifyContent:"center",color:"#f87171",fontSize:12,cursor:"pointer"}}>✕</button>
        </div>
      </div>
      {/* Sync message */}
      {syncMsg&&(
        <div style={{background:syncMsg.includes("✓")?"rgba(52,211,153,0.1)":"rgba(245,158,11,0.1)",border:`1px solid ${syncMsg.includes("✓")?"rgba(52,211,153,0.3)":"rgba(245,158,11,0.3)"}`,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:13,color:syncMsg.includes("✓")?"#34d399":"#f59e0b",fontWeight:600}}>
          {syncMsg}
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {(["conta","despesas","recorrentes"] as const).map(t=>{
          const badge=t==="despesas"&&porLiquidar.length>0;
          return(
            <button key={t} style={{...tBtn(tab===t,t==="conta"?"#a78bfa":t==="despesas"?accent:PARTNER_COLOR),position:"relative"}} onClick={()=>setTab(t)}>
              {t==="conta"?"🏦 Conta":t==="despesas"?"💳 Despesas":"🔄 Recorrentes"}
              {badge&&<span style={{position:"absolute",top:4,right:4,width:8,height:8,borderRadius:"50%",background:"#f59e0b"}}/>}
            </button>
          );
        })}
      </div>

      {/* ── CONTA ── */}
      {tab==="conta"&&<>
{/* ── Saldo conjunto hero ── */}
<div style={{background:"linear-gradient(135deg,rgba(0,195,122,0.08),rgba(124,58,237,0.06))",border:"1px solid rgba(0,195,122,0.2)",borderRadius:16,padding:"14px 16px",marginBottom:12}}>
  {/* Saldo */}
  <div style={{fontSize:10,fontWeight:700,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.12em",marginBottom:4}}>Saldo Conjunto</div>
  <div style={{fontSize:26,fontWeight:800,color:jointBalance>=0?"#f1f5f9":"#ff7d7d",letterSpacing:"-1px",lineHeight:1,marginBottom:4}}>{fmt(jointBalance)}</div>
  <div style={{fontSize:11,color:jointBalance>=0?"rgba(0,195,122,0.8)":"rgba(255,125,125,0.8)",fontWeight:600,marginBottom:12}}>
    {totalSettledExpenses>0?`${fmt(totalContributions)} contribuições − ${fmt(totalSettledExpenses)} despesas`:`${fmt(totalContributions)} em contribuições`}
  </div>
  {/* Contribuições compactas */}
  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
    <div style={{flex:1,display:"flex",alignItems:"center",gap:6,padding:"7px 10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:9}}>
      <span style={{fontSize:11,fontWeight:700,color:MY_COLOR}}>{userName.slice(0,2).toUpperCase()}</span>
      <span style={{fontSize:12,fontWeight:700,color:"#f1f5f9"}}>{fmt(isUser1?account?.contribuicao_user1||0:account?.contribuicao_user2||0)}</span>
      <span style={{fontSize:10,color:subtext,marginLeft:"auto"}}>{isUser1?Math.round(((account?.contribuicao_user1||0)/Math.max(totalContributions,1))*100):Math.round(((account?.contribuicao_user2||0)/Math.max(totalContributions,1))*100)}%</span>
    </div>
    <div style={{flex:1,display:"flex",alignItems:"center",gap:6,padding:"7px 10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:9}}>
      <span style={{fontSize:11,fontWeight:700,color:PARTNER_COLOR}}>{partnerName.slice(0,2).toUpperCase()}</span>
      <span style={{fontSize:12,fontWeight:700,color:"#f1f5f9"}}>{fmt(isUser1?account?.contribuicao_user2||0:account?.contribuicao_user1||0)}</span>
      <span style={{fontSize:10,color:subtext,marginLeft:"auto"}}>{isUser1?Math.round(((account?.contribuicao_user2||0)/Math.max(totalContributions,1))*100):Math.round(((account?.contribuicao_user1||0)/Math.max(totalContributions,1))*100)}%</span>
    </div>
    <button onClick={()=>{setEditContrib(v=>!v);setMyContrib(String(isUser1?account?.contribuicao_user1||0:account?.contribuicao_user2||0));setPartnerContrib(String(isUser1?account?.contribuicao_user2||0:account?.contribuicao_user1||0));}} style={{width:30,height:30,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:subtext,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button>
  </div>
  {editContrib&&(
    <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:9,padding:"10px",marginBottom:12}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
        <div><div style={{fontSize:10,color:MY_COLOR,marginBottom:3}}>{userName} (€)</div><input style={inp} type="number" value={myContrib} onChange={e=>setMyContrib(e.target.value)}/></div>
        <div><div style={{fontSize:10,color:PARTNER_COLOR,marginBottom:3}}>{partnerName} (€)</div><input style={inp} type="number" value={partnerContrib} onChange={e=>setPartnerContrib(e.target.value)}/></div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={saveContrib} style={{flex:1,padding:"8px 0",background:`linear-gradient(135deg,${accent},${accentDark})`,border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Guardar</button>
        <button onClick={()=>setEditContrib(false)} style={{padding:"8px 10px",background:"rgba(255,255,255,0.05)",border:`1px solid ${cardBorder}`,borderRadius:8,color:subtext,fontSize:12,cursor:"pointer"}}>✕</button>
      </div>
    </div>
  )}
  {/* Orçamento mensal */}
  {(()=>{
    const orcamento = Number((account as any)?.orcamento_mensal) || 0;
    const usado = totalSettledExpenses;
    const pct = orcamento > 0 ? Math.min(100, Math.round((usado / orcamento) * 100)) : 0;
    const restante = orcamento - usado;
    const overBudget = orcamento > 0 && usado > orcamento;
    return orcamento > 0 ? (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
          <span style={{fontSize:11,color:subtext}}>Orçamento mensal</span>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:11,fontWeight:700,color:overBudget?"#ff7d7d":"#34d399"}}>{pct}% · {overBudget?`⚠️ +${fmt(Math.abs(restante))}`:`restam ${fmt(restante)}`}</span>
            <button onClick={()=>{setEditOrcamento(true);setOrcamentoInput(String(orcamento));}} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"2px 7px",color:subtext,fontSize:10,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>✏️</button>
          </div>
        </div>
        <div style={{height:5,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"hidden"}}>
          <div style={{width:`${pct}%`,height:"100%",borderRadius:99,background:overBudget?"linear-gradient(90deg,#ff7d7d,#ef4444)":"linear-gradient(90deg,#34d399,#00c37a)",transition:"width 0.5s ease"}}/>
        </div>
      </div>
    ) : (
      <button onClick={()=>{setEditOrcamento(true);setOrcamentoInput("");}} style={{width:"100%",padding:"8px 0",background:"rgba(255,255,255,0.04)",border:"1px dashed rgba(255,255,255,0.12)",borderRadius:9,color:subtext,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
        + Definir orçamento mensal conjunto
      </button>
    );
  })()}
  {editOrcamento&&(
    <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:9,padding:"10px",marginTop:10}}>
      <div style={{fontSize:11,color:subtext,marginBottom:6}}>Orçamento mensal conjunto (€)</div>
      <div style={{display:"flex",gap:8}}>
        <input style={{...inp,flex:1}} type="number" placeholder="Ex: 2000" value={orcamentoInput} onChange={e=>setOrcamentoInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveOrcamento()} autoFocus/>
        <button onClick={saveOrcamento} style={{padding:"8px 12px",background:`linear-gradient(135deg,${accent},${accentDark})`,border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>✓</button>
        <button onClick={()=>setEditOrcamento(false)} style={{padding:"8px 10px",background:"rgba(255,255,255,0.05)",border:`1px solid ${cardBorder}`,borderRadius:8,color:subtext,fontSize:12,cursor:"pointer"}}>✕</button>
      </div>
    </div>
  )}
</div>
{/* ── Top categorias conjuntas ── */}
        {liquidadas.length>0&&(()=>{
          // Mês actual
          const now = new Date();
          const thisMonth = now.getMonth();
          const thisYear = now.getFullYear();
          const prevMonth = thisMonth===0?11:thisMonth-1;
          const prevYear = thisMonth===0?thisYear-1:thisYear;
          const thisMonthExp = liquidadas.filter(e=>{
            const d=new Date(e.data+"T12:00:00");
            return d.getMonth()===thisMonth&&d.getFullYear()===thisYear;
          });
          const prevMonthExp = liquidadas.filter(e=>{
            const d=new Date(e.data+"T12:00:00");
            return d.getMonth()===prevMonth&&d.getFullYear()===prevYear;
          });
          // Agrupa por categoria
          const catMap:Record<string,{total:number;prev:number;icon:string;label:string;type:TypeKey}> = {};
          thisMonthExp.forEach(e=>{
            const cat=expCats.find(c=>c.id===e.cat);
            if(!catMap[e.cat]) catMap[e.cat]={total:0,prev:0,icon:cat?.icon||"📦",label:cat?.label||e.cat,type:e.tipo||"necessidade"};
            catMap[e.cat].total+=Number(e.valor);
          });
          prevMonthExp.forEach(e=>{
            const cat=expCats.find(c=>c.id===e.cat);
            if(!catMap[e.cat]) catMap[e.cat]={total:0,prev:0,icon:cat?.icon||"📦",label:cat?.label||e.cat,type:e.tipo||"necessidade"};
            catMap[e.cat].prev+=Number(e.valor);
          });
          const topCats = Object.values(catMap).sort((a,b)=>b.total-a.total).slice(0,5);
          const maxVal = Math.max(...topCats.map(c=>c.total),1);
          // Totais mensais para comparação
          const totalThisMonth = thisMonthExp.reduce((s,e)=>s+Number(e.valor),0);
          const totalPrevMonth = prevMonthExp.reduce((s,e)=>s+Number(e.valor),0);
          const monthDiff = totalThisMonth - totalPrevMonth;
          const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
          return(
            <>
              {/* Comparação mensal */}
              {totalPrevMonth>0&&(
                <div style={{background:monthDiff<=0?"rgba(52,211,153,0.06)":"rgba(255,125,125,0.06)",border:`1px solid ${monthDiff<=0?"rgba(52,211,153,0.2)":"rgba(255,125,125,0.2)"}`,borderRadius:14,padding:"14px 16px",marginBottom:14}}>
                  <div style={{fontSize:10,fontWeight:700,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:10}}>Comparação mensal</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                    <div style={{textAlign:"center" as const}}>
                      <div style={{fontSize:10,color:subtext,marginBottom:4}}>{MONTHS_PT[prevMonth]}</div>
                      <div style={{fontSize:18,fontWeight:800,color:"#94a3b8"}}>{fmt(totalPrevMonth)}</div>
                    </div>
                    <div style={{textAlign:"center" as const}}>
                      <div style={{fontSize:10,color:subtext,marginBottom:4}}>{MONTHS_PT[thisMonth]} (atual)</div>
                      <div style={{fontSize:18,fontWeight:800,color:"#f1f5f9"}}>{fmt(totalThisMonth)}</div>
                    </div>
                  </div>
                  <div style={{textAlign:"center" as const,padding:"8px 12px",background:monthDiff<=0?"rgba(52,211,153,0.1)":"rgba(255,125,125,0.1)",borderRadius:10}}>
                    <span style={{fontSize:13,fontWeight:700,color:monthDiff<=0?"#34d399":"#ff7d7d"}}>
                      {monthDiff<=0?"↓":"↑"} {fmt(Math.abs(monthDiff))} {monthDiff<=0?"menos":"mais"} que o mês anterior
                    </span>
                  </div>
                </div>
              )}
              {/* Top categorias */}
              <div style={{background:cardBg,border:`1px solid ${cardBorder}`,borderRadius:14,padding:"16px",marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:14}}>Top categorias conjuntas</div>
                {topCats.map((c,i)=>{
                  const diff = c.total - c.prev;
                  const hasPrev = c.prev > 0;
                  return(
                    <div key={i} style={{marginBottom:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        <span style={{fontSize:13,color:"#e2e8f0"}}>{c.icon} {c.label}</span>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          {hasPrev&&(
                            <span style={{fontSize:10,fontWeight:700,color:diff>0?"#ff7d7d":"#34d399"}}>
                              {diff>0?"↑":"↓"}{fmt(Math.abs(diff))}
                            </span>
                          )}
                          <span style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>{fmt(c.total)}</span>
                        </div>
                      </div>
                      <div style={{height:6,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"hidden"}}>
                        <div style={{width:`${Math.round((c.total/maxVal)*100)}%`,height:"100%",borderRadius:99,background:TYPE_META[c.type]?.color||accent}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}
        
              {/* ── Gráfico evolução mensal ── */}
        {(()=>{
          const now = new Date();
          const thisYear = now.getFullYear();
          const thisMonth = now.getMonth();
          const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
          const monthlyData = MONTHS_PT.map((_,i)=>({
            mes: i,
            label: MONTHS_PT[i],
            total: expenses.filter(e=>{
              const d = new Date(e.data);
              return e.liquidado && d.getMonth()===i && d.getFullYear()===thisYear;
            }).reduce((s,e)=>s+Number(e.valor),0)
          }));
          const maxVal = Math.max(...monthlyData.map(m=>m.total),1);
          const hasData = monthlyData.some(m=>m.total>0);
          return(
            <div style={{background:cardBg,border:`1px solid ${cardBorder}`,borderRadius:14,padding:"14px 16px",marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:12}}>Evolução de gastos {thisYear}</div>
              <div style={{display:"flex",alignItems:"flex-end",gap:3,height:60,marginTop:40,marginBottom:8}}>
                {monthlyData.map((m,i)=>{
                  const h = m.total>0 ? Math.max(6, Math.round((m.total/maxVal)*48)) : 2;
                  const isCurrent = i===thisMonth;
                  const hasFuture = i>thisMonth;
                  return(
                    <div key={i} style={{flex:1,display:"flex",flexDirection:"column" as const,alignItems:"center",gap:2}}>
                      {isCurrent&&m.total>0&&(
                        <div style={{fontSize:8,fontWeight:700,color:"#5DA9FF",marginBottom:2,whiteSpace:"nowrap" as const}}>{fmt(m.total)}</div>
                      )}
                      <div style={{height:48,display:"flex",alignItems:"flex-end",width:"100%"}}>
                        <div style={{
                          width:"100%",
                          minHeight:m.total>0?h:2,
                          height:m.total>0?h:2,
                          borderRadius:"3px 3px 0 0",
                          background:isCurrent
                            ?"linear-gradient(180deg,#5DA9FF,#3d8fd9)"
                            :hasFuture
                            ?"rgba(255,255,255,0.04)"
                            :`linear-gradient(180deg,${MY_COLOR}90,${MY_COLOR}40)`,
                          transition:"height .4s"
                        }}/>
                      </div>
                      <span style={{fontSize:7,color:isCurrent?"#5DA9FF":subtext,fontWeight:isCurrent?700:400}}>{m.label}</span>
                    </div>
                  );
                })}
              </div>
              {(()=>{
                const prevMonth = thisMonth===0?11:thisMonth-1;
                const curr = monthlyData[thisMonth].total;
                const prev = monthlyData[prevMonth].total;
                if(!prev||!curr) return null;
                const diff = curr - prev;
                return(
                  <div style={{paddingTop:8,borderTop:`1px solid ${cardBorder}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:11,color:subtext}}>vs mês anterior</span>
                    <span style={{fontSize:12,fontWeight:700,color:diff<=0?"#34d399":"#ff7d7d"}}>{diff<=0?"↓":"↑"} {fmt(Math.abs(diff))}</span>
                  </div>
                );
              })()}
            </div>
          );
        })()}
        {/* Por liquidar alerta */}
        {porLiquidar.length>0&&(
          <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:12,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:"#f59e0b",marginBottom:2}}>⏳ {porLiquidar.length} despesa{porLiquidar.length>1?"s":""} por liquidar</div>
              <div style={{fontSize:11,color:subtext}}>A tua parte: <span style={{color:"#f59e0b",fontWeight:700}}>{fmt(myDebt)}</span></div>
            </div>
            <button onClick={()=>setTab("despesas")} style={{padding:"6px 12px",background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:8,color:"#f59e0b",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Ver →</button>
          </div>
        )}
        
      </>}

     {/* ── DESPESAS ── */}
      {tab==="despesas"&&<>
  {successMsg&&(
    <div style={{background:"rgba(52,211,153,0.12)",border:"1px solid rgba(52,211,153,0.3)",borderRadius:12,padding:"12px 16px",marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:16}}>✅</span>
      <span style={{fontSize:13,fontWeight:700,color:"#34d399"}}>{successMsg}</span>
    </div>
  )}

  {/* ── Resumo acerto compacto ── */}
  {porLiquidar.length>0&&(()=>{
    const totalOwedByPartner=porLiquidar.filter(e=>e.pago_por===userId).reduce((s,e)=>s+(isUser1?e.split_user2:e.split_user1),0);
    const totalOwedByMe=porLiquidar.filter(e=>e.pago_por!==userId).reduce((s,e)=>s+(isUser1?e.split_user1:e.split_user2),0);
    const net=totalOwedByPartner-totalOwedByMe;
    return(
      <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"14px 16px",marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:4}}>Acerto pendente</div>
            {net>0?<div style={{fontSize:13,color:PARTNER_COLOR}}><span style={{fontWeight:800,fontSize:18}}>{fmt(net)}</span> a receber de {partnerName}</div>
            :net<0?<div style={{fontSize:13,color:MY_COLOR}}><span style={{fontWeight:800,fontSize:18}}>{fmt(Math.abs(net))}</span> a pagar a {partnerName}</div>
            :<div style={{fontSize:13,fontWeight:700,color:"#34d399"}}>✓ Empatados</div>}
          </div>
          <button
            onClick={async()=>{
              if(!window.confirm(`Liquidar todas as ${porLiquidar.length} despesas?`)) return;
              for(const e of porLiquidar){ await marcarLiquidado(e); }
            }}
            style={{padding:"9px 16px",background:"linear-gradient(135deg,#34d399,#059669)",border:"none",borderRadius:10,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif",whiteSpace:"nowrap" as const}}>
            ✓ Liquidar tudo
          </button>
        </div>
        <div style={{height:1,background:"rgba(255,255,255,0.06)",marginBottom:4}}/>
        <div style={{fontSize:10,color:subtext}}>{porLiquidar.length} despesa{porLiquidar.length>1?"s":""} pendente{porLiquidar.length>1?"s":""}</div>
      </div>
    );
  })()}

  {/* ── Botão adicionar ── */}
  <button onClick={()=>{
    if(showForm){setShowForm(false);setEditingExpenseId(null);setForm(f=>({...f,descricao:"",valor:"",subcat:""}));}
    else setShowForm(true);
  }} style={{width:"100%",marginBottom:12,padding:"11px 0",background:showForm?`${accent}18`:`linear-gradient(135deg,${accent},${accentDark})`,border:showForm?`1px solid ${accent}40`:"none",borderRadius:10,color:showForm?accent:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
    {showForm?(editingExpenseId?"✕ Cancelar edição":"✕ Cancelar"):"+ Adicionar despesa conjunta"}
  </button>

  {/* ── Formulário ── */}
  {showForm&&(
    <div style={{background:cardBg,border:`1px solid ${accent}30`,borderRadius:14,padding:"16px",marginBottom:12}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
        <div><div style={{fontSize:10,color:subtext,marginBottom:5}}>Descrição</div><input style={inp} placeholder="Ex: Prestação banco" value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}/></div>
        <div><div style={{fontSize:10,color:subtext,marginBottom:5}}>Valor total (€)</div><input style={inp} type="number" placeholder="0,00" value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))}/></div>
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
            <div><div style={{fontSize:11,color:MY_COLOR,marginBottom:4}}>{userName} (€)</div><input style={inp} type="number" value={form.splitMy} onChange={e=>setForm(f=>({...f,splitMy:e.target.value}))}/></div>
            <div><div style={{fontSize:11,color:PARTNER_COLOR,marginBottom:4}}>{partnerName} (€)</div><input style={inp} type="number" value={form.splitPartner} onChange={e=>setForm(f=>({...f,splitPartner:e.target.value}))}/></div>
          </div>
        )}
      </div>
      <div style={{marginBottom:10}}>
        <div style={{fontSize:10,color:subtext,marginBottom:6}}>Tipo</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
          {(Object.entries(TYPE_META) as [TypeKey,typeof TYPE_META[TypeKey]][]).map(([t,m])=>(
            <button key={t} onClick={()=>setForm(f=>({...f,tipo:t}))} style={{padding:"8px 4px",border:`1.5px solid ${form.tipo===t?m.color:"rgba(255,255,255,0.08)"}`,borderRadius:9,background:form.tipo===t?m.bg:"transparent",color:form.tipo===t?m.color:"#4b5563",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"'Sora',sans-serif",textAlign:"center" as const}}>{m.label}</button>
          ))}
        </div>
      </div>
      {!form.liquidado&&(
        <div style={{marginBottom:10}}>
          <div style={{fontSize:10,color:subtext,marginBottom:6}}>Quem pagou?</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <button onClick={()=>setForm(f=>({...f,pagoPor:"me"}))} style={{padding:"8px",border:`1.5px solid ${form.pagoPor==="me"?MY_COLOR:"rgba(255,255,255,0.08)"}`,borderRadius:10,background:form.pagoPor==="me"?`${MY_COLOR}18`:"rgba(255,255,255,0.03)",color:form.pagoPor==="me"?MY_COLOR:"#64748b",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Sora',sans-serif",textAlign:"center" as const}}>👤 {userName}</button>
            <button onClick={()=>setForm(f=>({...f,pagoPor:"partner"}))} style={{padding:"8px",border:`1.5px solid ${form.pagoPor==="partner"?PARTNER_COLOR:"rgba(255,255,255,0.08)"}`,borderRadius:10,background:form.pagoPor==="partner"?`${PARTNER_COLOR}18`:"rgba(255,255,255,0.03)",color:form.pagoPor==="partner"?PARTNER_COLOR:"#64748b",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Sora',sans-serif",textAlign:"center" as const}}>👤 {partnerName}</button>
          </div>
        </div>
      )}
      <div style={{marginBottom:12}}>
        <div style={{fontSize:10,color:subtext,marginBottom:6}}>Estado</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <button onClick={()=>setForm(f=>({...f,liquidado:true}))} style={{padding:"10px 8px",border:`1.5px solid ${form.liquidado?"#34d399":"rgba(255,255,255,0.08)"}`,borderRadius:10,background:form.liquidado?"rgba(52,211,153,0.1)":"rgba(255,255,255,0.03)",color:form.liquidado?"#34d399":"#64748b",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Sora',sans-serif",textAlign:"center" as const}}>✅ Liquidado</button>
          <button onClick={()=>setForm(f=>({...f,liquidado:false}))} style={{padding:"10px 8px",border:`1.5px solid ${!form.liquidado?"#f59e0b":"rgba(255,255,255,0.08)"}`,borderRadius:10,background:!form.liquidado?"rgba(245,158,11,0.1)":"rgba(255,255,255,0.03)",color:!form.liquidado?"#f59e0b":"#64748b",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Sora',sans-serif",textAlign:"center" as const}}>⏳ Por liquidar</button>
        </div>
      </div>
      <button onClick={editingExpenseId?updateExpense:addExpense} disabled={saving} style={{width:"100%",padding:"12px 0",background:`linear-gradient(135deg,${editingExpenseId?"#f59e0b":accent},${editingExpenseId?"#d97706":accentDark})`,border:"none",borderRadius:10,color:"#fff",fontWeight:700,fontSize:13,cursor:saving?"not-allowed":"pointer",fontFamily:"'Sora',sans-serif",opacity:saving?0.7:1}}>
        {saving?"A guardar...":(editingExpenseId?"✓ Guardar alterações":"+ Adicionar despesa")}
      </button>
    </div>
  )}

  {/* Filtro de datas */}
  <div style={{marginBottom:10}}>
    <div style={{display:"flex",gap:6,marginBottom:showDateFilter?8:0}}>
      <div style={{position:"relative",flex:1}}>
        <input
          style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"9px 12px 9px 34px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box" as const,outline:"none",fontFamily:"'Sora',sans-serif"}}
          placeholder="Pesquisar despesas..."
          value={searchCouple}
          onChange={e=>setSearchCouple(e.target.value)}
        />
        <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:14,pointerEvents:"none"}}>🔍</span>
        {searchCouple&&<button onClick={()=>setSearchCouple("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:subtext,cursor:"pointer",fontSize:14}}>✕</button>}
      </div>
      <button onClick={()=>setShowDateFilter(v=>!v)} style={{padding:"0 12px",background:showDateFilter||dateFrom||dateTo?`${accent}20`:"rgba(255,255,255,0.06)",border:`1px solid ${showDateFilter||dateFrom||dateTo?accent:"rgba(255,255,255,0.1)"}`,borderRadius:8,color:showDateFilter||dateFrom||dateTo?accent:subtext,fontSize:13,cursor:"pointer",whiteSpace:"nowrap" as const}}>
        📅{dateFrom||dateTo?" ✓":""}
      </button>
    </div>
    {showDateFilter&&(
      <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"10px 12px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <div>
            <div style={{fontSize:10,color:subtext,marginBottom:4}}>De</div>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,padding:"7px 10px",color:"#e2e8f0",fontSize:12,boxSizing:"border-box" as const,outline:"none",fontFamily:"'Sora',sans-serif"}}/>
          </div>
          <div>
            <div style={{fontSize:10,color:subtext,marginBottom:4}}>Até</div>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,padding:"7px 10px",color:"#e2e8f0",fontSize:12,boxSizing:"border-box" as const,outline:"none",fontFamily:"'Sora',sans-serif"}}/>
          </div>
        </div>
        {(dateFrom||dateTo)&&(()=>{
          const filtered=expenses.filter(e=>{
            const d=e.data;
            if(dateFrom&&d<dateFrom) return false;
            if(dateTo&&d>dateTo) return false;
            return true;
          });
          const total=filtered.reduce((s,e)=>s+Number(e.valor),0);
          const myTotal=filtered.reduce((s,e)=>s+(isUser1?e.split_user1:e.split_user2),0);
          return(
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:"rgba(255,255,255,0.04)",borderRadius:8}}>
              <span style={{fontSize:11,color:subtext}}>{filtered.length} despesa{filtered.length!==1?"s":""} · a tua parte</span>
              <div style={{textAlign:"right" as const}}>
                <div style={{fontSize:13,fontWeight:800,color:negative}}>{fmt(total)}</div>
                <div style={{fontSize:10,color:subtext}}>tua parte: {fmt(myTotal)}</div>
              </div>
            </div>
          );
        })()}
        <button onClick={()=>{setDateFrom("");setDateTo("");}} style={{width:"100%",marginTop:8,padding:"7px 0",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:7,color:subtext,fontSize:11,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Limpar datas</button>
      </div>
    )}
  </div>
  {/* Search — removido, integrado acima */}
  <div style={{position:"relative",marginBottom:10,display:"none"}}>
    <input
      style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"9px 12px 9px 34px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box" as const,outline:"none",fontFamily:"'Sora',sans-serif"}}
      placeholder="Pesquisar despesas..."
      value={searchCouple}
      onChange={e=>setSearchCouple(e.target.value)}
    />
    <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:14,pointerEvents:"none"}}>🔍</span>
    {searchCouple&&<button onClick={()=>setSearchCouple("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:subtext,cursor:"pointer",fontSize:14}}>✕</button>}
  </div>
  {/* ── Lista vazia ── */}
  {expenses.length===0&&!showForm&&(
    <div style={{textAlign:"center" as const,padding:"40px 0",color:subtext}}>
      <div style={{fontSize:32,marginBottom:8}}>💳</div>
      <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0",marginBottom:4}}>Sem despesas conjuntas</div>
      <div style={{fontSize:12,color:subtext}}>Adiciona a primeira despesa conjunta</div>
    </div>
  )}

  {/* ── Por liquidar ── */}
  {porLiquidar.filter(e=>{
    if(searchCouple&&!e.descricao.toLowerCase().includes(searchCouple.toLowerCase())) return false;
    if(dateFrom&&e.data<dateFrom) return false;
    if(dateTo&&e.data>dateTo) return false;
    return true;
  }).length>0&&(
    <div style={{marginBottom:16}}>
      <div style={{fontSize:10,fontWeight:700,color:"#f59e0b",textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:8}}>⏳ Por liquidar</div>
      {porLiquidar.filter(e=>{
        if(searchCouple&&!e.descricao.toLowerCase().includes(searchCouple.toLowerCase())) return false;
        if(dateFrom&&e.data<dateFrom) return false;
        if(dateTo&&e.data>dateTo) return false;
        return true;
      }).map(e=>{
        const cat=expCats.find(c=>c.id===e.cat);
        const myShare=isUser1?e.split_user1:e.split_user2;
        const ptShare=isUser1?e.split_user2:e.split_user1;
        const iPaid=e.pago_por===userId;
        return(
          <div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{width:36,height:36,borderRadius:10,background:"rgba(245,158,11,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{cat?.icon||"📦"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0",whiteSpace:"nowrap" as const,overflow:"hidden",textOverflow:"ellipsis"}}>{e.descricao}</div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                <span style={{fontSize:10,color:subtext}}>{new Date(e.data+"T12:00:00").toLocaleDateString("pt-PT")}</span>
                <span style={{fontSize:10,color:iPaid?PARTNER_COLOR:MY_COLOR,fontWeight:600}}>
                  {iPaid?`${partnerName} deve ${fmt(ptShare)}`:`deves ${fmt(myShare)}`}
                </span>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
              <span style={{fontSize:13,fontWeight:700,color:negative}}>{fmt(e.valor)}</span>
              <button onClick={()=>marcarLiquidado(e)} style={{width:28,height:28,background:"rgba(52,211,153,0.15)",border:"1px solid rgba(52,211,153,0.3)",borderRadius:7,color:"#34d399",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✓</button>
              <button onClick={()=>openEditExpense(e)} style={{width:28,height:28,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:7,color:subtext,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button>
              <button onClick={()=>deleteExpense(e)} style={{width:28,height:28,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:7,color:"#f87171",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
          </div>
        );
      })}
    </div>
  )}

  {/* ── Liquidadas ── */}
  {liquidadas.filter(e=>{
    if(searchCouple&&!e.descricao.toLowerCase().includes(searchCouple.toLowerCase())) return false;
    if(dateFrom&&e.data<dateFrom) return false;
    if(dateTo&&e.data>dateTo) return false;
    return true;
  }).length>0&&(
    <div>
      <div style={{fontSize:10,fontWeight:700,color:"#34d399",textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:8}}>✅ Liquidadas</div>
      {liquidadas.filter(e=>{
        if(searchCouple&&!e.descricao.toLowerCase().includes(searchCouple.toLowerCase())) return false;
        if(dateFrom&&e.data<dateFrom) return false;
        if(dateTo&&e.data>dateTo) return false;
        return true;
      }).map(e=>{
        const cat=expCats.find(c=>c.id===e.cat);
        const myShare=isUser1?e.split_user1:e.split_user2;
        const ptShare=isUser1?e.split_user2:e.split_user1;
        return(
          <div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:`1px solid ${cardBorder}`}}>
            <span style={{fontSize:17,minWidth:28,textAlign:"center" as const}}>{cat?.icon||"📦"}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0",whiteSpace:"nowrap" as const,overflow:"hidden",textOverflow:"ellipsis"}}>{e.descricao}</div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}>
                <span style={{fontSize:10,color:subtext}}>{new Date(e.data+"T12:00:00").toLocaleDateString("pt-PT")}</span>
                <span style={{fontSize:10,color:MY_COLOR,fontWeight:600}}>{fmt(myShare)}</span>
                <span style={{fontSize:10,color:subtext}}>·</span>
                <span style={{fontSize:10,color:PARTNER_COLOR,fontWeight:600}}>{fmt(ptShare)}</span>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
              <span style={{fontSize:13,fontWeight:700,color:negative}}>{fmt(e.valor)}</span>
              <button onClick={()=>openEditExpense(e)} style={{width:28,height:28,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:7,color:subtext,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button>
              <button onClick={()=>deleteExpense(e)} style={{width:28,height:28,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:7,color:"#f87171",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
          </div>
        );
      })}
    </div>
  )}
</>}
    </div>
  );
}
