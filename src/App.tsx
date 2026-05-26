import { useState, useMemo, useEffect, ReactNode, CSSProperties } from "react";
import { createClient, User as SBUser } from "@supabase/supabase-js";
import RecurringExpenses, { RecurringExpense } from "./RecurringExpenses";
import SavingsGoals, { SavingsGoal } from "./SavingsGoals";
import MonthComparison from "./MonthComparison";
import WorldEditor from "./WorldEditor";
import CoupleMode from "./CoupleMode";
import { supabase } from "./supabase";
import ExportData from "./ExportData";
import SubscriptionModal from "./SubscriptionModal";
import { usePlan } from "./usePlan";

type TypeKey = "necessidade"|"desejo"|"investimento";
type ThemeKey = "original"|"aurora"|"ocean"|"nebula"|"verde"|"premium";
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
  verde: { name:"Verde", emoji:"🌿", root:"#080f0d", header:"linear-gradient(135deg,#061a12,#0a2218)", accent:"#00c37a", accentDark:"#009960", accent2:"#7c3aed", positive:"#00c37a", negative:"#ff5c8d", subtext:"#3d7a5f", worldBtn:"linear-gradient(135deg,#00c37a,#7c3aed)", cardBg:"rgba(0,195,122,0.04)", cardBorder:"rgba(0,195,122,0.1)", glow1:"rgba(0,195,122,0.12)", glow2:"rgba(124,58,237,0.08)" },
premium: { name:"Premium", emoji:"🖤", root:"#0A0D14", header:"linear-gradient(135deg,#0A0D14,#0F1420)", accent:"#5DA9FF", accentDark:"#3d8fd9", accent2:"#8B6DFF", positive:"#57E3A0", negative:"#FF7D7D", subtext:"#667085", worldBtn:"linear-gradient(135deg,#5DA9FF,#8B6DFF)", cardBg:"#151B2D", cardBorder:"rgba(255,255,255,0.08)", glow1:"rgba(139,109,255,0.08)", glow2:"rgba(93,169,255,0.06)" },
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
  { title:"Olá! 👋",                    desc:"Bem-vindo ao MyOwnFintrack! Faz este tour rápido para perceberes como tudo funciona.", anchor:"middle", pwa:false },
  { title:"Dashboard 📊",               desc:"Vês o teu balanço em tempo real — receitas, despesas, resultado do mês e evolução do Net Worth.", anchor:"middle", pwa:false },
  { title:"Modo Casal 💑",              desc:"O teu diferenciador. Gere despesas partilhadas, acertos automáticos e metas conjuntas com o teu parceiro/a. Disponível no plano Premium.", anchor:"middle", pwa:false },
  { title:"Metas de poupança 🎯",        desc:"Cria objetivos pessoais ou partilhados — férias, casa, carro. Acompanha o progresso de ambos em tempo real.", anchor:"middle", pwa:false },
  { title:"Despesas recorrentes 🔄",     desc:"Regista renda, ginásio ou subscrições uma vez — a app avisa quando é altura de as registar.", anchor:"middle", pwa:false },
  { title:"Menu lateral ☰",             desc:"Acede a todas as secções pelo menu no canto superior esquerdo — despesas, rendimentos, comparação mensal e exportação.", anchor:"top", pwa:false },
  { title:"Definições ⚙️",              desc:"Personaliza contas bancárias, categorias, tema visual e os nomes dos teus mundos (pessoal e clínica).", anchor:"top", pwa:false },
  { title:"Instala a app 📱",            desc:"", anchor:"middle", pwa:true },
  { title:"Tudo pronto! 🎉",             desc:"Os teus dados estão seguros na cloud — acedes de qualquer dispositivo. Tens 14 dias Premium grátis para experimentares tudo!", anchor:"middle", pwa:false },
];

const fmt = (n:number) => new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR"}).format(n||0);
const pct = (part:number,total:number) => total>0?Math.round((part/total)*100):0;

// ─── LEFT NAV DRAWER ──────────────────────────────────────────────────────────

type NavTab = "resumo"|"despesas"|"rendimentos"|"objetivos"|"comparacao"|"casal"|"exportar"|"definicoes";

interface NavItem { id: NavTab; label: string; icon: string; }

const LEFT_NAV_ITEMS: NavItem[] = [
  { id:"resumo",      label:"Dashboard",   icon:"📊" },
  { id:"casal",       label:"Modo Casal",  icon:"👫" },
  { id:"objetivos",   label:"Metas",       icon:"🎯" },
  { id:"despesas",    label:"Despesas",    icon:"📥" },
  { id:"rendimentos", label:"Rendimentos", icon:"💶" },
  { id:"comparacao",  label:"Comparação",  icon:"📈" },
  { id:"exportar",    label:"Exportar",    icon:"📤" },
  { id:"definicoes",  label:"Definições",  icon:"⚙️" },
];

function LeftNav({ isOpen, onClose, activeTab, onNavigate, accent, accentDark, onSettings }: {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onNavigate: (tab: string) => void;
  accent: string;
  accentDark: string;
  onSettings: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && isOpen) onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleNav = (tab: string) => {
  if(tab === "definicoes") { onSettings(); return; }
  onNavigate(tab);
  onClose();
};

  return (
    <>
      <style>{`
        .lnav-backdrop {
          position: fixed; inset: 0; z-index: 40;
          background: rgba(5,10,20,0.72);
          backdrop-filter: blur(3px);
          opacity: 0; pointer-events: none;
          transition: opacity 0.25s ease;
        }
        .lnav-backdrop.open { opacity: 1; pointer-events: all; }

        .lnav-drawer {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: 260px; max-width: 82vw;
          z-index: 50;
          background: #0b0e18;
          border-right: 1px solid rgba(255,255,255,0.07);
          display: flex; flex-direction: column;
          transform: translateX(-100%);
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
          will-change: transform;
        }
        .lnav-drawer.open {
          transform: translateX(0);
          box-shadow: 6px 0 40px rgba(0,0,0,0.55);
        }

        .lnav-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 18px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .lnav-logo { display: flex; align-items: center; gap: 9px; }
        .lnav-logo-icon {
          width: 30px; height: 30px; border-radius: 8px;
          background: linear-gradient(135deg, var(--lnav-accent), var(--lnav-accent-dark));
          display: flex; align-items: center; justify-content: center;
          font-size: 15px;
          box-shadow: 0 0 14px color-mix(in srgb, var(--lnav-accent) 40%, transparent);
        }
        .lnav-logo-text {
          font-family: 'Sora', sans-serif; font-size: 13px;
          font-weight: 700; color: #f0f0f0; line-height: 1.2;
        }
        .lnav-logo-sub {
          font-size: 10px; font-weight: 400;
          color: rgba(255,255,255,0.3); display: block; margin-top: 1px;
        }
        .lnav-close {
          width: 30px; height: 30px; border-radius: 7px;
          border: 1px solid rgba(255,255,255,0.08);
          background: transparent; color: rgba(255,255,255,0.35);
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 14px; transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .lnav-close:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.8); }

        .lnav-section-label {
          font-family: 'Sora', sans-serif; font-size: 10px; font-weight: 700;
          letter-spacing: 0.11em; text-transform: uppercase;
          color: rgba(255,255,255,0.22);
          padding: 12px 16px 6px;
        }
        .lnav-nav { flex: 1; padding: 6px 10px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }

        .lnav-item {
          display: flex; align-items: center; gap: 11px;
          padding: 11px 12px; border-radius: 10px;
          border: 1px solid transparent;
          background: transparent; width: 100%; text-align: left;
          cursor: pointer; transition: all 0.15s ease;
          position: relative; overflow: hidden;
          font-family: 'Sora', sans-serif;
        }
        .lnav-item:hover:not(.active) {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.06);
        }
        .lnav-item.active {
          background: color-mix(in srgb, var(--lnav-accent) 12%, transparent);
          border-color: color-mix(in srgb, var(--lnav-accent) 28%, transparent);
        }
        .lnav-item.active::before {
          content: ''; position: absolute; left: 0; top: 22%; bottom: 22%;
          width: 3px; border-radius: 0 3px 3px 0;
          background: var(--lnav-accent);
          box-shadow: 0 0 8px color-mix(in srgb, var(--lnav-accent) 60%, transparent);
        }
        .lnav-item-icon {
          width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
          background: rgba(255,255,255,0.05);
          display: flex; align-items: center; justify-content: center;
          font-size: 17px; transition: background 0.15s;
        }
        .lnav-item.active .lnav-item-icon {
          background: color-mix(in srgb, var(--lnav-accent) 20%, transparent);
        }
        .lnav-item-label {
          font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.5);
          transition: color 0.15s; line-height: 1;
        }
        .lnav-item:hover .lnav-item-label { color: rgba(255,255,255,0.88); }
        .lnav-item.active .lnav-item-label { color: #fff; font-weight: 700; }

        .lnav-footer {
          padding: 12px 18px;
          border-top: 1px solid rgba(255,255,255,0.05);
          font-family: 'Sora', sans-serif;
          font-size: 10px; color: rgba(255,255,255,0.18);
          text-align: center; letter-spacing: 0.02em;
        }

        .lnav-hamburger {
          width: 36px; height: 36px; border-radius: 9px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.65);
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 18px; transition: all 0.16s ease;
          flex-shrink: 0;
        }
        .lnav-hamburger:hover {
          background: color-mix(in srgb, var(--lnav-accent) 12%, transparent);
          border-color: color-mix(in srgb, var(--lnav-accent) 35%, transparent);
          color: var(--lnav-accent);
        }
      `}</style>

      {/* Backdrop */}
      <div className={`lnav-backdrop${isOpen ? " open" : ""}`} onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <div
        className={`lnav-drawer${isOpen ? " open" : ""}`}
        role="dialog" aria-modal="true" aria-label="Menu de navegação"
        style={{ "--lnav-accent": accent, "--lnav-accent-dark": accentDark } as React.CSSProperties}
      >
        {/* Header */}
        <div className="lnav-header">
          <div className="lnav-logo">
            <div className="lnav-logo-icon"><img src="/favicon.svg" width="18" height="18" style={{borderRadius:4}}/></div>
            <div className="lnav-logo-text">
              FinTrack
              <span className="lnav-logo-sub">myownfintrack</span>
            </div>
          </div>
          <button className="lnav-close" onClick={onClose} aria-label="Fechar menu">✕</button>
        </div>

        {/* Nav */}
        <nav className="lnav-nav" aria-label="Navegação principal">
          <div className="lnav-section-label">Menu</div>
          {LEFT_NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`lnav-item${activeTab === item.id ? " active" : ""}`}
              onClick={() => handleNav(item.id)}
              aria-current={activeTab === item.id ? "page" : undefined}
            >
              <span className="lnav-item-icon">{item.icon}</span>
              <span className="lnav-item-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="lnav-footer">myownfintrack.netlify.app</div>
      </div>
    </>
  );
}

// ─── END LEFT NAV ─────────────────────────────────────────────────────────────

function Tour({userName,accent,onFinish}:{userName:string;accent:string;onFinish:()=>void}) {
  const [step,setStep]=useState(0);
  const cur=TOUR_STEPS[step];
  const isLast=step===TOUR_STEPS.length-1;
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
            <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"12px 14px",marginBottom:8}}>
              <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:8}}>🍎 iPhone / iPad (Safari)</div>
              {[{icon:"📤",text:"Toca no ícone de partilha em baixo"},{icon:"➕",text:"\"Adicionar ao ecrã de início\""},{icon:"✅",text:"Toca em \"Adicionar\" — pronto!"}].map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <div style={{width:28,height:28,borderRadius:8,background:`${accent}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{s.icon}</div>
                  <span style={{fontSize:12,color:"#cbd5e1"}}>{s.text}</span>
                </div>
              ))}
            </div>
            <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"12px 14px"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:8}}>🤖 Android (Chrome)</div>
              {[{icon:"⋮",text:"Toca nos 3 pontos no canto superior"},{icon:"➕",text:"\"Adicionar ao ecrã principal\""},{icon:"✅",text:"Confirma — o ícone aparece!"}].map((s,i)=>(
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
function TypeSelector({value,onChange,byType,totalInc,budgetTargets}:{value:TypeKey;onChange:(v:TypeKey)=>void;byType:Record<TypeKey,number>;totalInc:number;budgetTargets:BudgetTargets}) {
  return (
    <div style={{display:"flex",flexDirection:"column" as const,gap:6}}>
      {(Object.entries(TYPE_META) as [TypeKey,typeof TYPE_META[TypeKey]][]).map(([type,meta])=>{
        const active=value===type;
        const actual=byType[type]||0;
        const target=budgetTargets[type];
        const actualPct=totalInc>0?Math.round((actual/totalInc)*100):0;
        const over=actual>totalInc*(target/100)&&totalInc>0;
        return(
          <button key={type} onClick={()=>onChange(type)} style={{padding:"10px 14px",border:`1.5px solid ${active?meta.color:over?"rgba(239,68,68,0.3)":"rgba(255,255,255,0.09)"}`,borderRadius:10,background:active?meta.bg:over?"rgba(239,68,68,0.05)":"rgba(255,255,255,0.03)",cursor:"pointer",textAlign:"left" as const,fontFamily:"'Sora',sans-serif",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>{meta.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:active?meta.color:over?"#ef4444":"#94a3b8"}}>{meta.label}</div>
              <div style={{height:3,borderRadius:99,background:"rgba(255,255,255,0.07)",marginTop:4,overflow:"hidden"}}>
                <div style={{width:`${Math.min(100,actualPct)}%`,height:"100%",background:over?"#ef4444":meta.color,borderRadius:99}}/>
              </div>
            </div>
            <div style={{textAlign:"right" as const}}>
              <div style={{fontSize:12,fontWeight:700,color:over?"#ef4444":meta.color}}>{fmt(actual)}</div>
              <div style={{fontSize:10,color:over?"#ef4444":"#64748b"}}>{actualPct}% / {target}%{over?" ⚠️":""}</div>
            </div>
          </button>
        );
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

// ============================================================
// PASSO 1 — Copia landing.html para public/
// cp landing.html ~/Desktop/finan-as/public/landing.html
//
// PASSO 2 — No App.tsx, substitui a função WelcomeScreen
// completa por esta abaixo
// ============================================================

function WelcomeScreen() {
  const [mode, setMode] = useState<"welcome" | "login" | "register">("welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Escuta mensagens do iframe (landing.html)
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "OPEN_REGISTER") setMode("register");
      if (e.data?.type === "OPEN_LOGIN") setMode("login");
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  async function handleAuth() {
    setError(""); setLoading(true);
    try {
      if (mode === "register") {
        if (!name.trim() || !email.trim() || !password.trim()) { setError("Preenche todos os campos."); setLoading(false); return; }
        const { error: e } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
        if (e) throw e;
      } else {
        if (!email.trim() || !password.trim()) { setError("Preenche email e password."); setLoading(false); return; }
        const { error: e } = await supabase.auth.signInWithPassword({ email, password });
        if (e) throw e;
      }
    } catch (e: any) {
      const msg = e.message || "Erro";
      if (msg.includes("Invalid login")) setError("Email ou password incorretos.");
      else if (msg.includes("already registered")) setError("Email já registado.");
      else setError(msg);
    }
    setLoading(false);
  }

  const inp: CSSProperties = { width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "13px 14px", color: "#e2e8f0", fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "'Sora',sans-serif" };
  const lbl: CSSProperties = { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 };

  // ECRÃ LOGIN / REGISTER — mantém o teu design original
  if (mode === "login" || mode === "register") return (
    <div style={{ minHeight: "100vh", background: "#0A0D14", display: "flex", flexDirection: "column", fontFamily: "'Sora',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}} input::placeholder{color:#374151}`}</style>
      <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => { setMode("welcome"); setError(""); }} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "7px 12px", color: "#64748b", fontSize: 13, cursor: "pointer", fontFamily: "'Sora',sans-serif" }}>←</button>
        <div style={{ width: 26, height: 26, borderRadius: 8, overflow: "hidden" }}><img src="/favicon.svg" width="26" height="26" style={{borderRadius:8}}/></div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>MyOwnFintrack</span>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px 40px" }}>
        <div style={{ width: "100%", maxWidth: 380, animation: "fadeUp .45s ease" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg,#5DA9FF,#8B6DFF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
              {mode === "login" ? "Bem-vindo de volta" : "Começa gratuitamente"}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.5px", lineHeight: 1.25 }}>
              {mode === "login" ? "Entra na tua conta" : "Cria a tua conta agora"}
            </div>
          </div>
          <div style={{ background: "rgba(21,27,45,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "26px 22px" }}>
            <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 4, marginBottom: 22 }}>
              {(["login", "register"] as const).map(s => (
                <button key={s} onClick={() => { setMode(s); setError(""); }} style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 9, background: mode === s ? "rgba(93,169,255,0.2)" : "transparent", color: mode === s ? "#5DA9FF" : "#475569", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Sora',sans-serif" }}>
                  {s === "login" ? "Entrar" : "Criar conta"}
                </button>
              ))}
            </div>
            {mode === "register" && <div style={{ marginBottom: 12 }}><label style={lbl}>Nome</label><input style={inp} placeholder="O teu nome" value={name} onChange={e => setName(e.target.value)} /></div>}
            <div style={{ marginBottom: 12 }}><label style={lbl}>Email</label><input style={inp} type="email" placeholder="email@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div style={{ marginBottom: error ? 12 : 22 }}><label style={lbl}>Password</label><input style={inp} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAuth()} /></div>
            {error && <div style={{ background: "#450a0a", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 9, padding: "10px 13px", marginBottom: 16, fontSize: 12, color: "#f87171" }}>⚠️ {error}</div>}
            <button onClick={handleAuth} disabled={loading} style={{ width: "100%", padding: "14px 0", background: "linear-gradient(135deg,#5DA9FF,#8B6DFF)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 800, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Sora',sans-serif", opacity: loading ? 0.7 : 1, boxShadow: "0 4px 20px rgba(93,169,255,0.3)" }}>
              {loading ? "A processar..." : mode === "login" ? "Entrar →" : "Criar conta →"}
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: 18, fontSize: 11, color: "#1f2937" }}>🔒 Dados privados e encriptados</div>
        </div>
      </div>
    </div>
  );

  // ECRÃ WELCOME — iframe com a landing page
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#0A0D14" }}>
      <iframe
        src="/landing.html"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        title="MyOwnFintrack Landing"
      />
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
  if(loading)return(<div style={{minHeight:"100vh",background:"#080810",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif"}}><div style={{textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}><img src="/favicon.svg" width="40" height="40" style={{borderRadius:9}}/></div><div style={{fontSize:14,color:"#475569"}}>A carregar...</div></div></div>);
  if(!sbUser)return <WelcomeScreen/>;
  return <MainApp user={sbUser} userName={userName} onLogout={()=>supabase.auth.signOut()}/>;
}

function MainApp({user,userName,onLogout}:{user:SBUser;userName:string;onLogout:()=>void}) {
  const [world,setWorld]=useState("pessoal");
  const [tab,setTab]=useState("resumo");
  const [sidebarOpen,setSidebarOpen]=useState(false);      // existing right sidebar (⚙️)
  const [leftNavOpen,setLeftNavOpen]=useState(false);       // ← NEW left nav drawer
  const [showFilterMenu,setShowFilterMenu]=useState(false);
  const [showAddModal,setShowAddModal]=useState(false);
  const [themeKey,setThemeKey]=useState<ThemeKey>("premium");
  const T=THEMES[themeKey];
  const { plan, isBeta, isPremium, hasFullAccess, setPlan, isTrial, trialDaysLeft } = usePlan(user.id);
  const [showPricing, setShowPricing] = useState(false);
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
  const [expIsRecurring,setExpIsRecurring]=useState(false);
  const [incForm,setIncForm]=useState({descricao:"",valor:"",cat:"",data:today});
  const [revEdit,setRevEdit]=useState<number|null>(null);const [revVal,setRevVal]=useState("");
  const [revYear,setRevYear]=useState(String(new Date().getFullYear()));
  const [fMonth,setFMonth]=useState(String(new Date().getMonth()));const [fYear,setFYear]=useState(String(new Date().getFullYear()));
  const [editingExp,setEditingExp]=useState<number|null>(null);
  const [editingInc,setEditingInc]=useState<number|null>(null);
  const [hideValues, setHideValues] = useState(false);
  const [chartView, setChartView] = useState<"networth"|"fluxo">("fluxo");
  const [nwSnapshots, setNwSnapshots] = useState<{mes:number;ano:number;valor:number}[]>([]);


  useEffect(()=>{loadAll();},[user.id]);

  async function loadAll(){
    setDataLoading(true);
    const uid=user.id;
    const [expR,incR,accR,trR,recR,goalsR,mrR,setR,snapR]=await Promise.all([
      supabase.from("expenses").select("*").eq("user_id",uid).order("data",{ascending:false}),
      supabase.from("incomes").select("*").eq("user_id",uid).order("data",{ascending:false}),
      supabase.from("accounts").select("*").eq("user_id",uid).order("created_at"),
      supabase.from("transfers").select("*").eq("user_id",uid).order("data",{ascending:false}),
      supabase.from("recurring_expenses").select("*").eq("user_id",uid).order("proxima_data"),
      supabase.from("savings_goals").select("*").eq("user_id",uid).order("prazo"),
      supabase.from("monthly_revenue").select("*").eq("user_id",uid),
      supabase.from("user_settings").select("*").eq("user_id",uid).single(),
      supabase.from("net_worth_snapshots").select("mes,ano,valor").eq("user_id",uid).eq("ano",new Date().getFullYear()),
    ]);
    if(expR.data)setExpenses(expR.data as Expense[]);
    if(incR.data)setIncomes(incR.data as Income[]);
    if(accR.data){
      setAccounts(accR.data as BankAccount[]);
      // Guarda snapshot do net worth do mês actual
      const valor = (accR.data as BankAccount[]).reduce((s,a)=>s+Number(a.saldo),0);
      const now = new Date();
      supabase.from("net_worth_snapshots").upsert(
        { user_id:uid, mes:now.getMonth(), ano:now.getFullYear(), valor },
        { onConflict:"user_id,mes,ano" }
      );
    }
    if(trR.data)setTransfers(trR.data as Transfer[]);
    if(recR.data)setRecurring(recR.data as RecurringExpense[]);
    if(goalsR.data)setGoals(goalsR.data as SavingsGoal[]);
    if(mrR.data){const rev:Record<string,Record<string,number[]>>={};(mrR.data as any[]).forEach(r=>{if(!rev[r.world])rev[r.world]={};if(!rev[r.world][r.year])rev[r.world][r.year]=new Array(12).fill(0);rev[r.world][r.year][r.month]=Number(r.valor);});setMonthlyRev(rev);}
    if(setR.data){const s=setR.data as any;setBudgetTargets({necessidade:s.budget_necessidade,desejo:s.budget_desejo,investimento:s.budget_investimento});if(s.enabled_p_exp)setEnabledPExp(s.enabled_p_exp);if(s.enabled_p_inc)setEnabledPInc(s.enabled_p_inc);if(s.enabled_c_exp)setEnabledCExp(s.enabled_c_exp);if(s.enabled_c_inc)setEnabledCInc(s.enabled_c_inc);if(s.custom_exp_cats)setCustomExpCats(s.custom_exp_cats);if(s.custom_inc_cats)setCustomIncCats(s.custom_inc_cats);if(s.theme)setThemeKey(s.theme as ThemeKey);if(s.world1_name)setWorld1Name(s.world1_name);if(s.world1_icon)setWorld1Icon(s.world1_icon);if(s.world2_name)setWorld2Name(s.world2_name);if(s.world2_icon)setWorld2Icon(s.world2_icon);if(!s.tour_done)setShowTour(true);}
    if(snapR.data)setNwSnapshots(snapR.data as {mes:number;ano:number;valor:number}[]);
    setDataLoading(false);
  }

  async function saveSettings(patch:Record<string,any>){await supabase.from("user_settings").upsert({user_id:user.id,theme:"premium",...patch});}
  async function changeTheme(k:ThemeKey){setThemeKey(k);await saveSettings({theme:k});}
  async function saveWorlds(){await saveSettings({world1_name:world1Name,world1_icon:world1Icon,world2_name:world2Name,world2_icon:world2Icon});setEditingWorlds(false);}
  async function finishTour(){setShowTour(false);await saveSettings({tour_done:true,theme:"premium"});}

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
  const hv = (val: string) => hideValues ? "••••" : val;
  const byType=useMemo(()=>{const map:Record<TypeKey,number>={necessidade:0,desejo:0,investimento:0};myExpenses.forEach(e=>{if(e.tipo in map)map[e.tipo]+=Number(e.valor);});return map;},[myExpenses]);
  const byCat=useMemo(()=>expCats.map(c=>({...c,total:myExpenses.filter(e=>e.cat===c.id).reduce((s,e)=>s+Number(e.valor),0)})).sort((a,b)=>b.total-a.total),[myExpenses,expCats]);
  const byIncCat=useMemo(()=>incCats.map(c=>({...c,total:myIncomes.filter(i=>i.cat===c.id).reduce((s,i)=>s+Number(i.valor),0)})).sort((a,b)=>b.total-a.total),[myIncomes,incCats]);
  const maxCat=Math.max(...byCat.map(c=>c.total),1);
  const maxInc=Math.max(...byIncCat.map(c=>c.total),1);
  const revArr:number[]=monthlyRev[world]?.[revYear]||new Array(12).fill(0);
  const maxBar=Math.max(...revArr,...MONTHS.map((_,i)=>expenses.filter(e=>e.world===world&&new Date(e.data).getMonth()===i&&String(new Date(e.data).getFullYear())===revYear).reduce((s,e)=>s+Number(e.valor),0)),1);
  const overBudget=(Object.entries(budgetTargets) as [TypeKey,number][]).filter(([type,target])=>(byType[type]||0)>totalInc*(target/100)&&totalInc>0);
  const totalSaldo=accounts.reduce((s,a)=>s+Number(a.saldo),0);
  const dueRecurring=recurring.filter(r=>r.world===world&&r.ativa&&r.proxima_data<=today).length;

  async function updateExpense(id:number){if(!expForm.descricao.trim()||!expForm.valor||!expForm.cat)return;await supabase.from("expenses").update({descricao:expForm.descricao.trim(),valor:Number(expForm.valor),cat:expForm.cat,subcat:expForm.subcat,data:expForm.data,tipo:expForm.tipo}).eq("id",id);setExpenses(p=>p.map(e=>e.id===id?{...e,descricao:expForm.descricao.trim(),valor:Number(expForm.valor),cat:expForm.cat,subcat:expForm.subcat,data:expForm.data,tipo:expForm.tipo}:e));setEditingExp(null);setExpForm(f=>({...f,descricao:"",valor:"",subcat:""}));}
  async function updateIncome(id:number){if(!incForm.descricao.trim()||!incForm.valor||!incForm.cat)return;await supabase.from("incomes").update({descricao:incForm.descricao.trim(),valor:Number(incForm.valor),cat:incForm.cat,data:incForm.data}).eq("id",id);setIncomes(p=>p.map(i=>i.id===id?{...i,descricao:incForm.descricao.trim(),valor:Number(incForm.valor),cat:incForm.cat,data:incForm.data}:i));setEditingInc(null);setIncForm(f=>({...f,descricao:"",valor:""}));}
  async function addExpense(){
  if(!expForm.descricao.trim()||!expForm.valor||!expForm.cat)return;
  const{data,error}=await supabase.from("expenses").insert({user_id:user.id,...expForm,valor:Number(expForm.valor),world}).select().single();
  if(!error&&data){
    setExpenses(p=>[data as Expense,...p]);
    if(expIsRecurring){
      await supabase.from("recurring_expenses").insert({
        user_id:user.id, descricao:expForm.descricao.trim(),
        valor:Number(expForm.valor), cat:expForm.cat, subcat:expForm.subcat,
        tipo:expForm.tipo, frequencia:"mensal", dia_do_mes:null,
        proxima_data:expForm.data, world, ativa:true,
      });
      const{data:rec}=await supabase.from("recurring_expenses").select("*").eq("user_id",user.id).order("proxima_data");
      if(rec)setRecurring(rec as RecurringExpense[]);
    }
    setExpForm(f=>({...f,descricao:"",valor:"",subcat:""}));
    setExpIsRecurring(false);
  }
}
  async function deleteExpense(id:number){await supabase.from("expenses").delete().eq("id",id);setExpenses(p=>p.filter(e=>e.id!==id));}
  async function addIncome(){if(!incForm.descricao.trim()||!incForm.valor||!incForm.cat)return;const{data,error}=await supabase.from("incomes").insert({user_id:user.id,...incForm,valor:Number(incForm.valor),world}).select().single();if(!error&&data){setIncomes(p=>[data as Income,...p]);setIncForm(f=>({...f,descricao:"",valor:""}));}}
  async function deleteIncome(id:number){await supabase.from("incomes").delete().eq("id",id);setIncomes(p=>p.filter(i=>i.id!==id));}
  async function saveRevCell(){if(revEdit===null)return;const v=Number(revVal);if(isNaN(v))return;await supabase.from("monthly_revenue").upsert({user_id:user.id,world,year:Number(revYear),month:revEdit,valor:v},{onConflict:"user_id,world,year,month"});setMonthlyRev(prev=>{const w={...(prev[world]||{})};const arr=[...(w[revYear]||new Array(12).fill(0))];arr[revEdit]=v;w[revYear]=arr;return{...prev,[world]:w};});setRevEdit(null);}
  async function addAccount(){if(!newAccName.trim())return;const meta=TIPO_ACC[newAccTipo];const{data,error}=await supabase.from("accounts").insert({user_id:user.id,nome:newAccName.trim(),tipo:newAccTipo,saldo:Number(newAccSaldo)||0,icon:meta.icon,cor:meta.cor}).select().single();if(error){console.error("addAccount error:",error);}
if(error){console.error("addAccount error:",error);}
if(!error&&data){setAccounts(p=>[...p,data as BankAccount]);setNewAccName("");setNewAccSaldo("");}}
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

async function handleCoupleSettlement(valor: number) {
  if(!accounts.length) return;
  const conta = accounts.find(a => a.tipo === "corrente") || accounts[0];
  if(!conta) return;
  const novoSaldo = Number(conta.saldo) - valor;
  await supabase.from("accounts").update({ saldo: novoSaldo }).eq("id", conta.id);
  setAccounts(p => p.map(a => a.id === conta.id ? { ...a, saldo: novoSaldo } : a));
  // Recarrega despesas para mostrar as do casal
  const {data} = await supabase.from("expenses").select("*").eq("user_id", user.id).order("data", {ascending: false});
  if(data) setExpenses(data as Expense[]);
}
  const S:Record<string,CSSProperties>={
  root:{minHeight:"100dvh",background:T.root,color:"#e2e8f0",fontFamily:"'Sora',sans-serif",paddingBottom:"calc(100px + env(safe-area-inset-bottom, 0px))"},
  header:{background:T.header,padding:"20px clamp(20px, 5vw, 48px) 16px",borderBottom:`1px solid ${T.cardBorder}`},
  body:{padding:"16px clamp(20px, 5vw, 48px)",maxWidth:900,margin:"0 auto"},
  card:{background:T.cardBg,border:`1px solid ${T.cardBorder}`,borderRadius:14,padding:"16px 18px",marginBottom:14,boxShadow:"0 1px 3px rgba(0,0,0,0.3),0 4px 16px rgba(0,0,0,0.2)"},
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

  if(dataLoading)return(<div style={{minHeight:"100vh",background:T.root,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif"}}><div style={{textAlign:"center"}}><div style={{fontSize:36,marginBottom:12}}><img src="/favicon.svg" width="36" height="36" style={{borderRadius:9}}/></div><div style={{fontSize:14,color:T.subtext}}>A carregar...</div></div></div>);

  return(
    <div style={S.root}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet"/>
      <div style={{position:"fixed",top:-80,right:-80,width:300,height:300,borderRadius:"50%",background:`radial-gradient(circle,${T.glow1} 0%,transparent 70%)`,pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",bottom:-60,left:-60,width:250,height:250,borderRadius:"50%",background:`radial-gradient(circle,${T.glow2} 0%,transparent 70%)`,pointerEvents:"none",zIndex:0}}/>

      {showTour&&<Tour userName={userName} accent={T.accent} onFinish={finishTour}/>}

      {/* ── LEFT NAV DRAWER (NEW) ── */}
      <LeftNav
        isOpen={leftNavOpen}
        onClose={() => setLeftNavOpen(false)}
        activeTab={tab}
        onNavigate={setTab}
        accent={T.accent}
        accentDark={T.accentDark}
        onSettings={() => { setLeftNavOpen(false); setSidebarOpen(true); }}
      />

      {/* SIDEBAR (existing right ⚙️ panel — unchanged) */}
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
        <div style={{flex:1,overflowY:"auto" as const,padding:"16px 20px",paddingBottom:"calc(120px + env(safe-area-inset-bottom, 0px))",WebkitOverflowScrolling:"touch" as const}}>
          {sidebarTab==="contas"&&<>
            <div style={{background:T.cardBg,border:`1px solid ${T.accent}30`,borderRadius:14,padding:"16px",marginBottom:14,textAlign:"center" as const}}>
              <div style={{fontSize:10,color:T.subtext,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:4}}>Saldo Total</div>
              <div style={{fontSize:24,fontWeight:800,color:totalSaldo>=0?T.positive:T.negative}}>{hv(fmt(totalSaldo))}</div>
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
              <button onClick={()=>setShowPricing(true)} style={{width:"100%",padding:"10px 0",background:`${T.accent}12`,border:`1px solid ${T.accent}30`,borderRadius:9,color:T.accent,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif",marginBottom:8}}>
  💎 {isPremium?"Plano Premium ✓":hasFullAccess?"Acesso via casal ✓":"Fazer upgrade"}
</button>
              <button onClick={()=>setShowTour(true)} style={{width:"100%",padding:"9px 0",background:`${T.accent}12`,border:`1px solid ${T.accent}30`,borderRadius:9,color:T.accent,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>🎓 Ver tour novamente</button>
              <button onClick={onLogout} style={{width:"100%",padding:"10px 0",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:9,color:"#f87171",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Terminar sessão</button>
            </div>
          </>}
        </div>
      </div>

{/* HEADER */}
<div style={{padding:"12px 16px 0",position:"relative",zIndex:1,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
  <button
    className="lnav-hamburger"
    onClick={() => setLeftNavOpen(true)}
    aria-label="Abrir menu"
    style={{"--lnav-accent":T.accent,"--lnav-accent-dark":T.accentDark} as React.CSSProperties}
  >
    ☰
  </button>
  <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)"}}>
    <button onClick={()=>setHideValues(v=>!v)} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:99,padding:"7px 10px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
  {hideValues?(
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ):(
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )}
</button>
</div>
  {/* FILTRO inline */}
  <div style={{position:"relative"}}>
    <button
      onClick={()=>setShowFilterMenu(v=>!v)}
      style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px",background:showFilterMenu||fYear!=="todos"||fMonth!=="todos"?`${T.accent}20`:"rgba(255,255,255,0.05)",border:`1px solid ${showFilterMenu||fYear!=="todos"||fMonth!=="todos"?T.accent:"rgba(255,255,255,0.1)"}`,borderRadius:99,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={fYear!=="todos"||fMonth!=="todos"?T.accent:"rgba(255,255,255,0.5)"}><path d="M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39A.998.998 0 0019 4H5a1 1 0 00-.75 1.61z"/></svg>
      <span style={{fontSize:11,fontWeight:700,color:fYear!=="todos"||fMonth!=="todos"?T.accent:"rgba(255,255,255,0.5)"}}>
        {fYear==="todos"&&fMonth==="todos"?"Filtro":`${fMonth!=="todos"?MONTHS[Number(fMonth)]:"Todo o ano"} ${fYear!=="todos"?fYear:""}`}
      </span>
      {(fYear!=="todos"||fMonth!=="todos")&&(
        <span onClick={e=>{e.stopPropagation();setFYear("todos");setFMonth("todos");}} style={{fontSize:11,color:T.accent,marginLeft:2,fontWeight:700}}>✕</span>
      )}
    </button>
    {showFilterMenu&&(
      <>
        <div onClick={()=>setShowFilterMenu(false)} style={{position:"fixed",inset:0,zIndex:9}}/>
        <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,zIndex:20,background:"#0f1117",border:`1px solid ${T.cardBorder}`,borderRadius:16,padding:"16px",minWidth:240,boxShadow:"0 8px 32px rgba(0,0,0,0.8)",backdropFilter:"none"}}>
          <div style={{fontSize:10,fontWeight:700,color:T.subtext,textTransform:"uppercase" as const,letterSpacing:"0.1em",marginBottom:10}}>Ano</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap" as const,marginBottom:14}}>
            {["todos","2024","2025","2026"].map(y=>(
              <button key={y} onClick={()=>setFYear(y)} style={{padding:"6px 12px",borderRadius:99,border:`1px solid ${fYear===y?T.accent:"rgba(255,255,255,0.1)"}`,background:fYear===y?`${T.accent}20`:"transparent",color:fYear===y?T.accent:"#94a3b8",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
                {y==="todos"?"Todos":y}
              </button>
            ))}
          </div>
          <div style={{fontSize:10,fontWeight:700,color:T.subtext,textTransform:"uppercase" as const,letterSpacing:"0.1em",marginBottom:10}}>Mês</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
            <button onClick={()=>setFMonth("todos")} style={{padding:"6px 8px",borderRadius:99,border:`1px solid ${fMonth==="todos"?T.accent:"rgba(255,255,255,0.1)"}`,background:fMonth==="todos"?`${T.accent}20`:"transparent",color:fMonth==="todos"?T.accent:"#94a3b8",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Todos</button>
            {MONTHS.map((m,i)=>(
              <button key={i} onClick={()=>setFMonth(String(i))} style={{padding:"6px 8px",borderRadius:99,border:`1px solid ${fMonth===String(i)?T.accent:"rgba(255,255,255,0.1)"}`,background:fMonth===String(i)?`${T.accent}20`:"transparent",color:fMonth===String(i)?T.accent:"#94a3b8",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>{m}</button>
            ))}
          </div>
          <button onClick={()=>setShowFilterMenu(false)} style={{width:"100%",marginTop:14,padding:"9px 0",background:`linear-gradient(135deg,${T.accent},${T.accentDark})`,border:"none",borderRadius:10,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Aplicar</button>
        </div>
      </>
    )}
  </div>
</div>
<div style={{...S.body,position:"relative",zIndex:1}}>
        {/* RESUMO */}
        {tab==="resumo"&&<>
  {/* ── HERO ── */}
  <div style={{padding:"24px 0 20px",textAlign:"center"}}>
    <div style={{fontSize:11,fontWeight:700,color:T.subtext,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:8}}>
      {new Date().toLocaleString("pt-PT",{month:"short"}).toUpperCase()} · {new Date().getFullYear()}
    </div>
    <div style={{fontSize:11,fontWeight:600,color:T.subtext,marginBottom:12,letterSpacing:"0.08em",textTransform:"uppercase"}}>Resultado do mês</div>
    <div style={{fontSize:56,fontWeight:800,color:balance>=0?T.positive:T.negative,letterSpacing:"-2px",lineHeight:1,marginBottom:16}}>
      {balance>=0?"+":""}{hv(fmt(balance))}
    </div>
    {(()=>{
      const now=new Date();
      const prevMonth=now.getMonth()===0?11:now.getMonth()-1;
      const prevYear=now.getMonth()===0?now.getFullYear()-1:now.getFullYear();
      const prevInc=incomes.filter(i=>i.world===world&&new Date(i.data).getMonth()===prevMonth&&new Date(i.data).getFullYear()===prevYear).reduce((s,i)=>s+Number(i.valor),0);
      const prevExp=expenses.filter(e=>e.world===world&&new Date(e.data).getMonth()===prevMonth&&new Date(e.data).getFullYear()===prevYear).reduce((s,e)=>s+Number(e.valor),0);
      const prevBal=prevInc-prevExp;
      if(prevBal===0) return null;
      const diff=Math.round(((balance-prevBal)/Math.abs(prevBal))*100);
      const up=diff>=0;
      return(
        <div style={{display:"inline-flex",alignItems:"center",gap:6,background:up?"rgba(52,211,153,0.12)":"rgba(251,113,133,0.12)",border:`1px solid ${up?"rgba(52,211,153,0.3)":"rgba(251,113,133,0.3)"}`,borderRadius:99,padding:"6px 14px",fontSize:12,fontWeight:700,color:up?T.positive:T.negative}}>
          <span>{up?"↗":"↘"}</span>
          <span>{up?"+":""}{diff}% vs mês anterior</span>
        </div>
      );
    })()}
  </div>

  {/* ── FLUXO ── */}
  <div style={{marginBottom:14}}>
    <div style={{fontSize:11,fontWeight:700,color:T.subtext,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Fluxo</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <div style={{background:T.cardBg,border:`1px solid ${T.cardBorder}`,borderRadius:16,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:36,height:36,borderRadius:10,background:"rgba(52,211,153,0.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={T.positive}><path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z"/></svg>
        </div>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:T.subtext,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:2}}>Receitas</div>
          <div style={{fontSize:16,fontWeight:800,color:"#f1f5f9"}}>{hv(fmt(totalInc))}</div>
          <div style={{fontSize:10,color:T.subtext}}>{myIncomes.length} entrada{myIncomes.length!==1?"s":""}</div>
        </div>
      </div>
      <div style={{background:T.cardBg,border:`1px solid ${T.cardBorder}`,borderRadius:16,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:36,height:36,borderRadius:10,background:"rgba(251,113,133,0.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={T.negative}><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/></svg>
        </div>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:T.subtext,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:2}}>Despesas</div>
          <div style={{fontSize:16,fontWeight:800,color:"#f1f5f9"}}>{hv(fmt(totalExp))}</div>
          <div style={{fontSize:10,color:T.subtext}}>{myExpenses.length} item{myExpenses.length!==1?"s":""}</div>
        </div>
      </div>
    </div>
  </div>

  {/* ── ALERTA RECORRENTES ── */}
  {dueRecurring>0&&(
    <div onClick={()=>setTab("recorrentes")} style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:14,padding:"12px 14px",marginBottom:14,cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
      <div style={{width:32,height:32,borderRadius:9,background:"rgba(245,158,11,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🔔</div>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:700,color:"#f59e0b"}}>{dueRecurring} despesa{dueRecurring>1?"s":""} recorrente{dueRecurring>1?"s":""} a vencer</div>
        <div style={{fontSize:11,color:"#78350f",marginTop:1}}>Toca para ver e registar</div>
      </div>
      <span style={{color:"#f59e0b"}}>→</span>
    </div>
  )}

  {/* ── ALERTA ORÇAMENTO ── */}
  {(()=>{
    const overItems=(Object.entries(TYPE_META) as [TypeKey,typeof TYPE_META[TypeKey]][]).filter(([type])=>{
      const actual=byType[type]||0;
      return actual>totalInc*(budgetTargets[type]/100)&&totalInc>0;
    });
    if(!overItems.length) return null;
    const [type,meta]=overItems[0];
    const actual=byType[type]||0;
    const target=budgetTargets[type];
    const actualPct=pct(actual,totalInc);
    return(
      <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:14,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"flex-start",gap:12}}>
        <div style={{width:32,height:32,borderRadius:9,background:"rgba(245,158,11,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>⚠️</div>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#f59e0b",marginBottom:2}}>{meta.label} acima do orçamento</div>
          <div style={{fontSize:12,color:T.subtext}}>Estás em {actualPct}% — alvo {target}%.</div>
        </div>
      </div>
    );
  })()}

  {/* ── COMPOSIÇÃO ── */}
  <div style={{marginBottom:14}}>
    <div style={{fontSize:11,fontWeight:700,color:T.subtext,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Composição</div>
    <div style={S.card}>
      {(Object.entries(TYPE_META) as [TypeKey,typeof TYPE_META[TypeKey]][]).map(([type,meta])=>{
        const actual=byType[type]||0,target=budgetTargets[type],targetAmt=totalInc*(target/100),actualPct=pct(actual,totalInc),over=actual>targetAmt&&totalInc>0;
        return(
          <div key={type} style={{marginBottom:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:14,fontWeight:600,color:over?"#ef4444":"#f1f5f9"}}>{meta.label}</span>
              <span style={{fontSize:13,fontWeight:700,color:over?"#ef4444":T.subtext}}>{actualPct}% / {target}%</span>
            </div>
            <div style={{position:"relative",height:6,borderRadius:99,background:"rgba(255,255,255,0.07)"}}>
              <div style={{position:"absolute",left:0,top:0,bottom:0,width:`${Math.min(100,actualPct)}%`,background:over?"#ef4444":meta.color,borderRadius:99,transition:"width .5s ease"}}/>
              <div style={{position:"absolute",top:-4,bottom:-4,left:`${target}%`,width:2,background:"rgba(255,255,255,0.25)",borderRadius:1}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
              <span style={{fontSize:11,color:over?"#f87171":T.subtext}}>{fmt(actual)}</span>
              <span style={{fontSize:11,color:T.subtext}}>limite {fmt(targetAmt)}</span>
            </div>
          </div>
        );
      })}
      {totalInc===0&&<div style={{color:T.subtext,fontSize:12,textAlign:"center",padding:"8px 0"}}>Regista rendimentos para ver a composição.</div>}
    </div>
  </div>

  {/* ── TOP CATEGORIAS ── */}
  <div style={{marginBottom:14}}>
    <div style={{fontSize:11,fontWeight:700,color:T.subtext,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Top categorias</div>
    <div style={S.card}>
      {byCat.filter(c=>c.total>0).slice(0,6).map(c=>(
        <div key={c.id} style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <span style={{fontSize:13,color:"#e2e8f0"}}>{c.icon} {c.label}</span>
            <span style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>{fmt(c.total)}</span>
          </div>
          <ProgressBar value={c.total} max={maxCat} color={TYPE_META[c.type]?.color||"#6b7280"} height={4}/>
        </div>
      ))}
      {byCat.filter(c=>c.total>0).length===0&&<div style={{color:T.subtext,fontSize:13,textAlign:"center",padding:"16px 0"}}>Sem despesas registadas.</div>}
    </div>
  </div>

  {/* ── EVOLUÇÃO + NET WORTH ── */}
<div style={{marginBottom:14}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
    <div style={{fontSize:11,fontWeight:700,color:T.subtext,letterSpacing:"0.1em",textTransform:"uppercase"}}>Evolução</div>
    <span style={{fontSize:11,color:T.subtext}}>{new Date().getFullYear()}</span>
  </div>
        <div style={S.card}>
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          <button onClick={()=>setChartView("fluxo")} style={{flex:1,padding:"7px 0",border:`1px solid ${chartView==="fluxo"?T.accent:"rgba(255,255,255,0.1)"}`,borderRadius:8,background:chartView==="fluxo"?`${T.accent}20`:"transparent",color:chartView==="fluxo"?T.accent:"#64748b",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
            📊 Receitas vs Despesas
          </button>
          <button onClick={()=>setChartView("networth")} style={{flex:1,padding:"7px 0",border:`1px solid ${chartView==="networth"?T.accent:"rgba(255,255,255,0.1)"}`,borderRadius:8,background:chartView==="networth"?`${T.accent}20`:"transparent",color:chartView==="networth"?T.accent:"#64748b",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
            💎 Net Worth
          </button>
        </div>
        {chartView==="fluxo"&&(
          <>
            <div style={{display:"flex",alignItems:"flex-end",gap:4,height:100,marginBottom:10}}>
              {MONTHS.map((m,i)=>{
                const rev=monthlyRev[world]?.[String(new Date().getFullYear())]?.[i]||0;
                const exp=expenses.filter(e=>e.world===world&&new Date(e.data).getMonth()===i&&new Date(e.data).getFullYear()===new Date().getFullYear()).reduce((s,e)=>s+Number(e.valor),0);
                const maxVal=Math.max(...MONTHS.map((_,j)=>{const r=monthlyRev[world]?.[String(new Date().getFullYear())]?.[j]||0;const ex=expenses.filter(e=>e.world===world&&new Date(e.data).getMonth()===j&&new Date(e.data).getFullYear()===new Date().getFullYear()).reduce((s,e)=>s+Number(e.valor),0);return Math.max(r,ex);}),1);
                const rH=Math.round((rev/maxVal)*88)||2;
                const eH=Math.round((exp/maxVal)*88)||2;
                const isCurrent=i===new Date().getMonth();
                return(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                    <div style={{display:"flex",alignItems:"flex-end",gap:1,height:88}}>
                      <div style={{width:"45%",height:rH,background:isCurrent?T.positive:`${T.positive}55`,borderRadius:"3px 3px 0 0",transition:"height .4s"}}/>
                      <div style={{width:"45%",height:eH,background:isCurrent?T.negative:`${T.negative}55`,borderRadius:"3px 3px 0 0",transition:"height .4s"}}/>
                    </div>
                    <span style={{fontSize:7,color:isCurrent?T.accent:T.subtext,fontWeight:isCurrent?700:400}}>{m}</span>
                  </div>
                );
              })}
            </div>
            <div style={{display:"flex",gap:16,paddingTop:8,borderTop:`1px solid ${T.cardBorder}`}}>
              <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#94a3b8"}}><div style={{width:10,height:10,borderRadius:2,background:T.positive}}/>Receitas</div>
              <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#94a3b8"}}><div style={{width:10,height:10,borderRadius:2,background:T.negative}}/>Despesas</div>
              <div style={{marginLeft:"auto",fontSize:11,color:T.subtext}}>mês actual destacado</div>
            </div>
          </>
        )}
      {chartView==="networth"&&(
          <>
            <div style={{textAlign:"center" as const,marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:700,color:T.subtext,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:4}}>Net Worth actual</div>
              <div style={{fontSize:28,fontWeight:800,color:totalSaldo>=0?T.positive:T.negative}}>{hv(fmt(totalSaldo))}</div>
            </div>
            <div style={{display:"flex",alignItems:"flex-end",gap:4,height:100,marginBottom:10}}>
              {MONTHS.map((m,i)=>{
                const snap=nwSnapshots.find(s=>s.mes===i);
                const maxVal=Math.max(...nwSnapshots.map(s=>s.valor),1);
                const h=snap?Math.round((snap.valor/maxVal)*88)||2:2;
                const isCurrent=i===new Date().getMonth();
                return(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                    <div style={{height:88,display:"flex",alignItems:"flex-end"}}>
                      <div style={{width:"70%",height:snap?h:4,background:isCurrent?T.accent:snap?`${T.accent}55`:"rgba(255,255,255,0.05)",borderRadius:"3px 3px 0 0",transition:"height .4s"}}/>
                    </div>
                    <span style={{fontSize:7,color:isCurrent?T.accent:T.subtext,fontWeight:isCurrent?700:400}}>{m}</span>
                  </div>
                );
              })}
            </div>
            <div style={{paddingTop:8,borderTop:`1px solid ${T.cardBorder}`,fontSize:11,color:T.subtext,textAlign:"center" as const}}>
              Evolução do Net Worth em {new Date().getFullYear()}
            </div>
          </>
        )}
      </div>
</div>


  {/* ── CONTAS ── */}
  {accounts.length>0&&(
    <div style={{display:"flex",gap:8,overflowX:"auto",marginBottom:14,paddingBottom:4}}>
      {accounts.map(a=>(
        <div key={a.id} style={{background:T.cardBg,border:`1px solid ${T.accent}25`,borderRadius:12,padding:"10px 14px",flexShrink:0,minWidth:130}}>
          <div style={{fontSize:12,fontWeight:600,color:T.subtext,marginBottom:2}}>{a.icon} {a.nome}</div>
          <div style={{fontSize:16,fontWeight:800,color:Number(a.saldo)>=0?T.positive:T.negative}}>{hv(fmt(Number(a.saldo)))}</div>
        </div>
      ))}
    </div>
  )}
</>}

        {/* DESPESAS */}
        {tab==="despesas"&&<>
          {overBudget.length>0&&(<div style={{background:"#450a0a",border:"1px solid #ef4444",borderRadius:12,padding:"12px 14px",marginBottom:14}}><div style={{fontSize:12,fontWeight:700,color:"#fca5a5",marginBottom:5}}>⚠️ Orçamento excedido</div>{overBudget.map(([type])=>{const actual=byType[type]||0,target=budgetTargets[type],targetAmt=totalInc*(target/100),meta=TYPE_META[type];return<div key={type} style={{fontSize:11,color:"#f87171",marginBottom:2}}>{meta.icon} {meta.label}: {pct(actual,totalInc)}% (meta {target}%) · excesso {fmt(actual-targetAmt)}</div>;})}</div>)}
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
            <TypeSelector value={expForm.tipo} onChange={(v:TypeKey)=>setExpForm(f=>({...f,tipo:v}))} byType={byType} totalInc={totalInc} budgetTargets={budgetTargets}/>
            {!editingExp&&(
  <div onClick={()=>setExpIsRecurring(v=>!v)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:expIsRecurring?`${T.accent}15`:"rgba(255,255,255,0.03)",border:`1px solid ${expIsRecurring?T.accent:"rgba(255,255,255,0.08)"}`,borderRadius:9,cursor:"pointer",marginTop:10,marginBottom:6,userSelect:"none"}}>
    <div style={{width:36,height:20,borderRadius:99,background:expIsRecurring?T.accent:"rgba(255,255,255,0.12)",transition:"background .2s",position:"relative",flexShrink:0}}>
      <div style={{position:"absolute",top:3,left:expIsRecurring?18:3,width:14,height:14,borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
    </div>
    <div>
      <div style={{fontSize:13,fontWeight:600,color:expIsRecurring?"#f1f5f9":"#94a3b8"}}>🔄 Despesa recorrente</div>
      <div style={{fontSize:11,color:"#475569",marginTop:1}}>{expIsRecurring?"Será guardada como mensal":"Toca para activar"}</div>
    </div>
  </div>
)}
            <button style={btnAdd} onClick={()=>editingExp?updateExpense(editingExp):addExpense()}>{editingExp?"✓ Guardar alterações":"+ Adicionar Despesa"}</button>
            {editingExp&&<button onClick={()=>{setEditingExp(null);setExpForm(f=>({...f,descricao:"",valor:"",subcat:""}));}} style={{width:"100%",marginTop:8,padding:"10px 0",background:"rgba(255,255,255,0.05)",border:`1px solid ${T.cardBorder}`,borderRadius:9,color:T.subtext,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>✕ Cancelar edição</button>}
          </div>
          <div style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px"}}>
            <span style={{fontSize:12,color:T.subtext}}>{myExpenses.length} despesa(s)</span>
            <span style={{fontSize:17,fontWeight:800,color:T.negative}}>{fmt(totalExp)}</span>
          </div>
          
          <div style={S.card}>
            {myExpenses.length===0&&<div style={{color:T.subtext,fontSize:13,textAlign:"center",padding:"24px 0"}}>Sem despesas para este período.</div>}
            {myExpenses.map(e=>{const cat=expCats.find(c=>c.id===e.cat);return(<div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:`1px solid ${T.cardBorder}`}}><span style={{fontSize:20,minWidth:28,textAlign:"center"}}>{cat?.icon||"📦"}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:"#e2e8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.descricao}{e.subcat?<span style={{color:T.subtext}}> · {e.subcat}</span>:""}</div><div style={{display:"flex",alignItems:"center",gap:5,marginTop:3}}><span style={{fontSize:10,color:T.subtext}}>{new Date(e.data+"T12:00:00").toLocaleDateString("pt-PT")}</span><Tag type={e.tipo}/></div></div><span style={{fontSize:14,fontWeight:700,color:T.negative,minWidth:68,textAlign:"right"}}>{fmt(Number(e.valor))}</span><button onClick={()=>{setEditingExp(e.id);setExpForm({descricao:e.descricao,valor:String(e.valor),cat:e.cat,subcat:e.subcat,data:e.data,tipo:e.tipo});window.scrollTo({top:0,behavior:"smooth"});}} style={{background:"none",border:"none",cursor:"pointer",color:T.accent,fontSize:15,padding:"0 2px"}}>✏️</button>
                <button onClick={()=>deleteExpense(e.id)} style={{background:"none",border:"none",cursor:"pointer",color:T.subtext,fontSize:15,padding:"0 2px"}}>✕</button></div>);})}
          </div>
        </>}

        {/* RECORRENTES */}
        {tab==="recorrentes"&&(
          plan==="free" ? (
            <div style={{textAlign:"center",padding:"60px 24px",fontFamily:"'Sora',sans-serif"}}>
              <div style={{fontSize:48,marginBottom:16}}>🔄</div>
              <div style={{fontSize:20,fontWeight:800,color:"#f1f5f9",marginBottom:8}}>Despesas recorrentes</div>
              <div style={{fontSize:14,color:"#667085",marginBottom:28,lineHeight:1.7}}>Regista despesas fixas uma vez e a app avisa quando vencer.<br/>Disponível no plano Individual.</div>
              <button onClick={()=>setShowPricing(true)} style={{padding:"14px 32px",background:"linear-gradient(135deg,#5DA9FF,#8B6DFF)",border:"none",borderRadius:12,color:"white",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"'Sora',sans-serif",boxShadow:"0 4px 20px rgba(93,169,255,0.3)"}}>Ver planos →</button>
            </div>
          ) : (
          <RecurringExpenses
            userId={user.id} world={world} expCats={expCats}
            accent={T.accent} accentDark={T.accentDark} cardBg={T.cardBg}
            cardBorder={T.cardBorder} subtext={T.subtext} positive={T.positive} negative={T.negative}
            recurring={recurring} setRecurring={setRecurring} onApplyDue={applyRecurring}
          />
          )
        )}

        {/* OBJETIVOS */}
        {tab==="objetivos"&&(
          <SavingsGoals
            userId={user.id} accent={T.accent} accentDark={T.accentDark}
            cardBg={T.cardBg} cardBorder={T.cardBorder} subtext={T.subtext}
            positive={T.positive} negative={T.negative}
            goals={goals} setGoals={setGoals}
            monthlyIncome={totalInc}
            maxGoals={plan==="free"?1:undefined}
            onUpgrade={()=>setShowPricing(true)}
          />
        )}

        {/* MODO CASAL */}
        {tab==="casal"&&(
          hasFullAccess ? (
            <CoupleMode
              userId={user.id} userEmail={user.email||""} userName={userName}
              expCats={expCats} accent={T.accent} accentDark={T.accentDark}
              cardBg={T.cardBg} cardBorder={T.cardBorder} subtext={T.subtext}
              positive={T.positive} negative={T.negative}
              onSettlement={handleCoupleSettlement}
            />
          ) : (
            <div style={{textAlign:"center",padding:"60px 24px",fontFamily:"'Sora',sans-serif"}}>
              <div style={{fontSize:48,marginBottom:16}}>💑</div>
              <div style={{fontSize:20,fontWeight:800,color:"#f1f5f9",marginBottom:8,letterSpacing:"-0.5px"}}>Modo casal</div>
              <div style={{fontSize:14,color:"#667085",marginBottom:28,lineHeight:1.7}}>Gere despesas partilhadas com o teu parceiro/a.<br/>Disponível no plano Premium.</div>
              <button onClick={()=>setShowPricing(true)} style={{padding:"14px 32px",background:"linear-gradient(135deg,#5DA9FF,#8B6DFF)",border:"none",borderRadius:12,color:"white",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"'Sora',sans-serif",boxShadow:"0 4px 20px rgba(93,169,255,0.3)"}}>
                Ver planos →
              </button>
            </div>
          )
        )}
        {/* EXPORTAR */}
        {tab==="exportar"&&(
          plan==="free" ? (
            <div style={{textAlign:"center",padding:"60px 24px",fontFamily:"'Sora',sans-serif"}}>
              <div style={{fontSize:48,marginBottom:16}}>📤</div>
              <div style={{fontSize:20,fontWeight:800,color:"#f1f5f9",marginBottom:8}}>Exportar dados</div>
              <div style={{fontSize:14,color:"#667085",marginBottom:28,lineHeight:1.7}}>Exporta as tuas despesas e rendimentos em PDF ou Excel.<br/>Disponível no plano Premium.</div>
              <button onClick={()=>setShowPricing(true)} style={{padding:"14px 32px",background:"linear-gradient(135deg,#5DA9FF,#8B6DFF)",border:"none",borderRadius:12,color:"white",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"'Sora',sans-serif",boxShadow:"0 4px 20px rgba(93,169,255,0.3)"}}>Ver planos →</button>
            </div>
          ) : (
          <ExportData
            expenses={expenses} incomes={incomes} accounts={accounts}
            expCats={expCats} incCats={incCats} world={world}
            world1Name={world1Name} world2Name={world2Name}
            userName={userName} accent={T.accent} accentDark={T.accentDark}
            cardBg={T.cardBg} cardBorder={T.cardBorder} subtext={T.subtext}
            positive={T.positive} negative={T.negative}
          />
          )
        )}

        {/* COMPARAÇÃO MENSAL */}
        {tab==="comparacao"&&(
          <MonthComparison
            expenses={expenses} incomes={incomes} expCats={expCats} world={world}
            accent={T.accent} cardBg={T.cardBg} cardBorder={T.cardBorder}
            subtext={T.subtext} positive={T.positive} negative={T.negative}
          />
        )}

     {tab==="rendimentos"&&<>
  <div style={S.card}>
    <SectionTitle>{editingInc?"Editar Rendimento":"Adicionar Rendimento"}</SectionTitle>
    <div style={S.row2}>
      <div><label style={S.lbl}>Descrição</label><input style={S.inp} placeholder="Ex: Salário" value={incForm.descricao} onChange={e=>setIncForm(f=>({...f,descricao:e.target.value}))}/></div>
      <div><label style={S.lbl}>Valor (€)</label><input style={S.inp} type="number" placeholder="0,00" value={incForm.valor} onChange={e=>setIncForm(f=>({...f,valor:e.target.value}))}/></div>
    </div>
    <div style={S.row2}>
      <div><label style={S.lbl}>Fonte</label><select style={S.sel} value={incForm.cat} onChange={e=>setIncForm(f=>({...f,cat:e.target.value}))}><option value="">Selecionar...</option>{incCats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select></div>
      <div><label style={S.lbl}>Data</label><input style={S.inp} type="date" value={incForm.data} onChange={e=>setIncForm(f=>({...f,data:e.target.value}))}/></div>
    </div>
    <button style={btnAdd} onClick={()=>editingInc?updateIncome(editingInc):addIncome()}>{editingInc?"✓ Guardar alterações":"+ Adicionar Rendimento"}</button>
    {editingInc&&<button onClick={()=>{setEditingInc(null);setIncForm(f=>({...f,descricao:"",valor:""}));}} style={{width:"100%",marginTop:8,padding:"10px 0",background:"rgba(255,255,255,0.05)",border:`1px solid ${T.cardBorder}`,borderRadius:9,color:T.subtext,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>✕ Cancelar edição</button>}
  </div>
  <div style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px"}}>
    <span style={{fontSize:12,color:T.subtext}}>{myIncomes.length} entrada(s)</span>
    <span style={{fontSize:17,fontWeight:800,color:T.positive}}>{fmt(totalInc)}</span>
  </div>
  <div style={S.card}>
    {myIncomes.length===0&&<div style={{color:T.subtext,fontSize:13,textAlign:"center",padding:"24px 0"}}>Sem rendimentos registados.</div>}
    {myIncomes.map(i=>{const cat=incCats.find(c=>c.id===i.cat);return(<div key={i.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:`1px solid ${T.cardBorder}`}}><span style={{fontSize:20,minWidth:28,textAlign:"center"}}>{cat?.icon||"📦"}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:"#e2e8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{i.descricao}</div><div style={{fontSize:11,color:T.subtext,marginTop:2}}>{new Date(i.data+"T12:00:00").toLocaleDateString("pt-PT")} · {cat?.label}</div></div><span style={{fontSize:14,fontWeight:700,color:T.positive,minWidth:68,textAlign:"right"}}>{fmt(Number(i.valor))}</span><button onClick={()=>{setEditingInc(i.id);setIncForm({descricao:i.descricao,valor:String(i.valor),cat:i.cat,data:i.data});window.scrollTo({top:0,behavior:"smooth"});}} style={{background:"none",border:"none",cursor:"pointer",color:T.accent,fontSize:15,padding:"0 2px"}}>✏️</button><button onClick={()=>deleteIncome(i.id)} style={{background:"none",border:"none",cursor:"pointer",color:T.subtext,fontSize:15,padding:"0 2px"}}>✕</button></div>);})}
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

      {/* ── BOTTOM NAV ── */}
      <div style={{position:"fixed",bottom:16,left:"50%",transform:"translateX(-50%)",zIndex:60,width:"calc(100% - 32px)",maxWidth:420}}>
        <div style={{background:"rgba(15,18,30,0.85)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:24,padding:"10px 8px",display:"flex",alignItems:"center",justifyContent:"space-around",boxShadow:"0 8px 32px rgba(0,0,0,0.5)",paddingBottom:"env(safe-area-inset-bottom, 10px)"}}>

          {/* Dashboard */}
          <button onClick={()=>setTab("resumo")} style={{display:"flex",flexDirection:"column" as const,alignItems:"center",gap:4,padding:"8px 16px",borderRadius:16,border:"none",background:tab==="resumo"?`${T.accent}20`:"transparent",cursor:"pointer",transition:"all .2s",minWidth:60}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={tab==="resumo"?T.accent:"rgba(255,255,255,0.4)"}>
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
            </svg>
            <span style={{fontSize:10,fontWeight:tab==="resumo"?700:500,color:tab==="resumo"?T.accent:"rgba(255,255,255,0.4)"}}>Dashboard</span>
          </button>

          {/* Modo Casal */}
          <button onClick={()=>setTab("casal")} style={{display:"flex",flexDirection:"column" as const,alignItems:"center",gap:4,padding:"8px 16px",borderRadius:16,border:"none",background:tab==="casal"?`${T.accent}20`:"transparent",cursor:"pointer",transition:"all .2s",minWidth:60}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={tab==="casal"?T.accent:"rgba(255,255,255,0.4)"}>
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
            <span style={{fontSize:10,fontWeight:tab==="casal"?700:500,color:tab==="casal"?T.accent:"rgba(255,255,255,0.4)"}}>Casal</span>
          </button>

          {/* Botão + central */}
          <button onClick={()=>setShowAddModal(true)} style={{width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${T.accent},${T.accentDark})`,border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:`0 4px 20px ${T.accent}50`,flexShrink:0,transition:"transform .2s"}}
            onMouseDown={e=>(e.currentTarget.style.transform="scale(0.92)")}
            onMouseUp={e=>(e.currentTarget.style.transform="scale(1)")}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </button>

          {/* Metas */}
          <button onClick={()=>setTab("objetivos")} style={{display:"flex",flexDirection:"column" as const,alignItems:"center",gap:4,padding:"8px 16px",borderRadius:16,border:"none",background:tab==="objetivos"?`${T.accent}20`:"transparent",cursor:"pointer",transition:"all .2s",minWidth:60}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={tab==="objetivos"?T.accent:"rgba(255,255,255,0.4)"}>
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>
            </svg>
            <span style={{fontSize:10,fontWeight:tab==="objetivos"?700:500,color:tab==="objetivos"?T.accent:"rgba(255,255,255,0.4)"}}>Metas</span>
          </button>

          {/* Definições */}
          <button onClick={()=>setSidebarOpen(true)} style={{display:"flex",flexDirection:"column" as const,alignItems:"center",gap:4,padding:"8px 16px",borderRadius:16,border:"none",background:"transparent",cursor:"pointer",transition:"all .2s",minWidth:60}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)">
              <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
            </svg>
            <span style={{fontSize:10,fontWeight:500,color:"rgba(255,255,255,0.4)"}}>Definições</span>
          </button>

        </div>
      </div>

      {/* ── MODAL ADICIONAR ── */}
      {showAddModal&&(
        <>
          <div onClick={()=>setShowAddModal(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:70,backdropFilter:"blur(4px)"}}/>
          <div style={{position:"fixed",bottom:100,left:"50%",transform:"translateX(-50%)",zIndex:80,width:"calc(100% - 32px)",maxWidth:420}}>
            <div style={{background:"rgba(15,18,30,0.95)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:24,padding:"20px",boxShadow:"0 -8px 40px rgba(0,0,0,0.5)"}}>
              <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.4)",textTransform:"uppercase" as const,letterSpacing:"0.1em",marginBottom:16,textAlign:"center" as const}}>O que queres adicionar?</div>
              <div style={{display:"flex",flexDirection:"column" as const,gap:10}}>
                <button onClick={()=>{setTab("despesas");setShowAddModal(false);}} style={{width:"100%",padding:"14px 20px",background:`linear-gradient(135deg,${T.accent},${T.accentDark})`,border:"none",borderRadius:14,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Sora',sans-serif",display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:20}}>📥</span>
                  <div style={{textAlign:"left" as const}}>
                    <div>Despesa</div>
                    <div style={{fontSize:11,fontWeight:400,opacity:0.8}}>Regista uma nova despesa</div>
                  </div>
                </button>
                <button onClick={()=>{setTab("rendimentos");setShowAddModal(false);}} style={{width:"100%",padding:"14px 20px",background:"rgba(52,211,153,0.15)",border:"1px solid rgba(52,211,153,0.3)",borderRadius:14,color:"#34d399",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Sora',sans-serif",display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:20}}>💶</span>
                  <div style={{textAlign:"left" as const}}>
                    <div>Rendimento</div>
                    <div style={{fontSize:11,fontWeight:400,opacity:0.8}}>Regista um novo rendimento</div>
                  </div>
                </button>
             </div>
            </div>
          </div>
        </>
      )}
      {showPricing&&(
        <SubscriptionModal
          userId={user.id}
          userEmail={user.email||""}
          currentPlan={plan}
          isBeta={isBeta}
          isTrial={isTrial}
          trialDaysLeft={trialDaysLeft}
          accent={T.accent}
          accent2={T.accent2}
          cardBg={T.cardBg}
          cardBorder={T.cardBorder}
          subtext={T.subtext}
          onClose={()=>setShowPricing(false)}
          onPlanUpdate={(p)=>setPlan(p as any)}
        />
      )}
    </div>
  );
}
