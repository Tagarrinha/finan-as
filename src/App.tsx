import { useState, useMemo, useEffect, ReactNode, CSSProperties } from "react";
import { createClient, User as SBUser } from "@supabase/supabase-js";
import RecurringExpenses, { RecurringExpense } from "./RecurringExpenses";
import SavingsGoals, { SavingsGoal } from "./SavingsGoals";
import MonthComparison from "./MonthComparison";
import CoupleMode from "./CoupleMode";

const SUPA_URL = "https://aiifzqmwnnfnrwmacyxq.supabase.co";
const SUPA_KEY = "sb_publishable_GaZqBKcZGXJagV9mLnM1Zw_3Dq3wm6g";
const supabase = createClient(SUPA_URL, SUPA_KEY);

type TypeKey = "necessidade"|"desejo"|"investimento";
type ThemeKey = "original"|"aurora"|"ocean"|"nebula";
interface ExpCat    { id:string; label:string; icon:string; type:TypeKey; sub?:string[]; custom?:boolean; }
interface IncCat    { id:string; label:string; icon:string; custom?:boolean; }
interface Expense   { id:number; descricao:string; valor:number; cat:string; subcat:string; data:string; tipo:TypeKey; world:string; }
interface Income    { id:number; descricao:string; valor:number; cat:string; data:string; world:string; }
interface BankAccount { id:number; nome:string; tipo:"corrente"|"poupanca"|"investimento"|"outro"; saldo:number; icon:string; cor:string; }
interface Transfer  { id:number; from_account_id:number; to_account_id:number; valor:number; descricao:string; data:string; }
interface BudgetTargets { necessidade:number; desejo:number; investimento:number; }
interface AppTheme  { name:string; emoji:string; root:string; header:string; accent:string; accentDark:string; accent2:string; positive:string; negative:string; subtext:string; worldBtn:string; cardBg:string; cardBorder:string; glow1:string; glow2:string; }

const THEMES: Record<ThemeKey,AppTheme> = {
  original: { name:"Original",emoji:"🟠", root:"#080810", header:"linear-gradient(135deg,#1a0c08,#2d150a)", accent:"#f97316", accentDark:"#c2410c", accent2:"#ef4444", positive:"#34d399", negative:"#fb7185", subtext:"#475569", worldBtn:"linear-gradient(135deg,#f97316,#ef4444)", cardBg:"rgba(255,255,255,0.04)", cardBorder:"rgba(255,255,255,0.07)", glow1:"rgba(249,115,22,0.12)", glow2:"rgba(52,211,153,0.08)" },
  aurora:   { name:"Aurora",  emoji:"🟢", root:"#050d12", header:"linear-gradient(135deg,#0a1f1a,#0f2d1f)", accent:"#00d4aa", accentDark:"#00a884", accent2:"#7c3aed", positive:"#00d4aa", negative:"#ff6b9d", subtext:"#4a7a6d", worldBtn:"linear-gradient(135deg,#00d4aa,#7c3aed)", cardBg:"rgba(0,212,170,0.04)", cardBorder:"rgba(0,212,170,0.1)", glow1:"rgba(0,212,170,0.12)", glow2:"rgba(124,58,237,0.08)" },
  ocean:    { name:"Ocean",   emoji:"🔵", root:"#030d14", header:"linear-gradient(135deg,#061828,#091f30)", accent:"#00c8ff", accentDark:"#0066ff", accent2:"#0066ff", positive:"#00e5b3", negative:"#ff4f7b", subtext:"#2a6080", worldBtn:"linear-gradient(135deg,#00c8ff,#0066ff)", cardBg:"rgba(0,200,255,0.04)", cardBorder:"rgba(0,200,255,0.1)", glow1:"rgba(0,200,255,0.13)", glow2:"rgba(0,102,255,0.08)" },
  nebula:   { name:"Nebula",  emoji:"🟣", root:"#07050f", header:"linear-gradient(135deg,#110a22,#160d2e)", accent:"#b06eff", accentDark:"#7c3aed", accent2:"#4fc3f7", positive:"#64ffda", negative:"#ff5c8d", subtext:"#5a4080", worldBtn:"linear-gradient(135deg,#b06eff,#4fc3f7)", cardBg:"rgba(176,110,255,0.04)", cardBorder:"rgba(176,110,255,0.1)", glow1:"rgba(176,110,255,0.13)", glow2:"rgba(79,195,247,0.08)" },
};

const BASE_PERSONAL_EXP: ExpCat[] = [
  { id:"casa",         label:"Casa",               icon:"🏠", sub:["Prestação banco","Seguro de vida","Seguro multiriscos","Condomínio","Água","Luz","TV","Outros"], type:"necessidade" },
  { id:"supermercado", label:"Supermercado",        icon:"🛒", type:"necessidade" },
  { id:"restaurantes", label:"Restaurantes",        icon:"🍽️", type:"desejo" },
  { id:"combustivel",  label:"Combustível",         icon:"⛽", type:"necessidade" },
  { id:"carro",        label:"Carro",               icon:"🚗", type:"necessidade" },
  { id:"barbeiro",     label:"Barbeiro / Depilação",icon:"✂️", type:"desejo" },
  { id:"ginasio",      label:"Ginásio / Desporto",  icon:"🏋️", type:"desejo" },
  { id:"saude",        label:"Saúde",               icon:"🏥", type:"necessidade" },
  { id:"compras",      label:"Compras",             icon:"🛍️", type:"desejo" },
  { id:"prendas",      label:"Prendas",             icon:"🎁", type:"desejo" },
  { id:"viagens",      label:"Viagens",             icon:"✈️", type:"desejo" },
  { id:"educacao",     label:"Educação",            icon:"📚", type:"investimento" },
  { id:"outros_p",     label:"Outros",              icon:"📦", type:"desejo" },
];
const BASE_PERSONAL_INC: IncCat[] = [
  { id:"salario",   label:"Salário",         icon:"💼" },
  { id:"refeicao",  label:"Cartão Refeição", icon:"🍱" },
  { id:"clinica",   label:"Clínica Privada", icon:"🏥" },
  { id:"prendas_r", label:"Prendas",         icon:"🎁" },
  { id:"outros_r",  label:"Outros",          icon:"📦" },
];
const BASE_CLINIC_EXP: ExpCat[] = [
  { id:"renda",         label:"Renda / Espaço",  icon:"🏢", type:"necessidade" },
  { id:"equipamento",   label:"Equipamento",      icon:"🩺", type:"investimento" },
  { id:"consumiveis",   label:"Consumíveis",      icon:"🧴", type:"necessidade" },
  { id:"marketing",     label:"Marketing",        icon:"📣", type:"investimento" },
  { id:"contabilidade", label:"Contabilidade",    icon:"📋", type:"necessidade" },
  { id:"seguros_c",     label:"Seguros",          icon:"🛡️", type:"necessidade" },
  { id:"formacao_c",    label:"Formação",         icon:"📚", type:"investimento" },
  { id:"software",      label:"Software / Tech",  icon:"💻", type:"investimento" },
  { id:"outros_c",      label:"Outros",           icon:"📦", type:"necessidade" },
];
const BASE_CLINIC_INC: IncCat[] = [
  { id:"consultas",   label:"Consultas",   icon:"🧑‍⚕️" },
  { id:"seguradoras", label:"Seguradoras", icon:"🛡️" },
  { id:"workshops",   label:"Workshops",   icon:"📣" },
  { id:"outros_ci",   label:"Outros",      icon:"📦" },
];

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const DEFAULT_BUDGET: BudgetTargets = { necessidade:75, desejo:10, investimento:15 };
const TYPE_META: Record<TypeKey,{label:string;color:string;bg:string;icon:string}> = {
  necessidade: {label:"Necessidade",color:"#3b82f6",bg:"#1e3a5f33",icon:"🏠"},
  desejo:      {label:"Desejo",     color:"#f59e0b",bg:"#78350f33",icon:"✨"},
  investimento:{label:"Investimento",color:"#10b981",bg:"#064e3b33",icon:"📈"},
};
const TIPO_ACC: Record<BankAccount["tipo"],{label:string;icon:string;cor:string}> = {
  corrente:    {label:"Conta Corrente",    icon:"💳",cor:"#3b82f6"},
  poupanca:    {label:"Conta Poupança",    icon:"🏦",cor:"#10b981"},
  investimento:{label:"Conta Investimento",icon:"📈",cor:"#a78bfa"},
  outro:       {label:"Outra Conta",       icon:"📂",cor:"#f59e0b"},
};
const TOUR_STEPS = [
  { title:"Olá! 👋",                    desc:"Bem-vindo! Faz este tour rápido para perceberes como tudo funciona.", anchor:"middle", pwa:false },
  { title:"Os teus mundos 🌍",           desc:"Alterna entre finanças pessoais e negócio. Cada um tem dados completamente separados.", anchor:"top", pwa:false },
  { title:"Resumo 📊",                   desc:"Vês o teu balanço em tempo real — rendimento, despesas, resultado e contas bancárias.", anchor:"middle", pwa:false },
  { title:"Metas orçamentais 🎯",         desc:"Controla se estás dentro dos limites: 75% necessidades, 10% desejos, 15% investimentos.", anchor:"middle", pwa:false },
  { title:"Despesas recorrentes 🔄",      desc:"Regista despesas fixas como renda ou ginásio uma vez — a app avisa quando é altura de as registar.", anchor:"middle", pwa:false },
  { title:"Menu ⚙️",                     desc:"Personaliza contas bancárias, categorias, tema e nome dos mundos.", anchor:"top", pwa:false },
  { title:"Instala a app 📱",            desc:"", anchor:"middle", pwa:true },
  { title:"Tudo pronto! 🎉",             desc:"Os dados ficam na cloud — acedes de qualquer dispositivo. Vai ao ⚙️ para personalizar tudo.", anchor:"middle", pwa:false },
];

const fmt = (n:number) => new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR"}).format(n||0);
const pct = (part:number,total:number) => total>0?Math.round((part/total)*100):0;

function Tour({userName,accent,onFinish}:{userName:string;accent:string;onFinish:()=>void}) {
  const [step,setStep]=useState(0);
  const cur=TOUR_STEPS[step];
  const isLast=step===TOUR_STEPS.length-1;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return (
    <>
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:100,pointerEvents:"none"}}/>
      <div style={{position:"fixed",zIndex:101,left:"50%",transform:"translateX(-50%)",bottom:cur.anchor==="top"?"auto":80,top:cur.anchor==="top"?140:"auto",width:"calc(100% - 40px)",maxWidth:360,background:"#13141f",border:`1px solid ${accent}50`,borderRadius:20,padding:"22px 22px 18px",boxShadow:`0 8px 40px rgba(0,0,0,0.6)`,fontFamily:"'Sora',sans-serif"}}>
        <div style={{display:"flex",gap:5,marginBottom:16}}>
          {TOUR_STEPS.map((_,i)=><div key={i} style={{height:4,flex:1,borderRadius:99,background:i<=step?accent:"rgba(255,255,255,0.1)",transition:"background .3s"}}/>)}
        </div>
        {step===0?(
          <div style={{textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:36,marginBottom:10}}>👋</div>
            <div style={{fontSize:18,fontWeight:800,color:"#f1f5f9",marginBottom:6}}>Olá, {userName}!</div>
            <div style={{fontSize:13,color:"#64748b",lineHeight:1.6}}>Bem-vindo à tua app de finanças pessoais. Faz este tour para perceber como tudo funciona.</div>
          </div>
        ):cur.pwa?(
          <div style={{marginBottom:16}}>
            <div style={{fontSize:15,fontWeight:800,color:"#f1f5f9",marginBottom:8}}>Instala a app no telemóvel 📱</div>
            <div style={{fontSize:13,color:"#94a3b8",marginBottom:14,lineHeight:1.6}}>Adiciona o FinTrack ao ecrã inicial — funciona como uma app nativa, sem precisar de app store!</div>
            {/* iOS */}
            <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"12px 14px",marginBottom:8}}>
              <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:8}}>🍎 iPhone / iPad (Safari)</div>
              {[
                {icon:"📤", text:"Toca no ícone de partilha em baixo"},
                {icon:"➕", text:"\"Adicionar ao ecrã de início\""},
                {icon:"✅", text:"Toca em \"Adicionar\" — pronto!"},
              ].map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <div style={{width:28,height:28,borderRadius:8,background:`${accent}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{s.icon}</div>
                  <span style={{fontSize:12,color:"#cbd5e1"}}>{s.text}</span>
                </div>
              ))}
            </div>
            {/* Android */}
            <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"12px 14px"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:8}}>🤖 Android (Chrome)</div>
              {[
                {icon:"⋮", text:"Toca nos 3 pontos no canto superior"},
                {icon:"➕", text:"\"Adicionar ao ecrã principal\""},
                {icon:"✅", text:"Confirma — o ícone aparece!"},
              ].map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <div style={{width:28,height:28,borderRadius:8,background:`${accent}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{s.icon}</div>
                  <span style={{fontSize:12,color:"#cbd5e1"}}>{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        ):(
          <>
            <div style={{fontSize:15,fontWeight:800,color:"#f1f5f9",marginBottom:8}}>{cur.title}</div>
            <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.6,marginBottom:16}}>{cur.desc}</div>
          </>
        )}
        {isLast&&<div style={{background:`${accent}15`,border:`1px solid ${accent}30`,borderRadius:12,padding:"10px 14px",marginBottom:16}}><div style={{fontSize:12,color:accent,fontWeight:600}}>💡 Vai ao ⚙️ para personalizar o tema, os mundos e as categorias!</div></div>}
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {step>0&&<button onClick={()=>setStep(s=>s-1)} style={{padding:"10px 14px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,color:"#64748b",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>←</button>}
          <button onClick={()=>isLast?onFinish():setStep(s=>s+1)} style={{flex:1,padding:"11px 0",background:`linear-gradient(135deg,${accent},${accent}aa)`,border:"none",borderRadius:10,color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
            {isLast?"Começar →":step===0?"Iniciar tour →":"Próximo →"}
          </button>
          {!isLast&&step>0&&<button onClick={onFinish} style={{padding:"10px 14px",background:"transparent",border:"none",color:"#374151",fontSize:12,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Saltar</button>}
        </div>
      </div>
    </>
  );
}

function ProgressBar({value,max,color,height=6}:{value:number;max:number;color:string;height?:number}) {
  const p=max>0?Math.min(100,Math.round(value/max*100)):0;
  return <div style={{height,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"hidden"}}><div style={{width:`${p}%`,height:"100%",background:color,borderRadius:99,transition:"width .5s ease"}}/></div>;
}
function Tag({type}:{type:string}) {
  const m=TYPE_META[type as TypeKey];
  if(!m) return null;
  return <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:m.bg,color:m.color,whiteSpace:"nowrap"}}>{m.label}</span>;
}
function TypeSelector({value,onChange}:{value:TypeKey;onChange:(v:TypeKey)=>void}) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
      {(Object.entries(TYPE_META) as [TypeKey,typeof TYPE_META[TypeKey]][]).map(([type,meta])=>{
        const active=value===type;
        return <button key={type} onClick={()=>onChange(type)} style={{padding:"10px 6px",border:`1.5px solid ${active?meta.color:"rgba(255,255,255,0.09)"}`,borderRadius:10,background:active?meta.bg:"rgba(255,255,255,0.03)",color:active?meta.color:"#4b5563",fontWeight:700,fontSize:11,cursor:"pointer",textAlign:"center" as const,fontFamily:"'Sora',sans-serif",lineHeight:1.4}}>
          <div style={{fontSize:17,marginBottom:3}}>{meta.icon}</div>{meta.label}
        </button>;
      })}
    </div>
  );
}
function StatCard({label,value,color,sub}:{label:string;value:number;color:string;sub?:string}) {
  return (
    <div style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${color}30`,borderRadius:14,padding:"15px 16px"}}>
      <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase" as const,letterSpacing:"0.07em",marginBottom:5}}>{label}</div>
      <div style={{fontSize:19,fontWeight:800,color,letterSpacing:"-0.5px"}}>{fmt(value)}</div>
      {sub&&<div style={{fontSize:11,color:"#475569",marginTop:3}}>{sub}</div>}
    </div>
  );
}
function SectionTitle({children}:{children:ReactNode}) {
  return <div style={{fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase" as const,letterSpacing:"0.1em",marginBottom:12}}>{children}</div>;
}

const FEATURES=[
  {icon:"📊",title:"Visão 360°",desc:"Despesas, rendimentos e balanço em tempo real"},
  {icon:"🎯",title:"Metas inteligentes",desc:"Controla necessidades, desejos e investimentos"},
  {icon:"🏦",title:"Gestão de contas",desc:"Corrente, poupança e transferências automáticas"},
  {icon:"🔄",title:"Despesas recorrentes",desc:"Renda, ginásio, seguros — registados automaticamente"},
];

function WelcomeScreen() {
  const [mode,setMode]=useState<"welcome"|"login"|"register">("welcome");
  const [name,setName]=useState("");const [email,setEmail]=useState("");const [password,setPassword]=useState("");
  const [error,setError]=useState("");const [loading,setLoading]=useState(false);
  const [featIdx,setFeatIdx]=useState(0);const [animKey,setAnimKey]=useState(0);
  useEffect(()=>{
    if(mode!=="welcome")return;
    const t=setInterval(()=>{setFeatIdx(p=>(p+1)%FEATURES.length);setAnimKey(p=>p+1);},3000);
    return ()=>clearInterval(t);
  },[mode]);
  async function handleAuth(){
    setError("");setLoading(true);
    try{
      if(mode==="register"){
        if(!name.trim()||!email.trim()||!password.trim()){setError("Preenche todos os campos.");setLoading(false);return;}
        const{error:e}=await supabase.auth.signUp({email,password,options:{data:{name}}});
        if(e)throw e;
      }else{
        if(!email.trim()||!password.trim()){setError("Preenche email e password.");setLoading(false);return;}
        const{error:e}=await supabase.auth.signInWithPassword({email,password});
        if(e)throw e;
      }
    }catch(e:any){
      const msg=e.message||"Erro";
      if(msg.includes("Invalid login"))setError("Email ou password incorretos.");
      else if(msg.includes("already registered"))setError("Email já registado.");
      else setError(msg);
    }
    setLoading(false);
  }
  const inp:CSSProperties={width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"13px 14px",color:"#e2e8f0",fontSize:14,boxSizing:"border-box",outline:"none",fontFamily:"'Sora',sans-serif"};
  const lbl:CSSProperties={fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:6};
  if(mode==="login"||mode==="register") return(
    <div style={{minHeight:"100vh",background:"#080810",display:"flex",flexDirection:"column",fontFamily:"'Sora',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet"/>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}} input::placeholder{color:#374151}`}</style>
      <div style={{padding:"18px 20px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
        <button onClick={()=>{setMode("welcome");setError("");}} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"7px 12px",color:"#64748b",fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>←</button>
        <span style={{fontSize:16}}>💰</span><span style={{fontSize:13,fontWeight:700,color:"#475569"}}>Finanças Pessoais</span>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 20px 40px"}}>
        <div style={{width:"100%",maxWidth:380,animation:"fadeUp .45s ease"}}>
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{fontSize:12,fontWeight:700,color:"#f97316",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:8}}>{mode==="login"?"Bem-vindo de volta":"Começa gratuitamente"}</div>
            <div style={{fontSize:24,fontWeight:800,color:"#f1f5f9",letterSpacing:"-0.5px",lineHeight:1.25}}>{mode==="login"?"Entra na tua conta":"Cria a tua conta agora"}</div>
          </div>
          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:"26px 22px"}}>
            <div style={{display:"flex",background:"rgba(255,255,255,0.05)",borderRadius:12,padding:4,marginBottom:22}}>
              {(["login","register"] as const).map(s=>(
                <button key={s} onClick={()=>{setMode(s);setError("");}} style={{flex:1,padding:"9px 0",border:"none",borderRadius:9,background:mode===s?"rgba(249,115,22,0.25)":"transparent",color:mode===s?"#f97316":"#475569",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>{s==="login"?"Entrar":"Criar conta"}</button>
              ))}
            </div>
            {mode==="register"&&<div style={{marginBottom:12}}><label style={lbl}>Nome</label><input style={inp} placeholder="O teu nome" value={name} onChange={e=>setName(e.target.value)}/></div>}
            <div style={{marginBottom:12}}><label style={lbl}>Email</label><input style={inp} type="email" placeholder="email@exemplo.com" value={email} onChange={e=>setEmail(e.target.value)}/></div>
            <div style={{marginBottom:error?12:22}}><label style={lbl}>Password</label><input style={inp} type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAuth()}/></div>
            {error&&<div style={{background:"#450a0a",border:"1px solid rgba(239,68,68,0.3)",borderRadius:9,padding:"10px 13px",marginBottom:16,fontSize:12,color:"#f87171"}}>⚠️ {error}</div>}
            <button onClick={handleAuth} disabled={loading} style={{width:"100%",padding:"14px 0",background:"linear-gradient(135deg,#f97316,#ef4444)",border:"none",borderRadius:12,color:"#fff",fontWeight:800,fontSize:15,cursor:loading?"not-allowed":"pointer",fontFamily:"'Sora',sans-serif",opacity:loading?0.7:1}}>
              {loading?"A processar...":mode==="login"?"Entrar →":"Criar conta →"}
            </button>
          </div>
          <div style={{textAlign:"center",marginTop:18,fontSize:11,color:"#1f2937"}}>🔒 Dados privados e encriptados</div>
        </div>
      </div>
    </div>
  );
  const feature=FEATURES[featIdx];
  return(
    <div style={{minHeight:"100vh",background:"#080810",fontFamily:"'Sora',sans-serif",color:"#e2e8f0",overflowX:"hidden"}}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet"/>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
      <div style={{position:"fixed",top:-80,right:-80,width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(249,115,22,0.12) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{padding:"20px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#f97316,#ef4444)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>💰</div>
          <span style={{fontSize:13,fontWeight:700,color:"#475569"}}>Finanças Pessoais</span>
        </div>
        <button onClick={()=>setMode("login")} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:9,padding:"8px 16px",color:"#94a3b8",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Entrar</button>
      </div>
      <div style={{padding:"40px 20px 0",textAlign:"center"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(249,115,22,0.1)",border:"1px solid rgba(249,115,22,0.2)",borderRadius:99,padding:"6px 14px",marginBottom:28}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#f97316",animation:"pulse 1.5s ease infinite"}}/>
          <span style={{fontSize:12,color:"#f97316",fontWeight:600}}>O teu dinheiro, o teu controlo</span>
        </div>
        <h1 style={{fontSize:32,fontWeight:800,color:"#f1f5f9",letterSpacing:"-1px",lineHeight:1.15,margin:"0 0 16px",padding:"0 8px"}}>
          Bem-vindo ao<br/>
          <span style={{background:"linear-gradient(135deg,#f97316,#fbbf24)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>controlo das<br/>tuas finanças</span>
        </h1>
        <p style={{fontSize:14,color:"#475569",lineHeight:1.6,margin:"0 0 32px",padding:"0 12px"}}>Despesas, poupanças, contas e recorrentes —<br/>tudo num só lugar, sempre sincronizado.</p>
        <div style={{display:"flex",flexDirection:"column",gap:10,padding:"0 4px",marginBottom:36}}>
          <button onClick={()=>setMode("register")} style={{width:"100%",padding:"15px 0",background:"linear-gradient(135deg,#f97316,#ef4444)",border:"none",borderRadius:14,color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:"'Sora',sans-serif",boxShadow:"0 8px 32px rgba(249,115,22,0.35)"}}>Começar gratuitamente →</button>
          <button onClick={()=>setMode("login")} style={{width:"100%",padding:"13px 0",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:14,color:"#94a3b8",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Já tenho conta — Entrar</button>
        </div>
      </div>
      <div style={{margin:"0 20px 28px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:18,padding:"20px"}}>
        <div key={animKey} style={{animation:"fadeUp .4s ease"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
            <div style={{width:44,height:44,borderRadius:13,background:"linear-gradient(135deg,rgba(249,115,22,0.2),rgba(239,68,68,0.2))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{feature.icon}</div>
            <div><div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>{feature.title}</div><div style={{fontSize:12,color:"#475569",marginTop:2}}>{feature.desc}</div></div>
          </div>
          <div style={{display:"flex",gap:5,justifyContent:"center",marginTop:14}}>
            {FEATURES.map((_,i)=><div key={i} style={{width:i===featIdx?20:6,height:6,borderRadius:99,background:i===featIdx?"#f97316":"rgba(255,255,255,0.1)",transition:"all .3s ease"}}/>)}
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"0 20px",marginBottom:40}}>
        {FEATURES.map((f,i)=>(
          <div key={i} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:"14px 12px"}}>
            <div style={{fontSize:22,marginBottom:8}}>{f.icon}</div>
            <div style={{fontSize:12,fontWeight:700,color:"#e2e8f0",marginBottom:4}}>{f.title}</div>
            <div style={{fontSize:11,color:"#374151",lineHeight:1.4}}>{f.desc}</div>
          </div>
        ))}
      </div>
      <div style={{padding:"0 20px 48px",textAlign:"center"}}>
        <div style={{background:"linear-gradient(135deg,rgba(249,115,22,0.08),rgba(239,68,68,0.08))",border:"1px solid rgba(249,115,22,0.2)",borderRadius:20,padding:"24px 20px"}}>
          <div style={{fontSize:18,fontWeight:800,color:"#f1f5f9",marginBottom:8}}>Pronto para começar?</div>
          <div style={{fontSize:13,color:"#64748b",marginBottom:18}}>Grátis, seguro e sempre contigo.</div>
          <button onClick={()=>setMode("register")} style={{width:"100%",padding:"14px 0",background:"linear-gradient(135deg,#f97316,#ef4444)",border:"none",borderRadius:12,color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Criar conta gratuita →</button>
          <div style={{fontSize:11,color:"#1f2937",marginTop:12}}>🔒 Grátis para sempre · Sem cartão de crédito</div>
        </div>
      </div>
    </div>
  );
}

export default function Financas() {
  const [sbUser,setSbUser]=useState<SBUser|null>(null);
  const [loading,setLoading]=useState(true);
  const [userName,setUserName]=useState("");
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setSbUser(session?.user||null);if(session?.user)loadProfile(session.user.id);setLoading(false);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{setSbUser(session?.user||null);if(session?.user)loadProfile(session.user.id);});
    return ()=>subscription.unsubscribe();
  },[]);
  async function loadProfile(uid:string){const{data}=await supabase.from("profiles").select("name").eq("id",uid).single();if(data)setUserName(data.name);}
  if(loading)return(<div style={{minHeight:"100vh",background:"#080810",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif"}}><div style={{textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>💰</div><div style={{fontSize:14,color:"#475569"}}>A carregar...</div></div></div>);
  if(!sbUser)return <WelcomeScreen/>;
  return <MainApp user={sbUser} userName={userName} onLogout={()=>supabase.auth.signOut()}/>;
}

function MainApp({user,userName,onLogout}:{user:SBUser;userName:string;onLogout:()=>void}) {
  const [world,setWorld]=useState("pessoal");
  const [tab,setTab]=useState("resumo");
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [themeKey,setThemeKey]=useState<ThemeKey>("original");
  const T=THEMES[themeKey];
  const [showTour,setShowTour]=useState(false);
  const [expenses,setExpenses]=useState<Expense[]>([]);
  const [incomes,setIncomes]=useState<Income[]>([]);
  const [accounts,setAccounts]=useState<BankAccount[]>([]);
  const [transfers,setTransfers]=useState<Transfer[]>([]);
  const [recurring,setRecurring]=useState<RecurringExpense[]>([]);
  const [goals,setGoals]=useState<SavingsGoal[]>([]);
  const [monthlyRev,setMonthlyRev]=useState<Record<string,Record<string,number[]>>>({});
  const [budgetTargets,setBudgetTargets]=useState<BudgetTargets>(DEFAULT_BUDGET);
  const [enabledPExp,setEnabledPExp]=useState<string[]>(BASE_PERSONAL_EXP.map(c=>c.id));
  const [enabledPInc,setEnabledPInc]=useState<string[]>(BASE_PERSONAL_INC.map(c=>c.id));
  const [enabledCExp,setEnabledCExp]=useState<string[]>(BASE_CLINIC_EXP.map(c=>c.id));
  const [enabledCInc,setEnabledCInc]=useState<string[]>(BASE_CLINIC_INC.map(c=>c.id));
  const [customExpCats,setCustomExpCats]=useState<ExpCat[]>([]);
  const [customIncCats,setCustomIncCats]=useState<IncCat[]>([]);
  const [dataLoading,setDataLoading]=useState(true);
  const [world1Name,setWorld1Name]=useState("Pessoal");
  const [world1Icon,setWorld1Icon]=useState("👤");
  const [world2Name,setWorld2Name]=useState("Clínica");
  const [world2Icon,setWorld2Icon]=useState("🏥");
  const [editingWorlds,setEditingWorlds]=useState(false);
  const [sidebarTab,setSidebarTab]=useState<"contas"|"categorias"|"config">("contas");
  const [newAccName,setNewAccName]=useState("");
  const [newAccTipo,setNewAccTipo]=useState<BankAccount["tipo"]>("corrente");
  const [newAccSaldo,setNewAccSaldo]=useState("");
  const [editingAccId,setEditingAccId]=useState<number|null>(null);
  const [editSaldo,setEditSaldo]=useState("");
  const [showTransfer,setShowTransfer]=useState(false);
  const [trFrom,setTrFrom]=useState("");const [trTo,setTrTo]=useState("");const [trValor,setTrValor]=useState("");const [trDesc,setTrDesc]=useState("");
  const today=new Date().toISOString().slice(0,10);
  const [trData,setTrData]=useState(today);
  const [newExpLabel,setNewExpLabel]=useState("");const [newExpIcon,setNewExpIcon]=useState("📦");const [newExpType,setNewExpType]=useState<TypeKey>("desejo");
  const [newIncLabel,setNewIncLabel]=useState("");const [newIncIcon,setNewIncIcon]=useState("💰");
  const [expForm,setExpForm]=useState({descricao:"",valor:"",cat:"",subcat:"",data:today,tipo:"necessidade" as TypeKey});
  const [incForm,setIncForm]=useState({descricao:"",valor:"",cat:"",data:today});
  const [revEdit,setRevEdit]=useState<number|null>(null);const [revVal,setRevVal]=useState("");
  const [revYear,setRevYear]=useState(String(new Date().getFullYear()));
  const [fMonth,setFMonth]=useState("todos");const [fYear,setFYear]=useState("todos");

  useEffect(()=>{loadAll();},[user.id]);

  async function loadAll(){
    setDataLoading(true);
    const uid=user.id;
    const [expR,incR,accR,trR,recR,goalsR,mrR,setR]=await Promise.all([
      supabase.from("expenses").select("*").eq("user_id",uid).order("data",{ascending:false}),
      supabase.from("incomes").select("*").eq("user_id",uid).order("data",{ascending:false}),
      supabase.from("accounts").select("*").eq("user_id",uid).order("created_at"),
      supabase.from("transfers").select("*").eq("user_id",uid).order("data",{ascending:false}),
      supabase.from("recurring_expenses").select("*").eq("user_id",uid).order("proxima_data"),
      supabase.from("savings_goals").select("*").eq("user_id",uid).order("prazo"),
      supabase.from("monthly_revenue").select("*").eq("user_id",uid),
      supabase.from("user_settings").select("*").eq("user_id",uid).single(),
    ]);
    if(expR.data)setExpenses(expR.data as Expense[]);
    if(incR.data)setIncomes(incR.data as Income[]);
    if(accR.data)setAccounts(accR.data as BankAccount[]);
    if(trR.data)setTransfers(trR.data as Transfer[]);
    if(recR.data)setRecurring(recR.data as RecurringExpense[]);
    if(goalsR.data)setGoals(goalsR.data as SavingsGoal[]);
    if(mrR.data){const rev:Record<string,Record<string,number[]>>={};(mrR.data as any[]).forEach(r=>{if(!rev[r.world])rev[r.world]={};if(!rev[r.world][r.year])rev[r.world][r.year]=new Array(12).fill(0);rev[r.world][r.year][r.month]=Number(r.valor);});setMonthlyRev(rev);}
    if(setR.data){const s=setR.data as any;setBudgetTargets({necessidade:s.budget_necessidade,desejo:s.budget_desejo,investimento:s.budget_investimento});if(s.enabled_p_exp)setEnabledPExp(s.enabled_p_exp);if(s.enabled_p_inc)setEnabledPInc(s.enabled_p_inc);if(s.enabled_c_exp)setEnabledCExp(s.enabled_c_exp);if(s.enabled_c_inc)setEnabledCInc(s.enabled_c_inc);if(s.custom_exp_cats)setCustomExpCats(s.custom_exp_cats);if(s.custom_inc_cats)setCustomIncCats(s.custom_inc_cats);if(s.theme)setThemeKey(s.theme as ThemeKey);if(s.world1_name)setWorld1Name(s.world1_name);if(s.world1_icon)setWorld1Icon(s.world1_icon);if(s.world2_name)setWorld2Name(s.world2_name);if(s.world2_icon)setWorld2Icon(s.world2_icon);if(!s.tour_done)setShowTour(true);}
    setDataLoading(false);
  }

  async function saveSettings(patch:Record<string,any>){await supabase.from("user_settings").upsert({user_id:user.id,...patch});}
  async function changeTheme(k:ThemeKey){setThemeKey(k);await saveSettings({theme:k});}
  async function saveWorlds(){await saveSettings({world1_name:world1Name,world1_icon:world1Icon,world2_name:world2Name,world2_icon:world2Icon});setEditingWorlds(false);}
  async function finishTour(){setShowTour(false);await saveSettings({tour_done:true});}

  const enabledExpCats=world==="pessoal"?enabledPExp:enabledCExp;
  const enabledIncCats=world==="pessoal"?enabledPInc:enabledCInc;
  const allExpCats=[...(world==="pessoal"?BASE_PERSONAL_EXP:BASE_CLINIC_EXP),...customExpCats.filter(c=>c.id.startsWith(world==="pessoal"?"cp_":"cc_"))];
  const allIncCats=[...(world==="pessoal"?BASE_PERSONAL_INC:BASE_CLINIC_INC),...customIncCats.filter(c=>c.id.startsWith(world==="pessoal"?"ci_p":"ci_c"))];
  const expCats=allExpCats.filter(c=>enabledExpCats.includes(c.id));
  const incCats=allIncCats.filter(c=>enabledIncCats.includes(c.id));

  const myExpenses=useMemo(()=>expenses.filter(e=>{if(e.world!==world)return false;const d=new Date(e.data);if(fYear!=="todos"&&String(d.getFullYear())!==fYear)return false;if(fMonth!=="todos"&&String(d.getMonth())!==fMonth)return false;return true;}),[expenses,world,fYear,fMonth]);
  const myIncomes=useMemo(()=>incomes.filter(i=>{if(i.world!==world)return false;const d=new Date(i.data);if(fYear!=="todos"&&String(d.getFullYear())!==fYear)return false;if(fMonth!=="todos"&&String(d.getMonth())!==fMonth)return false;return true;}),[incomes,world,fYear,fMonth]);
  const totalExp=myExpenses.reduce((s,e)=>s+Number(e.valor),0);
  const totalInc=myIncomes.reduce((s,i)=>s+Number(i.valor),0);
  const balance=totalInc-totalExp;
  const byType=useMemo(()=>{const map:Record<TypeKey,number>={necessidade:0,desejo:0,investimento:0};myExpenses.forEach(e=>{if(e.tipo in map)map[e.tipo]+=Number(e.valor);});return map;},[myExpenses]);
  const byCat=useMemo(()=>expCats.map(c=>({...c,total:myExpenses.filter(e=>e.cat===c.id).reduce((s,e)=>s+Number(e.valor),0)})).sort((a,b)=>b.total-a.total),[myExpenses,expCats]);
  const byIncCat=useMemo(()=>incCats.map(c=>({...c,total:myIncomes.filter(i=>i.cat===c.id).reduce((s,i)=>s+Number(i.valor),0)})).sort((a,b)=>b.total-a.total),[myIncomes,incCats]);
  const maxCat=Math.max(...byCat.map(c=>c.total),1);
  const maxInc=Math.max(...byIncCat.map(c=>c.total),1);
  const revArr:number[]=monthlyRev[world]?.[revYear]||new Array(12).fill(0);
  const maxBar=Math.max(...revArr,...MONTHS.map((_,i)=>expenses.filter(e=>e.world===world&&new Date(e.data).getMonth()===i&&String(new Date(e.data).getFullYear())===revYear).reduce((s,e)=>s+Number(e.valor),0)),1);
  const overBudget=(Object.entries(budgetTargets) as [TypeKey,number][]).filter(([type,target])=>(byType[type]||0)>totalExp*(target/100)&&totalExp>0);
  const totalSaldo=accounts.reduce((s,a)=>s+Number(a.saldo),0);
  const dueRecurring=recurring.filter(r=>r.world===world&&r.ativa&&r.proxima_data<=today).length;

  async function addExpense(){if(!expForm.descricao.trim()||!expForm.valor||!expForm.cat)return;const{data,error}=await supabase.from("expenses").insert({user_id:user.id,...expForm,valor:Number(expForm.valor),world}).select().single();if(!error&&data){setExpenses(p=>[data as Expense,...p]);setExpForm(f=>({...f,descricao:"",valor:"",subcat:""}));}}
  async function deleteExpense(id:number){await supabase.from("expenses").delete().eq("id",id);setExpenses(p=>p.filter(e=>e.id!==id));}
  async function addIncome(){if(!incForm.descricao.trim()||!incForm.valor||!incForm.cat)return;const{data,error}=await supabase.from("incomes").insert({user_id:user.id,...incForm,valor:Number(incForm.valor),world}).select().single();if(!error&&data){setIncomes(p=>[data as Income,...p]);setIncForm(f=>({...f,descricao:"",valor:""}));}}
  async function deleteIncome(id:number){await supabase.from("incomes").delete().eq("id",id);setIncomes(p=>p.filter(i=>i.id!==id));}
  async function saveRevCell(){if(revEdit===null)return;const v=Number(revVal);if(isNaN(v))return;await supabase.from("monthly_revenue").upsert({user_id:user.id,world,year:Number(revYear),month:revEdit,valor:v},{onConflict:"user_id,world,year,month"});setMonthlyRev(prev=>{const w={...(prev[world]||{})};const arr=[...(w[revYear]||new Array(12).fill(0))];arr[revEdit]=v;w[revYear]=arr;return{...prev,[world]:w};});setRevEdit(null);}
  async function addAccount(){if(!newAccName.trim())return;const meta=TIPO_ACC[newAccTipo];const{data,error}=await supabase.from("accounts").insert({user_id:user.id,nome:newAccName.trim(),tipo:newAccTipo,saldo:Number(newAccSaldo)||0,icon:meta.icon,cor:meta.cor}).select().single();if(!error&&data){setAccounts(p=>[...p,data as BankAccount]);setNewAccName("");setNewAccSaldo("");}}
  async function saveAccountSaldo(id:number){const v=Number(editSaldo);await supabase.from("accounts").update({saldo:v}).eq("id",id);setAccounts(p=>p.map(a=>a.id===id?{...a,saldo:v}:a));setEditingAccId(null);}
  async function deleteAccount(id:number){if(!window.confirm("Apagar esta conta?"))return;await supabase.from("accounts").delete().eq("id",id);setAccounts(p=>p.filter(a=>a.id!==id));}
  async function doTransfer(){if(!trFrom||!trTo||!trValor||trFrom===trTo)return;const v=Number(trValor);if(isNaN(v)||v<=0)return;const fromId=Number(trFrom),toId=Number(trTo);await Promise.all([supabase.from("accounts").update({saldo:accounts.find(a=>a.id===fromId)!.saldo-v}).eq("id",fromId),supabase.from("accounts").update({saldo:accounts.find(a=>a.id===toId)!.saldo+v}).eq("id",toId)]);const{data}=await supabase.from("transfers").insert({user_id:user.id,from_account_id:fromId,to_account_id:toId,valor:v,descricao:trDesc||"Transferência",data:trData}).select().single();setAccounts(p=>p.map(a=>{if(a.id===fromId)return{...a,saldo:a.saldo-v};if(a.id===toId)return{...a,saldo:a.saldo+v};return a;}));if(data)setTransfers(p=>[data as Transfer,...p]);setTrFrom("");setTrTo("");setTrValor("");setTrDesc("");setShowTransfer(false);}
  async function updateBudget(bt:BudgetTargets){setBudgetTargets(bt);await saveSettings({budget_necessidade:bt.necessidade,budget_desejo:bt.desejo,budget_investimento:bt.investimento});}
  function toggleExp(id:string){const next=enabledExpCats.includes(id)?enabledExpCats.filter(x=>x!==id):[...enabledExpCats,id];if(world==="pessoal"){setEnabledPExp(next);saveSettings({enabled_p_exp:next});}else{setEnabledCExp(next);saveSettings({enabled_c_exp:next});}}
  function toggleInc(id:string){const next=enabledIncCats.includes(id)?enabledIncCats.filter(x=>x!==id):[...enabledIncCats,id];if(world==="pessoal"){setEnabledPInc(next);saveSettings({enabled_p_inc:next});}else{setEnabledCInc(next);saveSettings({enabled_c_inc:next});}}
  function addCustomExp(){if(!newExpLabel.trim())return;const prefix=world==="pessoal"?"cp_":"cc_";const cat:ExpCat={id:`${prefix}${Date.now()}`,label:newExpLabel.trim(),icon:newExpIcon,type:newExpType,custom:true};const next=[...customExpCats,cat];setCustomExpCats(next);const nextE=[...enabledExpCats,cat.id];if(world==="pessoal")setEnabledPExp(nextE);else setEnabledCExp(nextE);saveSettings({custom_exp_cats:next});setNewExpLabel("");setNewExpIcon("📦");}
  function deleteCustomExp(id:string){const next=customExpCats.filter(c=>c.id!==id);setCustomExpCats(next);saveSettings({custom_exp_cats:next});toggleExp(id);}
  function addCustomInc(){if(!newIncLabel.trim())return;const prefix=world==="pessoal"?"ci_p_":"ci_c_";const cat:IncCat={id:`${prefix}${Date.now()}`,label:newIncLabel.trim(),icon:newIncIcon,custom:true};const next=[...customIncCats,cat];setCustomIncCats(next);const nextE=[...enabledIncCats,cat.id];if(world==="pessoal")setEnabledPInc(nextE);else setEnabledCInc(nextE);saveSettings({custom_inc_cats:next});setNewIncLabel("");setNewIncIcon("💰");}
  function deleteCustomInc(id:string){const next=customIncCats.filter(c=>c.id!==id);setCustomIncCats(next);saveSettings({custom_inc_cats:next});toggleInc(id);}

  async function applyRecurring(r:RecurringExpense){
    const row={user_id:user.id,descricao:r.descricao,valor:r.valor,cat:r.cat,subcat:r.subcat,data:today,tipo:r.tipo,world:r.world};
    const{data,error}=await supabase.from("expenses").insert(row).select().single();
    if(!error&&data)setExpenses(p=>[data as Expense,...p]);
  }

  const S:Record<string,CSSProperties>={
    root:{minHeight:"100vh",background:T.root,color:"#e2e8f0",fontFamily:"'Sora',sans-serif",paddingBottom:64},
    header:{background:T.header,padding:"20px 20px 0",borderBottom:`1px solid ${T.cardBorder}`},
    body:{padding:"16px 20px"},
    card:{background:T.cardBg,border:`1px solid ${T.cardBorder}`,borderRadius:14,padding:"16px 18px",marginBottom:14},
    inp:{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box",outline:"none",fontFamily:"'Sora',sans-serif"},
    sel:{width:"100%",background:"#111827",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box",outline:"none"},
    lbl:{fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:5},
    row2:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10},
    sg:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14},
  };
  const wBtn=(a:boolean):CSSProperties=>({flex:1,padding:"10px 0",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"'Sora',sans-serif",background:a?T.worldBtn:"rgba(255,255,255,0.05)",color:a?"#fff":T.subtext});
  const tBtn=(a:boolean):CSSProperties=>({padding:"9px 10px",border:"none",borderRadius:"8px 8px 0 0",cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap",fontFamily:"'Sora',sans-serif",background:a?"rgba(255,255,255,0.07)":"transparent",color:a?T.accent:T.subtext,borderBottom:a?`2px solid ${T.accent}`:"2px solid transparent",position:"relative"});
  const btnAdd:CSSProperties={background:`linear-gradient(135deg,${T.accent},${T.accentDark})`,color:"#fff",border:"none",borderRadius:9,padding:"12px 0",fontWeight:700,fontSize:13,cursor:"pointer",width:"100%",fontFamily:"'Sora',sans-serif",marginTop:6};
  const sInp:CSSProperties={width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"9px 11px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box",outline:"none",fontFamily:"'Sora',sans-serif"};
  const sSel:CSSProperties={width:"100%",background:"#111827",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"9px 11px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box",outline:"none"};
  const selCat=expCats.find(c=>c.id===expForm.cat);

  if(dataLoading)return(<div style={{minHeight:"100vh",background:T.root,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif"}}><div style={{textAlign:"center"}}><div style={{fontSize:36,marginBottom:12}}>💰</div><div style={{fontSize:14,color:T.subtext}}>A carregar...</div></div></div>);

  return(
    <div style={S.root}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet"/>
      <div style={{position:"fixed",top:-80,right:-80,width:300,height:300,borderRadius:"50%",background:`radial-gradient(circle,${T.glow1} 0%,transparent 70%)`,pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",bottom:-60,left:-60,width:250,height:250,borderRadius:"50%",background:`radial-gradient(circle,${T.glow2} 0%,transparent 70%)`,pointerEvents:"none",zIndex:0}}/>

      {showTour&&<Tour userName={userName} accent={T.accent} onFinish={finishTour}/>}

      {/* SIDEBAR */}
      {sidebarOpen&&<div onClick={()=>setSidebarOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:40}}/>}
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:300,background:"#0f1117",borderLeft:`1px solid ${T.cardBorder}`,zIndex:50,transform:sidebarOpen?"translateX(0)":"translateX(100%)",transition:"transform .3s ease",display:"flex",flexDirection:"column" as const,fontFamily:"'Sora',sans-serif"}}>
        <div style={{padding:"18px 20px 0",borderBottom:`1px solid ${T.cardBorder}`,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:15,fontWeight:800,color:"#f1f5f9"}}>Menu</div>
            <button onClick={()=>setSidebarOpen(false)} style={{background:"none",border:"none",color:"#64748b",fontSize:20,cursor:"pointer",padding:4}}>✕</button>
          </div>
          <div style={{display:"flex",gap:2}}>
            {(["contas","categorias","config"] as const).map(t=>(
              <button key={t} onClick={()=>setSidebarTab(t)} style={{flex:1,padding:"7px 0",border:"none",borderRadius:"7px 7px 0 0",background:sidebarTab===t?"rgba(255,255,255,0.07)":"transparent",color:sidebarTab===t?T.accent:T.subtext,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"'Sora',sans-serif",borderBottom:sidebarTab===t?`2px solid ${T.accent}`:"2px solid transparent"}}>
                {t==="contas"?"🏦":t==="categorias"?"🏷️":"⚙️"}
              </button>
            ))}
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto" as const,padding:"16px 20px"}}>
          {sidebarTab==="contas"&&<>
            <div style={{background:T.cardBg,border:`1px solid ${T.accent}30`,borderRadius:14,padding:"16px",marginBottom:14,textAlign:"center" as const}}>
              <div style={{fontSize:10,color:T.subtext,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:4}}>Saldo Total</div>
              <div style={{fontSize:24,fontWeight:800,color:totalSaldo>=0?T.positive:T.negative}}>{fmt(totalSaldo)}</div>
              <div style={{fontSize:11,color:T.subtext,marginTop:2}}>{accounts.length} conta{accounts.length!==1?"s":""}</div>
            </div>
            <button onClick={()=>setShowTransfer(!showTransfer)} style={{width:"100%",marginBottom:14,padding:"10px 0",background:showTransfer?`${T.accent2}22`:"rgba(255,255,255,0.05)",border:`1px solid ${showTransfer?T.accent2:"rgba(255,255,255,0.1)"}`,borderRadius:10,color:showTransfer?T.accent2:"#94a3b8",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>🔄 {showTransfer?"Cancelar":"Nova transferência"}</button>
            {showTransfer&&(
              <div style={{background:`${T.accent2}0a`,border:`1px solid ${T.accent2}30`,borderRadius:12,padding:"14px",marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:T.accent2,textTransform:"uppercase" as const,marginBottom:10}}>🔄 Transferência</div>
                <div style={{fontSize:11,color:T.subtext,marginBottom:4}}>De</div>
                <select style={{...sSel,marginBottom:8}} value={trFrom} onChange={e=>setTrFrom(e.target.value)}><option value="">Conta origem...</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.icon} {a.nome} ({fmt(Number(a.saldo))})</option>)}</select>
                <div style={{fontSize:11,color:T.subtext,marginBottom:4}}>Para</div>
                <select style={{...sSel,marginBottom:8}} value={trTo} onChange={e=>setTrTo(e.target.value)}><option value="">Conta destino...</option>{accounts.filter(a=>String(a.id)!==trFrom).map(a=><option key={a.id} value={a.id}>{a.icon} {a.nome} ({fmt(Number(a.saldo))})</option>)}</select>
                <input style={{...sInp,marginBottom:8}} type="number" placeholder="Valor (€)" value={trValor} onChange={e=>setTrValor(e.target.value)}/>
                <input style={{...sInp,marginBottom:8}} placeholder="Descrição (opcional)" value={trDesc} onChange={e=>setTrDesc(e.target.value)}/>
                <input style={{...sInp,marginBottom:10}} type="date" value={trData} onChange={e=>setTrData(e.target.value)}/>
                <button onClick={doTransfer} style={{width:"100%",padding:"10px 0",background:`linear-gradient(135deg,${T.accent2},${T.accent})`,border:"none",borderRadius:9,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Transferir →</button>
              </div>
            )}
            {accounts.map(a=>{const meta=TIPO_ACC[a.tipo];return(
              <div key={a.id} style={{background:T.cardBg,border:`1px solid ${T.accent}20`,borderRadius:12,padding:"12px 14px",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:36,height:36,borderRadius:10,background:`${T.accent}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{a.icon}</div>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#e2e8f0"}}>{a.nome}</div><div style={{fontSize:11,color:T.subtext}}>{meta.label}</div></div>
                  <div style={{fontSize:14,fontWeight:800,color:Number(a.saldo)>=0?T.positive:T.negative}}>{fmt(Number(a.saldo))}</div>
                </div>
                {editingAccId===a.id?(
                  <div style={{display:"flex",gap:6,marginTop:10}}>
                    <input autoFocus style={{...sInp,flex:1}} type="number" value={editSaldo} onChange={e=>setEditSaldo(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveAccountSaldo(a.id);if(e.key==="Escape")setEditingAccId(null);}} placeholder="Novo saldo"/>
                    <button onClick={()=>saveAccountSaldo(a.id)} style={{padding:"8px 12px",background:`${T.accent}33`,border:`1px solid ${T.accent}50`,borderRadius:8,color:T.accent,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>✓</button>
                    <button onClick={()=>setEditingAccId(null)} style={{padding:"8px 10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:"#64748b",fontSize:13,cursor:"pointer"}}>✕</button>
                  </div>
                ):(
                  <div style={{display:"flex",gap:6,marginTop:8}}>
                    <button onClick={()=>{setEditingAccId(a.id);setEditSaldo(String(a.saldo));}} style={{flex:1,padding:"6px 0",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:7,color:"#94a3b8",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>✏️ Editar saldo</button>
                    <button onClick={()=>deleteAccount(a.id)} style={{padding:"6px 10px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:7,color:"#f87171",fontSize:11,cursor:"pointer"}}>🗑️</button>
                  </div>
                )}
              </div>
            );})}
            {transfers.length>0&&(<div style={{marginTop:8,marginBottom:14}}><div style={{fontSize:10,fontWeight:700,color:T.subtext,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:10}}>Últimas transferências</div>{transfers.slice(0,5).map(t=>{const from=accounts.find(a=>a.id===t.from_account_id),to=accounts.find(a=>a.id===t.to_account_id);return(<div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:`1px solid ${T.cardBorder}`}}><span style={{fontSize:14}}>🔄</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,color:"#e2e8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.descricao}</div><div style={{fontSize:10,color:T.subtext}}>{from?.nome||"?"} → {to?.nome||"?"}</div></div><span style={{fontSize:12,fontWeight:700,color:T.accent2}}>{fmt(Number(t.valor))}</span></div>);})}</div>)}
            <div style={{background:T.cardBg,border:`1px dashed ${T.cardBorder}`,borderRadius:12,padding:"14px",marginTop:8}}>
              <div style={{fontSize:11,fontWeight:700,color:T.subtext,textTransform:"uppercase" as const,marginBottom:10}}>+ Nova conta</div>
              <input style={{...sInp,marginBottom:8}} placeholder="Nome da conta" value={newAccName} onChange={e=>setNewAccName(e.target.value)}/>
              <select style={{...sSel,marginBottom:8}} value={newAccTipo} onChange={e=>setNewAccTipo(e.target.value as BankAccount["tipo"])}><option value="corrente">💳 Conta Corrente</option><option value="poupanca">🏦 Conta Poupança</option><option value="investimento">📈 Conta Investimento</option><option value="outro">📂 Outra</option></select>
              <input style={{...sInp,marginBottom:10}} type="number" placeholder="Saldo inicial (€)" value={newAccSaldo} onChange={e=>setNewAccSaldo(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addAccount()}/>
              <button onClick={addAccount} style={{width:"100%",padding:"9px 0",background:`linear-gradient(135deg,${T.accent},${T.accentDark})`,border:"none",borderRadius:8,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>+ Adicionar conta</button>
            </div>
          </>}
          {sidebarTab==="categorias"&&<>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:11,fontWeight:700,color:T.accent,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:12}}>Categorias de despesa</div>
              {allExpCats.map(c=>{const on=enabledExpCats.includes(c.id);return(<div key={c.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><div onClick={()=>toggleExp(c.id)} style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:10,background:on?T.cardBg:"transparent",border:`1px solid ${on?T.cardBorder:"transparent"}`,cursor:"pointer"}}><span style={{fontSize:16}}>{c.icon}</span><span style={{flex:1,fontSize:13,color:on?"#e2e8f0":T.subtext,fontWeight:on?600:400}}>{c.label}</span>{c.custom&&<span style={{fontSize:9,color:T.accent,background:`${T.accent}20`,padding:"1px 6px",borderRadius:99}}>custom</span>}<div style={{width:16,height:16,borderRadius:4,background:on?T.accent:"rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",fontWeight:700,flexShrink:0}}>{on?"✓":""}</div></div>{c.custom&&<button onClick={()=>deleteCustomExp(c.id)} style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:7,padding:"6px 8px",color:"#f87171",fontSize:11,cursor:"pointer"}}>🗑️</button>}</div>);})}
              <div style={{background:T.cardBg,border:`1px dashed ${T.cardBorder}`,borderRadius:10,padding:"12px",marginTop:10}}>
                <div style={{fontSize:10,fontWeight:700,color:T.subtext,textTransform:"uppercase" as const,marginBottom:8}}>+ Nova categoria</div>
                <div style={{display:"flex",gap:6,marginBottom:6}}><input style={{...sInp,flex:"0 0 50px"}} placeholder="🏷️" value={newExpIcon} onChange={e=>setNewExpIcon(e.target.value)} maxLength={2}/><input style={{...sInp,flex:1}} placeholder="Nome" value={newExpLabel} onChange={e=>setNewExpLabel(e.target.value)}/></div>
                <select style={{...sSel,marginBottom:8}} value={newExpType} onChange={e=>setNewExpType(e.target.value as TypeKey)}><option value="necessidade">🏠 Necessidade</option><option value="desejo">✨ Desejo</option><option value="investimento">📈 Investimento</option></select>
                <button onClick={addCustomExp} style={{width:"100%",padding:"8px 0",background:`${T.accent}22`,border:`1px solid ${T.accent}40`,borderRadius:8,color:T.accent,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>+ Adicionar</button>
              </div>
            </div>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:11,fontWeight:700,color:T.positive,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:12}}>Fontes de rendimento</div>
              {allIncCats.map(c=>{const on=enabledIncCats.includes(c.id);return(<div key={c.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><div onClick={()=>toggleInc(c.id)} style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:10,background:on?T.cardBg:"transparent",border:`1px solid ${on?T.cardBorder:"transparent"}`,cursor:"pointer"}}><span style={{fontSize:16}}>{c.icon}</span><span style={{flex:1,fontSize:13,color:on?"#e2e8f0":T.subtext,fontWeight:on?600:400}}>{c.label}</span>{c.custom&&<span style={{fontSize:9,color:T.positive,background:`${T.positive}20`,padding:"1px 6px",borderRadius:99}}>custom</span>}<div style={{width:16,height:16,borderRadius:4,background:on?T.positive:"rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",fontWeight:700,flexShrink:0}}>{on?"✓":""}</div></div>{c.custom&&<button onClick={()=>deleteCustomInc(c.id)} style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:7,padding:"6px 8px",color:"#f87171",fontSize:11,cursor:"pointer"}}>🗑️</button>}</div>);})}
              <div style={{background:T.cardBg,border:`1px dashed ${T.cardBorder}`,borderRadius:10,padding:"12px",marginTop:10}}>
                <div style={{fontSize:10,fontWeight:700,color:T.subtext,textTransform:"uppercase" as const,marginBottom:8}}>+ Nova fonte</div>
                <div style={{display:"flex",gap:6,marginBottom:8}}><input style={{...sInp,flex:"0 0 50px"}} placeholder="💰" value={newIncIcon} onChange={e=>setNewIncIcon(e.target.value)} maxLength={2}/><input style={{...sInp,flex:1}} placeholder="Nome" value={newIncLabel} onChange={e=>setNewIncLabel(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCustomInc()}/></div>
                <button onClick={addCustomInc} style={{width:"100%",padding:"8px 0",background:`${T.positive}18`,border:`1px solid ${T.positive}35`,borderRadius:8,color:T.positive,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>+ Adicionar</button>
              </div>
            </div>
          </>}
          {sidebarTab==="config"&&<>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:11,fontWeight:700,color:T.accent,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:12}}>🌍 Os meus mundos</div>
              <div style={{background:T.cardBg,border:`1px solid ${T.cardBorder}`,borderRadius:12,padding:"14px"}}>
                {!editingWorlds?(
                  <><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:22}}>{world1Icon}</span><div><div style={{fontSize:13,fontWeight:700,color:"#e2e8f0"}}>{world1Name}</div><div style={{fontSize:10,color:T.subtext}}>Mundo 1</div></div></div><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:22}}>{world2Icon}</span><div><div style={{fontSize:13,fontWeight:700,color:"#e2e8f0"}}>{world2Name}</div><div style={{fontSize:10,color:T.subtext}}>Mundo 2</div></div></div></div><button onClick={()=>setEditingWorlds(true)} style={{width:"100%",padding:"8px 0",background:`${T.accent}18`,border:`1px solid ${T.accent}35`,borderRadius:8,color:T.accent,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>✏️ Editar nomes</button></>
                ):(
                  <><div style={{fontSize:10,fontWeight:700,color:T.subtext,textTransform:"uppercase" as const,marginBottom:8}}>Mundo 1</div><div style={{display:"flex",gap:6,marginBottom:10}}><input style={{...sInp,flex:"0 0 50px"}} placeholder="👤" value={world1Icon} onChange={e=>setWorld1Icon(e.target.value)} maxLength={2}/><input style={{...sInp,flex:1}} placeholder="Nome" value={world1Name} onChange={e=>setWorld1Name(e.target.value)}/></div><div style={{fontSize:10,fontWeight:700,color:T.subtext,textTransform:"uppercase" as const,marginBottom:8}}>Mundo 2</div><div style={{display:"flex",gap:6,marginBottom:12}}><input style={{...sInp,flex:"0 0 50px"}} placeholder="🏥" value={world2Icon} onChange={e=>setWorld2Icon(e.target.value)} maxLength={2}/><input style={{...sInp,flex:1}} placeholder="Nome" value={world2Name} onChange={e=>setWorld2Name(e.target.value)}/></div><div style={{display:"flex",gap:8}}><button onClick={saveWorlds} style={{flex:1,padding:"9px 0",background:`linear-gradient(135deg,${T.accent},${T.accentDark})`,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Guardar</button><button onClick={()=>setEditingWorlds(false)} style={{padding:"9px 14px",background:"rgba(255,255,255,0.05)",border:`1px solid ${T.cardBorder}`,borderRadius:8,color:T.subtext,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Cancelar</button></div></>
                )}
              </div>
            </div>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:11,fontWeight:700,color:T.accent,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:12}}>🎨 Tema</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {(Object.entries(THEMES) as [ThemeKey,AppTheme][]).map(([key,theme])=>{const active=themeKey===key;return(<button key={key} onClick={()=>changeTheme(key)} style={{padding:"12px 8px",background:active?`${theme.accent}20`:"rgba(255,255,255,0.04)",border:`1.5px solid ${active?theme.accent:"rgba(255,255,255,0.08)"}`,borderRadius:12,cursor:"pointer",fontFamily:"'Sora',sans-serif",textAlign:"center" as const,transition:"all .2s"}}><div style={{fontSize:20,marginBottom:4}}>{theme.emoji}</div><div style={{fontSize:12,fontWeight:700,color:active?theme.accent:"#94a3b8"}}>{theme.name}</div><div style={{display:"flex",justifyContent:"center",gap:3,marginTop:6}}>{[theme.accent,theme.accent2,theme.positive].map((c,i)=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:c}}/>)}</div>{active&&<div style={{fontSize:9,color:theme.accent,marginTop:4,fontWeight:700}}>✓ Ativo</div>}</button>);})}
              </div>
            </div>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:11,fontWeight:700,color:T.accent,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:12}}>Metas orçamentais</div>
              {(Object.entries(TYPE_META) as [TypeKey,typeof TYPE_META[TypeKey]][]).map(([type,meta])=>(<div key={type} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}><span style={{fontSize:13,color:meta.color}}>{meta.icon} {meta.label}</span><span style={{fontSize:13,fontWeight:700,color:meta.color}}>{budgetTargets[type]}%</span></div><input type="range" min={0} max={100} value={budgetTargets[type]} onChange={e=>updateBudget({...budgetTargets,[type]:Number(e.target.value)})} style={{width:"100%",accentColor:meta.color}}/></div>))}
              <div style={{textAlign:"center" as const,fontSize:12,fontWeight:700,padding:"8px 12px",borderRadius:8,background:(budgetTargets.necessidade+budgetTargets.desejo+budgetTargets.investimento)===100?"#064e3b33":"#450a0a",color:(budgetTargets.necessidade+budgetTargets.desejo+budgetTargets.investimento)===100?T.positive:"#f87171",marginTop:4}}>
                Total: {budgetTargets.necessidade+budgetTargets.desejo+budgetTargets.investimento}% {(budgetTargets.necessidade+budgetTargets.desejo+budgetTargets.investimento)===100?"✓ Correto":"⚠️ Deve ser 100%"}
              </div>
              <button onClick={()=>updateBudget(DEFAULT_BUDGET)} style={{width:"100%",marginTop:8,padding:"7px 0",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:"#94a3b8",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Repor sugestão (75/10/15)</button>
            </div>
            <div style={{borderTop:`1px solid ${T.cardBorder}`,paddingTop:16,display:"flex",flexDirection:"column" as const,gap:8}}>
              <button onClick={()=>setShowTour(true)} style={{width:"100%",padding:"9px 0",background:`${T.accent}12`,border:`1px solid ${T.accent}30`,borderRadius:9,color:T.accent,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>🎓 Ver tour novamente</button>
              <button onClick={onLogout} style={{width:"100%",padding:"10px 0",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:9,color:"#f87171",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Terminar sessão</button>
            </div>
          </>}
        </div>
      </div>

      {/* HEADER */}
      <div style={{...S.header,position:"relative",zIndex:1}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:"#f1f5f9",letterSpacing:"-0.3px"}}>💰 As Minhas Finanças</div>
            <div style={{fontSize:11,color:T.subtext,marginTop:1}}>Olá, <span style={{color:T.accent,fontWeight:700}}>{userName}</span> · <span style={{color:T.positive}}>sincronizado ✓</span></div>
          </div>
          <button onClick={()=>setSidebarOpen(true)} style={{background:`${T.accent}15`,border:`1px solid ${T.accent}30`,borderRadius:9,padding:"7px 11px",color:T.accent,fontSize:16,cursor:"pointer"}}>⚙️</button>
        </div>
        <div style={{display:"flex",gap:4,marginBottom:14}}>
          <button style={wBtn(world==="pessoal")} onClick={()=>{setWorld("pessoal");setTab("resumo");}}>{world1Icon} {world1Name}</button>
          <button style={wBtn(world==="clinica")} onClick={()=>{setWorld("clinica");setTab("resumo");}}>{world2Icon} {world2Name}</button>
        </div>
        <div style={{display:"flex",gap:1,overflowX:"auto"}}>
          {[["resumo","📊"],["despesas","📥"],["recorrentes","🔄"],["objetivos","🎯"],["comparacao","📈"],["casal","👫"],["rendimentos","💶"],["progressao","📉"]].map(([id,icon])=>(
            <button key={id} style={tBtn(tab===id)} onClick={()=>setTab(id)}>
              {icon} {id.charAt(0).toUpperCase()+id.slice(1)}
              {id==="recorrentes"&&dueRecurring>0&&<span style={{position:"absolute",top:4,right:4,width:8,height:8,borderRadius:"50%",background:"#f59e0b"}}/>}
            </button>
          ))}
        </div>
      </div>

      {/* FILTERS */}
      <div style={{padding:"12px 20px 0",display:"flex",gap:8,position:"relative",zIndex:1}}>
        <select style={{...S.sel,flex:1}} value={fYear} onChange={e=>setFYear(e.target.value)}><option value="todos">Todos os anos</option>{["2024","2025","2026"].map(y=><option key={y} value={y}>{y}</option>)}</select>
        <select style={{...S.sel,flex:1}} value={fMonth} onChange={e=>setFMonth(e.target.value)}><option value="todos">Todos os meses</option>{MONTHS.map((m,i)=><option key={i} value={String(i)}>{m}</option>)}</select>
      </div>

      <div style={{...S.body,position:"relative",zIndex:1}}>

        {/* RESUMO */}
        {tab==="resumo"&&<>
          <div style={S.sg}>
            <StatCard label="Rendimento" value={totalInc} color={T.positive} sub={`${myIncomes.length} entradas`}/>
            <StatCard label="Despesas"   value={totalExp} color={T.negative} sub={`${myExpenses.length} items`}/>
          </div>
          <div style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <span style={{fontSize:13,color:T.subtext,fontWeight:600}}>Resultado</span>
            <span style={{fontSize:22,fontWeight:800,color:balance>=0?T.positive:T.negative,letterSpacing:"-0.5px"}}>{fmt(balance)}</span>
          </div>
          {dueRecurring>0&&(
            <div onClick={()=>setTab("recorrentes")} style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:12,padding:"10px 14px",marginBottom:14,cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:20}}>🔔</span>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#f59e0b"}}>{dueRecurring} despesa{dueRecurring>1?"s":""} recorrente{dueRecurring>1?"s":""} a vencer</div><div style={{fontSize:11,color:"#78350f"}}>Toca para ver e registar</div></div>
              <span style={{color:"#f59e0b"}}>→</span>
            </div>
          )}
          {accounts.length>0&&(<div style={{display:"flex",gap:8,overflowX:"auto",marginBottom:14,paddingBottom:4}}>{accounts.map(a=>(<div key={a.id} style={{background:T.cardBg,border:`1px solid ${T.accent}25`,borderRadius:12,padding:"10px 14px",flexShrink:0,minWidth:130}}><div style={{fontSize:12,fontWeight:600,color:T.subtext,marginBottom:2}}>{a.icon} {a.nome}</div><div style={{fontSize:16,fontWeight:800,color:Number(a.saldo)>=0?T.positive:T.negative}}>{fmt(Number(a.saldo))}</div></div>))}</div>)}

          {/* NET WORTH */}
          {accounts.length>0&&(()=>{
            const totalCorrente   = accounts.filter(a=>a.tipo==="corrente").reduce((s,a)=>s+Number(a.saldo),0);
            const totalPoupanca   = accounts.filter(a=>a.tipo==="poupanca").reduce((s,a)=>s+Number(a.saldo),0);
            const totalInvest     = accounts.filter(a=>a.tipo==="investimento").reduce((s,a)=>s+Number(a.saldo),0);
            const totalOutro      = accounts.filter(a=>a.tipo==="outro").reduce((s,a)=>s+Number(a.saldo),0);
            const netWorth        = totalSaldo;
            const rows = [
              {label:"Conta Corrente",    icon:"💳", val:totalCorrente,  color:"#3b82f6", show:totalCorrente!==0},
              {label:"Conta Poupança",    icon:"🏦", val:totalPoupanca,  color:"#10b981", show:totalPoupanca!==0},
              {label:"Investimentos",     icon:"📈", val:totalInvest,    color:"#a78bfa", show:totalInvest!==0},
              {label:"Outros",            icon:"📂", val:totalOutro,     color:"#f59e0b", show:totalOutro!==0},
            ].filter(r=>r.show);
            return(
              <div style={{...S.card,marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <SectionTitle>💎 Net Worth</SectionTitle>
                  <span style={{fontSize:18,fontWeight:800,color:netWorth>=0?T.positive:T.negative,letterSpacing:"-0.5px"}}>{fmt(netWorth)}</span>
                </div>
                {rows.map(r=>(
                  <div key={r.label} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:13}}>{r.icon} {r.label}</span>
                      <span style={{fontSize:13,fontWeight:700,color:r.color}}>{fmt(r.val)}</span>
                    </div>
                    <div style={{height:5,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"hidden"}}>
                      <div style={{width:`${Math.min(100,Math.abs(r.val)/Math.max(Math.abs(netWorth),1)*100)}%`,height:"100%",background:r.color,borderRadius:99,transition:"width .5s"}}/>
                    </div>
                  </div>
                ))}
                <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${T.cardBorder}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:T.subtext,fontWeight:600}}>Total</span>
                  <span style={{fontSize:16,fontWeight:800,color:netWorth>=0?T.positive:T.negative}}>{fmt(netWorth)}</span>
                </div>
              </div>
            );
          })()}
          <div style={S.card}>
            <SectionTitle>Distribuição por tipo — metas</SectionTitle>
            {(Object.entries(TYPE_META) as [TypeKey,typeof TYPE_META[TypeKey]][]).map(([type,meta])=>{
              const actual=byType[type]||0,target=budgetTargets[type],targetAmt=totalExp*(target/100),actualPct=pct(actual,totalExp),over=actual>targetAmt&&totalExp>0;
              return(<div key={type} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:15}}>{meta.icon}</span><span style={{fontSize:13,fontWeight:600,color:over?"#ef4444":meta.color}}>{meta.label}</span><span style={{fontSize:10,color:T.subtext,background:"rgba(255,255,255,0.05)",padding:"2px 7px",borderRadius:99}}>meta {target}%</span></div>
                  <div><span style={{fontSize:14,fontWeight:800,color:over?"#ef4444":meta.color}}>{fmt(actual)}</span><span style={{fontSize:11,color:over?"#ef4444":T.subtext,marginLeft:4}}>({actualPct}%)</span></div>
                </div>
                <div style={{position:"relative",height:8,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"visible"}}>
                  <div style={{position:"absolute",left:0,top:0,bottom:0,width:`${Math.min(100,actualPct)}%`,background:over?"#ef4444":meta.color,borderRadius:99,transition:"width .5s ease"}}/>
                  <div style={{position:"absolute",top:-3,bottom:-3,left:`${target}%`,width:2,background:"rgba(255,255,255,0.3)",borderRadius:1,zIndex:2}}/>
                </div>
                {over&&<div style={{display:"flex",alignItems:"center",gap:7,background:"#450a0a",border:"1px solid #ef444460",borderRadius:8,padding:"7px 10px",marginTop:7}}><span>⚠️</span><span style={{fontSize:11,color:"#f87171"}}>+{fmt(actual-targetAmt)} acima do limite</span></div>}
              </div>);
            })}
            {totalExp===0&&<div style={{color:T.subtext,fontSize:12,textAlign:"center",padding:"8px 0"}}>Regista despesas para ver a distribuição.</div>}
          </div>
          <div style={S.card}>
            <SectionTitle>Top categorias</SectionTitle>
            {byCat.filter(c=>c.total>0).slice(0,6).map(c=>(<div key={c.id} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13}}>{c.icon} {c.label}</span><span style={{fontSize:13,fontWeight:700}}>{fmt(c.total)}</span></div><ProgressBar value={c.total} max={maxCat} color={TYPE_META[c.type]?.color||"#6b7280"} height={4}/></div>))}
            {byCat.filter(c=>c.total>0).length===0&&<div style={{color:T.subtext,fontSize:13,textAlign:"center",padding:"16px 0"}}>Sem despesas.</div>}
          </div>
        </>}

        {/* DESPESAS */}
        {tab==="despesas"&&<>
          {overBudget.length>0&&(<div style={{background:"#450a0a",border:"1px solid #ef4444",borderRadius:12,padding:"12px 14px",marginBottom:14}}><div style={{fontSize:12,fontWeight:700,color:"#fca5a5",marginBottom:5}}>⚠️ Orçamento excedido</div>{overBudget.map(([type])=>{const actual=byType[type]||0,target=budgetTargets[type],targetAmt=totalExp*(target/100),meta=TYPE_META[type];return<div key={type} style={{fontSize:11,color:"#f87171",marginBottom:2}}>{meta.icon} {meta.label}: {pct(actual,totalExp)}% (meta {target}%) · excesso {fmt(actual-targetAmt)}</div>;})}</div>)}
          <div style={S.card}>
            <SectionTitle>Adicionar Despesa</SectionTitle>
            <div style={S.row2}>
              <div><label style={S.lbl}>Descrição</label><input style={S.inp} placeholder="Ex: Renda" value={expForm.descricao} onChange={e=>setExpForm(f=>({...f,descricao:e.target.value}))}/></div>
              <div><label style={S.lbl}>Valor (€)</label><input style={S.inp} type="number" placeholder="0,00" value={expForm.valor} onChange={e=>setExpForm(f=>({...f,valor:e.target.value}))}/></div>
            </div>
            <div style={S.row2}>
              <div><label style={S.lbl}>Categoria</label><select style={S.sel} value={expForm.cat} onChange={e=>setExpForm(f=>({...f,cat:e.target.value,subcat:""}))}>
                <option value="">Selecionar...</option>{expCats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select></div>
              <div><label style={S.lbl}>Data</label><input style={S.inp} type="date" value={expForm.data} onChange={e=>setExpForm(f=>({...f,data:e.target.value}))}/></div>
            </div>
            {selCat?.sub&&(<div style={{marginBottom:10}}><label style={S.lbl}>Sub-categoria</label><div style={{display:"flex",flexWrap:"wrap",gap:7}}>{selCat.sub.map((s:string)=>{const active=expForm.subcat===s;return<button key={s} onClick={()=>setExpForm(f=>({...f,subcat:active?"":s}))} style={{padding:"7px 13px",border:`1.5px solid ${active?T.accent:"rgba(255,255,255,0.13)"}`,borderRadius:99,background:active?`${T.accent}22`:"rgba(255,255,255,0.04)",color:active?T.accent:"#94a3b8",fontSize:12,fontWeight:active?700:500,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>{s}</button>;})}</div></div>)}
            <label style={{...S.lbl,marginTop:4,marginBottom:7}}>Tipo</label>
            <TypeSelector value={expForm.tipo} onChange={(v:TypeKey)=>setExpForm(f=>({...f,tipo:v}))}/>
            <button style={btnAdd} onClick={addExpense}>+ Adicionar Despesa</button>
          </div>
          <div style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px"}}>
            <span style={{fontSize:12,color:T.subtext}}>{myExpenses.length} despesa(s)</span>
            <span style={{fontSize:17,fontWeight:800,color:T.negative}}>{fmt(totalExp)}</span>
          </div>
          {myExpenses.length>0&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>{(Object.entries(TYPE_META) as [TypeKey,typeof TYPE_META[TypeKey]][]).map(([type,meta])=>{const actual=byType[type]||0,target=budgetTargets[type],over=actual>totalExp*(target/100)&&totalExp>0;return(<div key={type} style={{background:over?"#450a0a":meta.bg,border:`1px solid ${over?"#ef4444":meta.color}40`,borderRadius:10,padding:"10px 8px",textAlign:"center"}}><div style={{fontSize:16,marginBottom:2}}>{meta.icon}</div><div style={{fontSize:12,fontWeight:800,color:over?"#ef4444":meta.color}}>{fmt(actual)}</div><div style={{fontSize:10,color:T.subtext,marginTop:1}}>{pct(actual,totalExp)}% / {target}%</div>{over&&<div style={{fontSize:10,color:"#ef4444",fontWeight:700,marginTop:2}}>⚠️</div>}</div>);})}</div>)}
          <div style={S.card}>
            {myExpenses.length===0&&<div style={{color:T.subtext,fontSize:13,textAlign:"center",padding:"24px 0"}}>Sem despesas para este período.</div>}
            {myExpenses.map(e=>{const cat=expCats.find(c=>c.id===e.cat);return(<div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:`1px solid ${T.cardBorder}`}}><span style={{fontSize:20,minWidth:28,textAlign:"center"}}>{cat?.icon||"📦"}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:"#e2e8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.descricao}{e.subcat?<span style={{color:T.subtext}}> · {e.subcat}</span>:""}</div><div style={{display:"flex",alignItems:"center",gap:5,marginTop:3}}><span style={{fontSize:10,color:T.subtext}}>{new Date(e.data+"T12:00:00").toLocaleDateString("pt-PT")}</span><Tag type={e.tipo}/></div></div><span style={{fontSize:14,fontWeight:700,color:T.negative,minWidth:68,textAlign:"right"}}>{fmt(Number(e.valor))}</span><button onClick={()=>deleteExpense(e.id)} style={{background:"none",border:"none",cursor:"pointer",color:T.subtext,fontSize:15,padding:"0 2px"}}>✕</button></div>);})}
          </div>
        </>}

        {/* RECORRENTES */}
        {tab==="recorrentes"&&(
          <RecurringExpenses
            userId={user.id} world={world} expCats={expCats}
            accent={T.accent} accentDark={T.accentDark} cardBg={T.cardBg}
            cardBorder={T.cardBorder} subtext={T.subtext} positive={T.positive} negative={T.negative}
            recurring={recurring} setRecurring={setRecurring} onApplyDue={applyRecurring}
          />
        )}

        {/* OBJETIVOS */}
        {tab==="objetivos"&&(
          <SavingsGoals
            userId={user.id} accent={T.accent} accentDark={T.accentDark}
            cardBg={T.cardBg} cardBorder={T.cardBorder} subtext={T.subtext}
            positive={T.positive} negative={T.negative}
            goals={goals} setGoals={setGoals}
          />
        )}

        {/* MODO CASAL */}
        {tab==="casal"&&(
          <CoupleMode
            userId={user.id} userEmail={user.email||""} userName={userName}
            expCats={expCats} accent={T.accent} accentDark={T.accentDark}
            cardBg={T.cardBg} cardBorder={T.cardBorder} subtext={T.subtext}
            positive={T.positive} negative={T.negative}
          />
        )}

        {/* COMPARAÇÃO MENSAL */}
        {tab==="comparacao"&&(
          <MonthComparison
            expenses={expenses} incomes={incomes} expCats={expCats} world={world}
            accent={T.accent} cardBg={T.cardBg} cardBorder={T.cardBorder}
            subtext={T.subtext} positive={T.positive} negative={T.negative}
          />
        )}

        {/* RENDIMENTOS */}
        {tab==="rendimentos"&&<>
          <div style={S.card}>
            <SectionTitle>Adicionar Rendimento</SectionTitle>
            <div style={S.row2}>
              <div><label style={S.lbl}>Descrição</label><input style={S.inp} placeholder="Ex: Salário" value={incForm.descricao} onChange={e=>setIncForm(f=>({...f,descricao:e.target.value}))}/></div>
              <div><label style={S.lbl}>Valor (€)</label><input style={S.inp} type="number" placeholder="0,00" value={incForm.valor} onChange={e=>setIncForm(f=>({...f,valor:e.target.value}))}/></div>
            </div>
            <div style={S.row2}>
              <div><label style={S.lbl}>Fonte</label><select style={S.sel} value={incForm.cat} onChange={e=>setIncForm(f=>({...f,cat:e.target.value}))}><option value="">Selecionar...</option>{incCats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select></div>
              <div><label style={S.lbl}>Data</label><input style={S.inp} type="date" value={incForm.data} onChange={e=>setIncForm(f=>({...f,data:e.target.value}))}/></div>
            </div>
            <button style={btnAdd} onClick={addIncome}>+ Adicionar Rendimento</button>
          </div>
          <div style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px"}}>
            <span style={{fontSize:12,color:T.subtext}}>{myIncomes.length} entrada(s)</span>
            <span style={{fontSize:17,fontWeight:800,color:T.positive}}>{fmt(totalInc)}</span>
          </div>
          <div style={S.card}>
            {myIncomes.length===0&&<div style={{color:T.subtext,fontSize:13,textAlign:"center",padding:"24px 0"}}>Sem rendimentos registados.</div>}
            {myIncomes.map(i=>{const cat=incCats.find(c=>c.id===i.cat);return(<div key={i.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:`1px solid ${T.cardBorder}`}}><span style={{fontSize:20,minWidth:28,textAlign:"center"}}>{cat?.icon||"📦"}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:"#e2e8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{i.descricao}</div><div style={{fontSize:11,color:T.subtext,marginTop:2}}>{new Date(i.data+"T12:00:00").toLocaleDateString("pt-PT")} · {cat?.label}</div></div><span style={{fontSize:14,fontWeight:700,color:T.positive,minWidth:68,textAlign:"right"}}>{fmt(Number(i.valor))}</span><button onClick={()=>deleteIncome(i.id)} style={{background:"none",border:"none",cursor:"pointer",color:T.subtext,fontSize:15,padding:"0 2px"}}>✕</button></div>);})}
          </div>
          {myIncomes.length>0&&(<div style={S.card}><SectionTitle>Por fonte</SectionTitle>{byIncCat.filter(c=>c.total>0).map(c=>(<div key={c.id} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13}}>{c.icon} {c.label}</span><span style={{fontSize:13,fontWeight:700,color:T.positive}}>{fmt(c.total)} <span style={{fontSize:11,color:T.subtext,fontWeight:400}}>({pct(c.total,totalInc)}%)</span></span></div><ProgressBar value={c.total} max={maxInc} color={T.positive} height={4}/></div>))}</div>)}
        </>}

        {/* PROGRESSÃO */}
        {tab==="progressao"&&<>
          <div style={{display:"flex",gap:6,marginBottom:16}}>{["2024","2025","2026"].map(y=>(<button key={y} onClick={()=>setRevYear(y)} style={{flex:1,padding:"9px 0",border:`1px solid ${revYear===y?T.accent:T.cardBorder}`,borderRadius:9,background:revYear===y?`${T.accent}22`:"transparent",color:revYear===y?T.accent:T.subtext,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>{y}</button>))}</div>
          <div style={S.sg}>
            <StatCard label={`Receita ${revYear}`} value={revArr.reduce((s:number,v:number)=>s+v,0)} color={T.positive}/>
            <StatCard label={`Despesas ${revYear}`} value={expenses.filter(e=>e.world===world&&String(new Date(e.data).getFullYear())===revYear).reduce((s,e)=>s+Number(e.valor),0)} color={T.negative}/>
          </div>
          <div style={S.card}>
            <SectionTitle>Receita mensal — {revYear} (toca para editar)</SectionTitle>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {MONTHS.map((m,i)=>{
                const v=revArr[i]||0,expM=expenses.filter(e=>e.world===world&&new Date(e.data).getMonth()===i&&String(new Date(e.data).getFullYear())===revYear).reduce((s,e)=>s+Number(e.valor),0),net=v-expM;
                return(<div key={i} onClick={()=>{setRevEdit(i);setRevVal(String(v));}} style={{background:T.cardBg,border:`1px solid ${revEdit===i?T.accent:T.cardBorder}`,borderRadius:10,padding:"10px 12px",cursor:"pointer",transition:"border .2s"}}>
                  <div style={{fontSize:11,color:T.subtext,marginBottom:4,fontWeight:600}}>{m}</div>
                  {revEdit===i?<input autoFocus style={{...S.inp,padding:"4px 6px",fontSize:13,height:28}} type="number" value={revVal} onChange={e=>setRevVal(e.target.value)} onBlur={saveRevCell} onKeyDown={e=>{if(e.key==="Enter")saveRevCell();if(e.key==="Escape")setRevEdit(null);}}/>
                  :<><div style={{fontSize:13,fontWeight:700,color:v>0?T.positive:T.subtext}}>{fmt(v)}</div>{v>0&&<div style={{fontSize:10,color:net>=0?T.positive:T.negative,marginTop:2}}>líq: {fmt(net)}</div>}</>}
                </div>);
              })}
            </div>
          </div>
          <div style={S.card}>
            <SectionTitle>Receita vs Despesas — {revYear}</SectionTitle>
            <div style={{display:"flex",alignItems:"flex-end",gap:4,height:90,marginBottom:8}}>
              {MONTHS.map((m,i)=>{
                const rev=revArr[i]||0,exp=expenses.filter(e=>e.world===world&&new Date(e.data).getMonth()===i&&String(new Date(e.data).getFullYear())===revYear).reduce((s,e)=>s+Number(e.valor),0),rH=Math.round((rev/maxBar)*78)||2,eH=Math.round((exp/maxBar)*78)||2;
                return(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><div style={{display:"flex",alignItems:"flex-end",gap:1,height:78}}><div style={{width:"45%",height:rH,background:T.positive,borderRadius:"3px 3px 0 0",transition:"height .4s"}}/><div style={{width:"45%",height:eH,background:T.negative,borderRadius:"3px 3px 0 0",transition:"height .4s"}}/></div><span style={{fontSize:8,color:T.subtext}}>{m}</span></div>);
              })}
            </div>
            <div style={{display:"flex",gap:14}}>
              <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#94a3b8"}}><div style={{width:10,height:10,borderRadius:2,background:T.positive}}/>Receita</div>
              <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#94a3b8"}}><div style={{width:10,height:10,borderRadius:2,background:T.negative}}/>Despesas</div>
            </div>
          </div>
        </>}

      </div>
    </div>
  );
}
