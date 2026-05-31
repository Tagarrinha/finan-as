import { useState, CSSProperties } from "react";
import { supabase } from "./supabase";

interface IncCat { id:string; label:string; icon:string; }
interface BankAccount { id:number; nome:string; tipo:string; saldo:number; icon:string; cor:string; }

interface Props {
  accent: string; accentDark: string; cardBg: string;
  cardBorder: string; subtext: string; positive: string;
  accounts: BankAccount[]; incCats: IncCat[]; userId: string;
  onAddAccount: () => void;
  onFinish: () => void; onSkip: () => void;
  onNavigateToCouple: () => void;
}

export default function OnboardingFlow({ accent, accentDark, cardBg, cardBorder, subtext, positive, accounts, incCats, userId, onFinish, onSkip, onNavigateToCouple }: Props) {
  const [step, setStep] = useState(0);
  const [accNome, setAccNome] = useState("Conta Corrente");
  const [accSaldo, setAccSaldo] = useState("");
  const [accSaving, setAccSaving] = useState(false);
  const [accDone, setAccDone] = useState(accounts.length > 0);
  const [incDesc, setIncDesc] = useState("Salário");
  const [incValor, setIncValor] = useState("");
  const [incCat, setIncCat] = useState(incCats[0]?.id || "");
  const [incSaving, setIncSaving] = useState(false);
  const [incDone, setIncDone] = useState(false);

  const inp: CSSProperties = { width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"13px 14px", color:"#e2e8f0", fontSize:14, boxSizing:"border-box", outline:"none", fontFamily:"'Sora',sans-serif" };

  async function saveAccount() {
    if(!accNome.trim()||!accSaldo) return;
    setAccSaving(true);
    await supabase.from("accounts").insert({ user_id:userId, nome:accNome.trim(), tipo:"corrente", saldo:Number(accSaldo), icon:"💳", cor:"#3b82f6" });
    setAccSaving(false);
    setAccDone(true);
    setTimeout(()=>setStep(1), 600);
  }

  async function saveIncome() {
    if(!incValor||!incCat) return;
    setIncSaving(true);
    const today = new Date().toISOString().slice(0,10);
    await supabase.from("incomes").insert({ user_id:userId, descricao:incDesc, valor:Number(incValor), cat:incCat, data:today, world:"pessoal" });
    setIncSaving(false);
    setIncDone(true);
    setTimeout(()=>setStep(2), 600);
  }

  const steps = [
    {
      emoji: "🏦",
      title: "Qual é o teu saldo actual?",
      desc: "Adiciona a tua conta principal para começares a ver o teu Net Worth.",
      content: (
        <div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:6}}>Nome da conta</div>
            <input style={inp} value={accNome} onChange={e=>setAccNome(e.target.value)} placeholder="Ex: Conta Corrente"/>
          </div>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11,fontWeight:700,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:6}}>Saldo actual (€)</div>
            <input style={inp} type="number" value={accSaldo} onChange={e=>setAccSaldo(e.target.value)} placeholder="0,00" onKeyDown={e=>e.key==="Enter"&&saveAccount()}/>
          </div>
          {accDone ? (
            <div style={{textAlign:"center" as const,padding:"12px 0",fontSize:14,fontWeight:700,color:positive}}>✓ Conta adicionada!</div>
          ) : (
            <button onClick={saveAccount} disabled={accSaving||!accSaldo} style={{width:"100%",padding:"14px 0",background:`linear-gradient(135deg,${accent},${accentDark})`,border:"none",borderRadius:12,color:"#fff",fontWeight:800,fontSize:15,cursor:accSaving?"not-allowed":"pointer",fontFamily:"'Sora',sans-serif",opacity:(!accSaldo||accSaving)?0.6:1}}>
              {accSaving?"A guardar...":"Adicionar conta →"}
            </button>
          )}
        </div>
      )
    },
    {
      emoji: "💶",
      title: "Quanto ganhas este mês?",
      desc: "Com o teu rendimento conseguimos mostrar como estás a gerir o dinheiro.",
      content: (
        <div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:6}}>Descrição</div>
            <input style={inp} value={incDesc} onChange={e=>setIncDesc(e.target.value)} placeholder="Ex: Salário"/>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:6}}>Valor (€)</div>
            <input style={inp} type="number" value={incValor} onChange={e=>setIncValor(e.target.value)} placeholder="0,00"/>
          </div>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11,fontWeight:700,color:subtext,textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:6}}>Fonte</div>
            <select style={{...inp,background:"#111827"}} value={incCat} onChange={e=>setIncCat(e.target.value)}>
              {incCats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
          </div>
          {incDone ? (
            <div style={{textAlign:"center" as const,padding:"12px 0",fontSize:14,fontWeight:700,color:positive}}>✓ Rendimento adicionado!</div>
          ) : (
            <button onClick={saveIncome} disabled={incSaving||!incValor} style={{width:"100%",padding:"14px 0",background:`linear-gradient(135deg,#57E3A0,#00a86b)`,border:"none",borderRadius:12,color:"#fff",fontWeight:800,fontSize:15,cursor:incSaving?"not-allowed":"pointer",fontFamily:"'Sora',sans-serif",opacity:(!incValor||incSaving)?0.6:1}}>
              {incSaving?"A guardar...":"Adicionar rendimento →"}
            </button>
          )}
        </div>
      )
    },
    {
      emoji: "👫",
      title: "Tens parceiro/a?",
      desc: "O Modo Casal permite gerir despesas partilhadas e saber sempre quanto cada um deve ao outro.",
      content: (
        <div style={{display:"flex",flexDirection:"column" as const,gap:10}}>
          <button onClick={onNavigateToCouple} style={{width:"100%",padding:"16px 20px",background:`linear-gradient(135deg,${accent},${accentDark})`,border:"none",borderRadius:14,color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"'Sora',sans-serif",display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:24}}>👫</span>
            <div style={{textAlign:"left" as const}}>
              <div>Sim, convidar parceiro/a</div>
              <div style={{fontSize:12,fontWeight:400,opacity:0.8,marginTop:2}}>Activa o Modo Casal agora</div>
            </div>
          </button>
          <button onClick={onFinish} style={{width:"100%",padding:"16px 20px",background:"rgba(255,255,255,0.05)",border:`1px solid ${cardBorder}`,borderRadius:14,color:subtext,fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"'Sora',sans-serif",display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:24}}>🚀</span>
            <div style={{textAlign:"left" as const}}>
              <div style={{color:"#e2e8f0"}}>Não, continuar sozinho</div>
              <div style={{fontSize:12,fontWeight:400,opacity:0.8,marginTop:2}}>Ir para o dashboard</div>
            </div>
          </button>
        </div>
      )
    }
  ];

  const cur = steps[step];

  return (
    <>
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:110,backdropFilter:"blur(4px)"}}/>
      <div style={{position:"fixed",zIndex:111,left:"50%",transform:"translateX(-50%)",bottom:40,width:"calc(100% - 32px)",maxWidth:400,background:"#0f1117",border:`1px solid ${cardBorder}`,borderRadius:24,padding:"28px 24px",fontFamily:"'Sora',sans-serif",boxShadow:"0 8px 40px rgba(0,0,0,0.6)"}}>
        {/* Progress */}
        <div style={{display:"flex",gap:6,marginBottom:24}}>
          {steps.map((_,i)=>(
            <div key={i} style={{flex:1,height:3,borderRadius:99,background:i<=step?accent:"rgba(255,255,255,0.1)",transition:"background .3s"}}/>
          ))}
        </div>
        {/* Content */}
        <div style={{textAlign:"center" as const,marginBottom:24}}>
          <div style={{fontSize:48,marginBottom:12}}>{cur.emoji}</div>
          <div style={{fontSize:20,fontWeight:800,color:"#f1f5f9",marginBottom:8,letterSpacing:"-0.5px"}}>{cur.title}</div>
          <div style={{fontSize:13,color:subtext,lineHeight:1.6,marginBottom:20}}>{cur.desc}</div>
          {cur.content}
        </div>
        {/* Skip */}
        {step < 2 && (
          <button onClick={()=>step===0?setStep(1):setStep(2)} style={{width:"100%",marginTop:12,padding:"10px 0",background:"transparent",border:"none",color:"rgba(255,255,255,0.2)",fontSize:12,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
            Saltar este passo
          </button>
        )}
      </div>
    </>
  );
}