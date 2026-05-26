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

  useEffect(()=>{ loadCouple(); },[userId,userEmail]);

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
  const tBtn=(a:boolean,cor=accent):CSSProperties=>({flex:1,padding:"9px 4px",border:"none",borderRadius:"8px 8px 0 0",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"'Sora',sans-serif",background:a?"rgba(255,255,255,0.07)":"transparent",color:a?cor:"#475569",borderBottom:a?`2px solid ${cor}`:"2px solid transparent",whiteSpace:"nowrap"});

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
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${MY_COLOR}15,${PARTNER_COLOR}10)`,border:`1px solid ${MY_COLOR}25`,borderRadius:16,padding:"16px 18px",marginBottom:14,display:"flex",alignItems:"center",gap:12}}>
        <div style={{display:"flex"}}>
          <div style={{width:40,height:40,borderRadius:"50%",background:`${MY_COLOR}25`,border:`2px solid ${MY_COLOR}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,zIndex:1}}>👤</div>
          <div style={{width:40,height:40,borderRadius:"50%",background:`${PARTNER_COLOR}25`,border:`2px solid ${PARTNER_COLOR}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,marginLeft:-12}}>👤</div>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:800,color:"#f1f5f9"}}>{userName} & {partnerName}</div>
          <div style={{fontSize:11,color:subtext,marginTop:2}}>{partnerEmail} · modo casal ativo</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
  {/* Notificações */}
  <div style={{position:"relative"}}>
    <button
      onClick={()=>setShowNotifications(v=>!v)}
      style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:18,position:"relative"}}
    >
      🔔
      {notifications.length>0&&(
        <span style={{position:"absolute",top:-4,right:-4,width:18,height:18,borderRadius:"50%",background:"#ef4444",color:"white",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>
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
              <button
                onClick={async()=>{
                  await supabase.from("notifications").update({lida:true}).eq("user_id",userId);
                  setNotifications([]);
                  setShowNotifications(false);
                }}
                style={{fontSize:11,color:accent,background:"none",border:"none",cursor:"pointer",fontFamily:"'Sora',sans-serif",fontWeight:600}}
              >
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
  </div>
  <button onClick={dissolveCouple} style={{padding:"5px 8px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:8,color:"#f87171",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>✕</button>
</div>
      </div>

      {/* Sync message */}
      {syncMsg&&(
        <div style={{background:syncMsg.includes("✓")?"rgba(52,211,153,0.1)":"rgba(245,158,11,0.1)",border:`1px solid ${syncMsg.includes("✓")?"rgba(52,211,153,0.3)":"rgba(245,158,11,0.3)"}`,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:13,color:syncMsg.includes("✓")?"#34d399":"#f59e0b",fontWeight:600}}>
          {syncMsg}
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"flex",gap:2,marginBottom:16,borderBottom:`1px solid ${cardBorder}`}}>
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
<div style={{background:"linear-gradient(135deg,rgba(0,195,122,0.08),rgba(124,58,237,0.06))",border:"1px solid rgba(0,195,122,0.2)",borderRadius:20,padding:"24px 20px",marginBottom:16}}>
  <div style={{fontSize:10,fontWeight:700,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.12em",marginBottom:8}}>Saldo Conjunto</div>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
    <div style={{fontSize:36,fontWeight:800,color:jointBalance>=0?"#f1f5f9":"#ff7d7d",letterSpacing:"-1px",lineHeight:1}}>{fmt(jointBalance)}</div>
    <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(0,195,122,0.15)",border:"1px solid rgba(0,195,122,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>💚</div>
  </div>
  <div style={{fontSize:12,color:jointBalance>=0?"rgba(0,195,122,0.8)":"rgba(255,125,125,0.8)",fontWeight:600,marginBottom:16}}>
    {totalSettledExpenses>0?`${fmt(totalContributions)} contribuições − ${fmt(totalSettledExpenses)} despesas`:`${fmt(totalContributions)} em contribuições`}
  </div>

  {/* ── Orçamento mensal ── */}
  {(()=>{
    const orcamento = Number((account as any)?.orcamento_mensal) || 0;
    const usado = totalSettledExpenses;
    const pct = orcamento > 0 ? Math.min(100, Math.round((usado / orcamento) * 100)) : 0;
    const restante = orcamento - usado;
    const overBudget = orcamento > 0 && usado > orcamento;
    return orcamento > 0 ? (
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:12,color:subtext}}>Orçamento mensal</span>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,fontWeight:700,color:overBudget?"#ff7d7d":"#34d399"}}>{pct}%</span>
            <button onClick={()=>{setEditOrcamento(true);setOrcamentoInput(String(orcamento));}} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"3px 8px",color:subtext,fontSize:11,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>✏️</button>
          </div>
        </div>
        <div style={{height:8,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"hidden",marginBottom:8}}>
          <div style={{width:`${pct}%`,height:"100%",borderRadius:99,background:overBudget?"linear-gradient(90deg,#ff7d7d,#ef4444)":"linear-gradient(90deg,#34d399,#00c37a)",transition:"width 0.5s ease"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <span style={{fontSize:11,color:overBudget?"#ff7d7d":subtext}}>{overBudget?`⚠️ Excedido em ${fmt(Math.abs(restante))}`:`Restam ${fmt(restante)}`}</span>
          <span style={{fontSize:11,color:subtext}}>{fmt(usado)} / {fmt(orcamento)}</span>
        </div>
      </div>
    ) : (
      <button onClick={()=>{setEditOrcamento(true);setOrcamentoInput("");}} style={{width:"100%",padding:"10px 0",background:"rgba(255,255,255,0.04)",border:"1px dashed rgba(255,255,255,0.15)",borderRadius:10,color:subtext,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif",marginBottom:16}}>
        + Definir orçamento mensal conjunto
      </button>
    );
  })()}

  {/* Modal editar orçamento */}
  {editOrcamento&&(
    <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"14px",marginBottom:16}}>
      <div style={{fontSize:12,color:subtext,marginBottom:8}}>Orçamento mensal conjunto (€)</div>
      <div style={{display:"flex",gap:8}}>
        <input
          style={{...inp,flex:1}}
          type="number"
          placeholder="Ex: 2000"
          value={orcamentoInput}
          onChange={e=>setOrcamentoInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&saveOrcamento()}
          autoFocus
        />
        <button onClick={saveOrcamento} style={{padding:"10px 16px",background:`linear-gradient(135deg,${accent},${accentDark})`,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>✓</button>
        <button onClick={()=>setEditOrcamento(false)} style={{padding:"10px 12px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:subtext,fontSize:13,cursor:"pointer"}}>✕</button>
      </div>
    </div>
  )}

  <div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
    <span style={{fontSize:12,color:subtext}}>Contribuições este mês</span>
    <span style={{fontSize:13,fontWeight:700,color:"rgba(0,195,122,0.9)"}}>{fmt(totalContributions)}</span>
  </div>
</div>

  {/* ── Contribuições ── */}
  {!editContrib?(
    <>
      <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginBottom:12}}>Contribuições do mês</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {[
          {nome:userName,cor:MY_COLOR,contrib:isUser1?account?.contribuicao_user1:account?.contribuicao_user2,initials:userName.slice(0,2).toUpperCase()},
          {nome:partnerName,cor:PARTNER_COLOR,contrib:isUser1?account?.contribuicao_user2:account?.contribuicao_user1,initials:partnerName.slice(0,2).toUpperCase()}
        ].map((p,i)=>{
          const total=(account?.contribuicao_user1||0)+(account?.contribuicao_user2||0);
          const pct=total>0?Math.round(((p.contrib||0)/total)*100):50;
          return(
            <div key={i} style={{background:"rgba(255,255,255,0.04)",border:`1px solid rgba(255,255,255,0.08)`,borderRadius:16,padding:"16px 14px"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:`${p.cor}25`,border:`2px solid ${p.cor}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:p.cor,flexShrink:0}}>{p.initials}</div>
                <span style={{fontSize:13,fontWeight:600,color:"#f1f5f9"}}>{p.nome}</span>
              </div>
              <div style={{fontSize:22,fontWeight:800,color:p.cor,marginBottom:4}}>{fmt(p.contrib||0)}</div>
              <div style={{fontSize:11,color:subtext,marginBottom:10}}>{pct}% do total</div>
              <div style={{height:3,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"hidden"}}>
                <div style={{width:`${pct}%`,height:"100%",background:p.cor,borderRadius:99}}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Status ── */}
      {(()=>{
        const c1=account?.contribuicao_user1||0;
        const c2=account?.contribuicao_user2||0;
        const balanced=Math.abs(c1-c2)<1;
        return(
          <div style={{background:balanced?"rgba(0,195,122,0.08)":"rgba(245,158,11,0.08)",border:`1px solid ${balanced?"rgba(0,195,122,0.2)":"rgba(245,158,11,0.2)"}`,borderRadius:14,padding:"14px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:balanced?"rgba(0,195,122,0.15)":"rgba(245,158,11,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{balanced?"⚖️":"⚠️"}</div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:balanced?"#34d399":"#f59e0b",marginBottom:2}}>{balanced?"Tudo certo! 🎉":"Contribuições desequilibradas"}</div>
              <div style={{fontSize:12,color:subtext}}>{balanced?"As contribuições estão equilibradas. Mantenham o bom trabalho!":"Considera ajustar as contribuições mensais."}</div>
            </div>
          </div>
        );
      })()}

      <div style={{display:"flex",flexDirection:"column" as const,gap:10,marginBottom:14}}>
        <button onClick={()=>setTab("acerto")} style={{width:"100%",padding:"14px 0",background:"linear-gradient(135deg,#00c37a,#00a86b)",border:"none",borderRadius:14,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Sora',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          ⇄ Acertar contas
        </button>
        <button onClick={()=>{setEditContrib(true);setMyContrib(String(isUser1?account?.contribuicao_user1||0:account?.contribuicao_user2||0));setPartnerContrib(String(isUser1?account?.contribuicao_user2||0:account?.contribuicao_user1||0));}} style={{width:"100%",padding:"13px 0",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:14,color:"#e2e8f0",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          ✏️ Editar contribuições
        </button>
      </div>
    </>
        ):(
          <div style={{background:cardBg,border:`1px solid ${cardBorder}`,borderRadius:12,padding:"14px",marginBottom:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <div><div style={{fontSize:11,color:MY_COLOR,marginBottom:4}}>{userName} (€/mês)</div><input style={inp} type="number" value={myContrib} onChange={e=>setMyContrib(e.target.value)}/></div>
              <div><div style={{fontSize:11,color:PARTNER_COLOR,marginBottom:4}}>{partnerName} (€/mês)</div><input style={inp} type="number" value={partnerContrib} onChange={e=>setPartnerContrib(e.target.value)}/></div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={saveContrib} style={{flex:1,padding:"9px 0",background:`linear-gradient(135deg,${accent},${accentDark})`,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Guardar</button>
              <button onClick={()=>setEditContrib(false)} style={{padding:"9px 14px",background:"rgba(255,255,255,0.05)",border:`1px solid ${cardBorder}`,borderRadius:8,color:subtext,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Cancelar</button>
            </div>
          </div>
        )}
        {/* Resumo rápido */}
        {porLiquidar.length>0&&(
          <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:12,padding:"12px 16px",marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:700,color:"#f59e0b",marginBottom:4}}>⏳ {porLiquidar.length} despesa{porLiquidar.length>1?"s":""} por liquidar</div>
            <div style={{fontSize:12,color:subtext}}>A tua parte pendente: <span style={{color:"#f59e0b",fontWeight:700}}>{fmt(myDebt)}</span></div>
          </div>
        )}

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
          const catMap:Record<string,{total:number;prev:number;icon:string;label:string}> = {};
          thisMonthExp.forEach(e=>{
            const cat=expCats.find(c=>c.id===e.cat);
            if(!catMap[e.cat]) catMap[e.cat]={total:0,prev:0,icon:cat?.icon||"📦",label:cat?.label||e.cat};
            catMap[e.cat].total+=Number(e.valor);
          });
          prevMonthExp.forEach(e=>{
            if(!catMap[e.cat]) catMap[e.cat]={total:0,prev:0,icon:expCats.find(c=>c.id===e.cat)?.icon||"📦",label:expCats.find(c=>c.id===e.cat)?.label||e.cat};
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
                        <div style={{width:`${Math.round((c.total/maxVal)*100)}%`,height:"100%",borderRadius:99,background:`linear-gradient(90deg,${accent},${accentDark})`}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}

        {/* Despesas liquidadas recentes */}
        <div style={{background:cardBg,border:`1px solid ${cardBorder}`,borderRadius:12,padding:"14px 16px"}}>
          <div style={{fontSize:10,fontWeight:700,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:12}}>Despesas liquidadas recentes</div>
          {liquidadas.length===0?<div style={{textAlign:"center" as const,color:subtext,fontSize:13,padding:"12px 0"}}>Sem despesas liquidadas.</div>
          :liquidadas.slice(0,5).map(e=>{
            const cat=expCats.find(c=>c.id===e.cat);
            const myShare=isUser1?e.split_user1:e.split_user2;
            return(
              <div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:`1px solid ${cardBorder}`}}>
                <span style={{fontSize:18}}>{cat?.icon||"📦"}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{e.descricao}</div>
                  <div style={{fontSize:10,color:subtext}}>A tua parte: <span style={{color:MY_COLOR,fontWeight:700}}>{fmt(myShare)}</span> · <span style={{color:"#34d399"}}>✓ Liquidado</span></div>
                </div>
                <span style={{fontSize:13,fontWeight:700,color:negative}}>{fmt(e.valor)}</span>
              </div>
            );
          })}
        </div>
      </>}

      {/* ── DESPESAS ── */}
      {tab==="despesas"&&<>
  {successMsg&&(
    <div style={{background:"rgba(52,211,153,0.12)",border:"1px solid rgba(52,211,153,0.3)",borderRadius:12,padding:"12px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:18}}>✅</span>
      <span style={{fontSize:13,fontWeight:700,color:"#34d399"}}>{successMsg}</span>
    </div>
  )}
  {/* ── Resumo do acerto (quando há pendentes) ── */}
  {porLiquidar.length>0&&(()=>{
    const totalOwedByPartner = porLiquidar.filter(e=>e.pago_por===userId).reduce((s,e)=>s+(isUser1?e.split_user2:e.split_user1),0);
    const totalOwedByMe = porLiquidar.filter(e=>e.pago_por!==userId).reduce((s,e)=>s+(isUser1?e.split_user1:e.split_user2),0);
    const net = totalOwedByPartner - totalOwedByMe;
    return(
      <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"16px",marginBottom:14,textAlign:"center" as const}}>
        <div style={{fontSize:10,fontWeight:700,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:8}}>Resumo do acerto</div>
        {net>0?(
          <><div style={{fontSize:12,color:PARTNER_COLOR,marginBottom:4}}>{partnerName} deve-te no total</div>
          <div style={{fontSize:26,fontWeight:800,color:PARTNER_COLOR,marginBottom:14}}>{fmt(net)}</div></>
        ):net<0?(
          <><div style={{fontSize:12,color:MY_COLOR,marginBottom:4}}>Deves a {partnerName} no total</div>
          <div style={{fontSize:26,fontWeight:800,color:MY_COLOR,marginBottom:14}}>{fmt(Math.abs(net))}</div></>
        ):(
          <div style={{fontSize:14,fontWeight:700,color:"#34d399",marginBottom:14}}>✓ Estão empatados!</div>
        )}
        <button
          onClick={async()=>{
            if(!window.confirm(`Marcar todas as ${porLiquidar.length} despesas como liquidadas?`)) return;
            for(const e of porLiquidar){ await marcarLiquidado(e); }
          }}
          style={{width:"100%",padding:"13px 0",background:"linear-gradient(135deg,#34d399,#059669)",border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"'Sora',sans-serif",boxShadow:"0 4px 20px rgba(52,211,153,0.3)"}}>
          ✓ Liquidar tudo de uma vez ({porLiquidar.length} despesa{porLiquidar.length>1?"s":""})
        </button>
      </div>
    );
  })()}

  {/* ── Botão adicionar ── */}
  <button onClick={()=>{
    if(showForm){setShowForm(false);setEditingExpenseId(null);setForm(f=>({...f,descricao:"",valor:"",subcat:""}));}
    else setShowForm(true);
  }} style={{width:"100%",marginBottom:14,padding:"11px 0",background:showForm?`${accent}18`:`linear-gradient(135deg,${accent},${accentDark})`,border:showForm?`1px solid ${accent}40`:"none",borderRadius:10,color:showForm?accent:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
    {showForm?(editingExpenseId?"✕ Cancelar edição":"✕ Cancelar"):"+ Adicionar despesa conjunta"}
  </button>

  {/* ── Formulário ── */}
  {showForm&&(
    <div style={{background:cardBg,border:`1px solid ${accent}30`,borderRadius:14,padding:"16px",marginBottom:14}}>
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
      <div style={{marginBottom:12}}>
        <div style={{fontSize:10,color:subtext,marginBottom:5}}>Tipo</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
          {(Object.entries(TYPE_META) as [TypeKey,typeof TYPE_META[TypeKey]][]).map(([t,m])=>(
            <button key={t} onClick={()=>setForm(f=>({...f,tipo:t}))} style={{padding:"8px 4px",border:`1.5px solid ${form.tipo===t?m.color:"rgba(255,255,255,0.08)"}`,borderRadius:9,background:form.tipo===t?m.bg:"transparent",color:form.tipo===t?m.color:"#4b5563",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"'Sora',sans-serif",textAlign:"center" as const}}>{m.label}</button>
          ))}
        </div>
      </div>
      {!form.liquidado&&<div style={{marginBottom:12}}>
        <div style={{fontSize:10,color:subtext,marginBottom:8}}>Quem pagou?</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <button onClick={()=>setForm(f=>({...f,pagoPor:"me"}))} style={{padding:"10px 8px",border:`1.5px solid ${form.pagoPor==="me"?MY_COLOR:"rgba(255,255,255,0.08)"}`,borderRadius:12,background:form.pagoPor==="me"?`${MY_COLOR}18`:"rgba(255,255,255,0.04)",color:form.pagoPor==="me"?MY_COLOR:"#64748b",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Sora',sans-serif",textAlign:"center" as const}}>
            <div style={{fontSize:18,marginBottom:4}}>👤</div><div>{userName}</div>
          </button>
          <button onClick={()=>setForm(f=>({...f,pagoPor:"partner"}))} style={{padding:"10px 8px",border:`1.5px solid ${form.pagoPor==="partner"?PARTNER_COLOR:"rgba(255,255,255,0.08)"}`,borderRadius:12,background:form.pagoPor==="partner"?`${PARTNER_COLOR}18`:"rgba(255,255,255,0.04)",color:form.pagoPor==="partner"?PARTNER_COLOR:"#64748b",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Sora',sans-serif",textAlign:"center" as const}}>
            <div style={{fontSize:18,marginBottom:4}}>👤</div><div>{partnerName}</div>
          </button>
        </div>
      </div>}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:10,color:subtext,marginBottom:8}}>Estado do pagamento</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <button onClick={()=>setForm(f=>({...f,liquidado:true}))} style={{padding:"12px 8px",border:`1.5px solid ${form.liquidado?"#34d399":"rgba(255,255,255,0.08)"}`,borderRadius:12,background:form.liquidado?"rgba(52,211,153,0.12)":"rgba(255,255,255,0.04)",color:form.liquidado?"#34d399":"#64748b",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Sora',sans-serif",textAlign:"center" as const}}>
            <div style={{fontSize:20,marginBottom:4}}>✅</div>
            <div>Liquidado</div>
            <div style={{fontSize:10,fontWeight:400,marginTop:2,opacity:.8}}>Regista nas contas pessoais</div>
          </button>
          <button onClick={()=>setForm(f=>({...f,liquidado:false}))} style={{padding:"12px 8px",border:`1.5px solid ${!form.liquidado?"#f59e0b":"rgba(255,255,255,0.08)"}`,borderRadius:12,background:!form.liquidado?"rgba(245,158,11,0.12)":"rgba(255,255,255,0.04)",color:!form.liquidado?"#f59e0b":"#64748b",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Sora',sans-serif",textAlign:"center" as const}}>
            <div style={{fontSize:20,marginBottom:4}}>⏳</div>
            <div>Por liquidar</div>
            <div style={{fontSize:10,fontWeight:400,marginTop:2,opacity:.8}}>Aparece no resumo acima</div>
          </button>
        </div>
      </div>
      <button onClick={editingExpenseId?updateExpense:addExpense} disabled={saving} style={{width:"100%",padding:"11px 0",background:`linear-gradient(135deg,${editingExpenseId?"#f59e0b":accent},${editingExpenseId?"#d97706":accentDark})`,border:"none",borderRadius:9,color:"#fff",fontWeight:700,fontSize:13,cursor:saving?"not-allowed":"pointer",fontFamily:"'Sora',sans-serif",opacity:saving?0.7:1}}>
        {saving?"A guardar...":(editingExpenseId?"✓ Guardar alterações":"+ Adicionar despesa")}
      </button>
    </div>
  )}

  {/* ── Lista despesas ── */}
  {expenses.length===0&&!showForm&&(
    <div style={{textAlign:"center" as const,padding:"32px 0",color:subtext}}>
      <div style={{fontSize:32,marginBottom:10}}>💳</div>
      <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0",marginBottom:4}}>Sem despesas conjuntas</div>
    </div>
  )}

  {/* Por liquidar */}
  {porLiquidar.length>0&&(
    <>
      <div style={{fontSize:11,fontWeight:700,color:"#f59e0b",textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:8}}>⏳ Por liquidar</div>
      {porLiquidar.map(e=>{
        const cat=expCats.find(c=>c.id===e.cat);
        const myShare=isUser1?e.split_user1:e.split_user2;
        const ptShare=isUser1?e.split_user2:e.split_user1;
        return(
          <div key={e.id} style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:12,padding:"12px 14px",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8}}>
              <div style={{width:36,height:36,borderRadius:10,background:"rgba(245,158,11,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{cat?.icon||"📦"}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:"#e2e8f0"}}>{e.descricao}</div>
                <div style={{fontSize:10,color:subtext}}>{new Date(e.data+"T12:00:00").toLocaleDateString("pt-PT")}</div>
              </div>
              <div style={{fontSize:15,fontWeight:800,color:negative}}>{fmt(e.valor)}</div>
            </div>
            {(()=>{
              const iPaid=e.pago_por===userId;
              const paidByName=iPaid?userName:partnerName;
              const owedAmount=iPaid?ptShare:myShare;
              const owedByName=iPaid?partnerName:userName;
              const owedColor=iPaid?PARTNER_COLOR:MY_COLOR;
              return(
                <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"10px 12px",marginBottom:10}}>
                  <div style={{fontSize:11,color:subtext,marginBottom:6}}>💳 Pago por <strong style={{color:iPaid?MY_COLOR:PARTNER_COLOR}}>{paidByName}</strong></div>
                  <div style={{background:`${owedColor}15`,borderRadius:8,padding:"8px 10px",textAlign:"center" as const}}>
                    <div style={{fontSize:10,color:owedColor,fontWeight:600,marginBottom:2}}>{owedByName} deve a {paidByName}</div>
                    <div style={{fontSize:18,fontWeight:800,color:owedColor}}>{fmt(owedAmount)}</div>
                  </div>
                </div>
              );
            })()}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>marcarLiquidado(e)} style={{flex:1,padding:"8px 0",background:"rgba(52,211,153,0.15)",border:"1px solid rgba(52,211,153,0.3)",borderRadius:9,color:"#34d399",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>✓ Liquidar</button>
              <button onClick={()=>openEditExpense(e)} style={{padding:"8px 12px",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:9,color:"#f59e0b",fontSize:12,cursor:"pointer"}}>✏️</button>
              <button onClick={()=>deleteExpense(e)} style={{padding:"8px 12px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:9,color:"#f87171",fontSize:12,cursor:"pointer"}}>🗑️</button>
            </div>
          </div>
        );
      })}
    </>
  )}

  {/* Liquidadas */}
  {liquidadas.length>0&&(
    <>
      <div style={{fontSize:11,fontWeight:700,color:"#34d399",textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:8,marginTop:porLiquidar.length>0?16:0}}>✅ Liquidadas</div>
      {liquidadas.map(e=>{
        const cat=expCats.find(c=>c.id===e.cat);
        const myShare=isUser1?e.split_user1:e.split_user2;
        const ptShare=isUser1?e.split_user2:e.split_user1;
        return(
          <div key={e.id} style={{background:cardBg,border:`1px solid ${cardBorder}`,borderRadius:12,padding:"12px 14px",marginBottom:10,opacity:.8}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <span style={{fontSize:18}}>{cat?.icon||"📦"}</span>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{e.descricao}</div>
                  <span style={{fontSize:10,background:"rgba(52,211,153,0.15)",color:"#34d399",padding:"1px 6px",borderRadius:99,fontWeight:700}}>👫 pessoal</span>
                </div>
                <div style={{fontSize:10,color:subtext}}>{new Date(e.data+"T12:00:00").toLocaleDateString("pt-PT")}</div>
              </div>
              <span style={{fontSize:13,fontWeight:700,color:negative}}>{fmt(e.valor)}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
              <div style={{background:`${MY_COLOR}10`,borderRadius:8,padding:"5px 10px",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:MY_COLOR}}>{userName}</span><span style={{fontSize:11,fontWeight:700,color:MY_COLOR}}>{fmt(myShare)}</span></div>
              <div style={{background:`${PARTNER_COLOR}10`,borderRadius:8,padding:"5px 10px",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:PARTNER_COLOR}}>{partnerName}</span><span style={{fontSize:11,fontWeight:700,color:PARTNER_COLOR}}>{fmt(ptShare)}</span></div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>openEditExpense(e)} style={{flex:1,padding:"7px 0",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:9,color:"#f59e0b",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>✏️ Editar</button>
              <button onClick={()=>deleteExpense(e)} style={{flex:1,padding:"7px 0",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:9,color:"#f87171",fontSize:12,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>🗑️ Apagar</button>
            </div>
          </div>
        );
      })}
    </>
  )}
</>}
{/* ── RECORRENTES ── */}
{tab==="recorrentes"&&couple&&(
  <CoupleRecurring
    coupleId={couple.id}
    isUser1={isUser1}
    userName={userName}
    partnerName={partnerName}
    expCats={expCats}
    accent={accent}
    accentDark={accentDark}
    cardBg={cardBg}
    cardBorder={cardBorder}
    subtext={subtext}
    negative={negative}
    items={recurringItems}
    setItems={setRecurringItems}
    onApplyDue={async (r) => {
      const total = Number(r.valor);
      const s1 = r.split_user1 || total / 2;
      const s2 = r.split_user2 || total / 2;
      const {data, error} = await supabase.from("couple_expenses").insert({
        couple_id: couple.id,
        created_by: userId,
        descricao: r.descricao,
        valor: total,
        cat: r.cat,
        subcat: "",
        tipo: r.tipo,
        data: new Date().toISOString().slice(0,10),
        split_user1: s1,
        split_user2: s2,
        pago_por: userId,
        liquidado: r.liquidado_auto,
      }).select().single();
      if(!error && data) {
        setExpenses(p => [data as CoupleExpense, ...p]);
        if(r.liquidado_auto) await syncToPersonal(data as CoupleExpense);
      }
    }}
  />
)}
</div>
);
}