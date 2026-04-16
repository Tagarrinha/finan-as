import { useState, useMemo, useEffect, ReactNode, CSSProperties } from "react";

// ── localStorage hook ────────────────────────────────────────────────────────
function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

// ── Types ────────────────────────────────────────────────────────────────────
type TypeKey = "necessidade" | "desejo" | "investimento";

interface ExpCat {
  id: string;
  label: string;
  icon: string;
  type: TypeKey;
  sub?: string[];
}

interface IncCat {
  id: string;
  label: string;
  icon: string;
}

interface Expense {
  id: number;
  desc: string;
  valor: number;
  cat: string;
  subcat: string;
  data: string;
  tipo: TypeKey;
  world: string;
}

interface Income {
  id: number;
  desc: string;
  valor: number;
  cat: string;
  data: string;
  world: string;
}

interface MonthlyRev {
  [world: string]: { [year: string]: number[] };
}

// ── Data ─────────────────────────────────────────────────────────────────────
const PERSONAL_EXPENSE_CATS: ExpCat[] = [
  { id:"casa",        label:"Casa",               icon:"🏠", sub:["Prestação banco","Seguro de vida","Seguro multiriscos","Condomínio","Água","Luz","TV","Outros"], type:"necessidade" },
  { id:"supermercado",label:"Supermercado",        icon:"🛒", type:"necessidade" },
  { id:"restaurantes",label:"Restaurantes",        icon:"🍽️", type:"desejo" },
  { id:"combustivel", label:"Combustível",         icon:"⛽", type:"necessidade" },
  { id:"carro",       label:"Carro",               icon:"🚗", type:"necessidade" },
  { id:"barbeiro",    label:"Barbeiro / Depilação",icon:"✂️", type:"desejo" },
  { id:"ginasio",     label:"Ginásio / Desporto",  icon:"🏋️", type:"desejo" },
  { id:"saude",       label:"Saúde",               icon:"🏥", type:"necessidade" },
  { id:"compras",     label:"Compras",             icon:"🛍️", type:"desejo" },
  { id:"prendas",     label:"Prendas",             icon:"🎁", type:"desejo" },
  { id:"viagens",     label:"Viagens",             icon:"✈️", type:"desejo" },
  { id:"educacao",    label:"Educação",            icon:"📚", type:"investimento" },
  { id:"outros_p",    label:"Outros",              icon:"📦", type:"desejo" },
];

const PERSONAL_INCOME_CATS: IncCat[] = [
  { id:"salario",   label:"Salário",         icon:"💼" },
  { id:"refeicao",  label:"Cartão Refeição", icon:"🍱" },
  { id:"clinica",   label:"Clínica Privada", icon:"🏥" },
  { id:"prendas_r", label:"Prendas",         icon:"🎁" },
  { id:"outros_r",  label:"Outros",          icon:"📦" },
];

const CLINIC_EXPENSE_CATS: ExpCat[] = [
  { id:"renda",        label:"Renda / Espaço",  icon:"🏢", type:"necessidade" },
  { id:"equipamento",  label:"Equipamento",      icon:"🩺", type:"investimento" },
  { id:"consumiveis",  label:"Consumíveis",      icon:"🧴", type:"necessidade" },
  { id:"marketing",    label:"Marketing",        icon:"📣", type:"investimento" },
  { id:"contabilidade",label:"Contabilidade",    icon:"📋", type:"necessidade" },
  { id:"seguros_c",    label:"Seguros",          icon:"🛡️", type:"necessidade" },
  { id:"formacao_c",   label:"Formação",         icon:"📚", type:"investimento" },
  { id:"software",     label:"Software / Tech",  icon:"💻", type:"investimento" },
  { id:"outros_c",     label:"Outros",           icon:"📦", type:"necessidade" },
];

const CLINIC_INCOME_CATS: IncCat[] = [
  { id:"consultas",  label:"Consultas",   icon:"🧑‍⚕️" },
  { id:"seguradoras",label:"Seguradoras", icon:"🛡️" },
  { id:"workshops",  label:"Workshops",   icon:"📣" },
  { id:"outros_ci",  label:"Outros",      icon:"📦" },
];

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const BUDGET_TARGETS: Record<TypeKey, number> = { necessidade:75, desejo:10, investimento:15 };

const TYPE_META: Record<TypeKey, { label: string; color: string; bg: string; icon: string }> = {
  necessidade:  { label:"Necessidade",  color:"#3b82f6", bg:"#1e3a5f33", icon:"🏠" },
  desejo:       { label:"Desejo",       color:"#f59e0b", bg:"#78350f33", icon:"✨" },
  investimento: { label:"Investimento", color:"#10b981", bg:"#064e3b33", icon:"📈" },
};

const fmt = (n: number): string => new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR"}).format(n||0);
const pct = (part: number, total: number): number => total>0 ? Math.round((part/total)*100) : 0;

// ── Components ───────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color, height=6 }: { value: number; max: number; color: string; height?: number }) {
  const p = max>0 ? Math.min(100,Math.round(value/max*100)) : 0;
  return (
    <div style={{height,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"hidden"}}>
      <div style={{width:`${p}%`,height:"100%",background:color,borderRadius:99,transition:"width .5s ease"}}/>
    </div>
  );
}

function Tag({ type }: { type: string }) {
  const m = TYPE_META[type as TypeKey];
  if (!m) return null;
  return <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:m.bg,color:m.color,whiteSpace:"nowrap"}}>{m.label}</span>;
}

function TypeSelector({ value, onChange }: { value: TypeKey; onChange: (v: TypeKey) => void }) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
      {(Object.entries(TYPE_META) as [TypeKey, typeof TYPE_META[TypeKey]][]).map(([type,meta]) => {
        const active = value===type;
        return (
          <button key={type} onClick={()=>onChange(type)} style={{
            padding:"10px 6px",border:`1.5px solid ${active?meta.color:"rgba(255,255,255,0.09)"}`,
            borderRadius:10,background:active?meta.bg:"rgba(255,255,255,0.03)",
            color:active?meta.color:"#4b5563",fontWeight:700,fontSize:11,
            cursor:"pointer",transition:"all .15s",textAlign:"center",fontFamily:"'Sora',sans-serif",lineHeight:1.4
          } as CSSProperties}>
            <div style={{fontSize:17,marginBottom:3}}>{meta.icon}</div>
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, color, sub }: { label: string; value: number; color: string; sub?: string }) {
  return (
    <div style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${color}30`,borderRadius:14,padding:"15px 16px"}}>
      <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>{label}</div>
      <div style={{fontSize:19,fontWeight:800,color,letterSpacing:"-0.5px"}}>{fmt(value)}</div>
      {sub&&<div style={{fontSize:11,color:"#475569",marginTop:3}}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div style={{fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>{children}</div>;
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Financas() {
  const [world,setWorld]=useState("pessoal");
  const [tab,setTab]=useState("resumo");
  const [expenses,setExpenses]=useLocalStorage<Expense[]>("fin_expenses",[]);
  const [incomes,setIncomes]=useLocalStorage<Income[]>("fin_incomes",[]);
  const [monthlyRev,setMonthlyRev]=useLocalStorage<MonthlyRev>("fin_monthlyRev",{pessoal:{},clinica:{}});

  const today=new Date().toISOString().slice(0,10);
  const [expForm,setExpForm]=useState({desc:"",valor:"",cat:"",subcat:"",data:today,tipo:"necessidade" as TypeKey});
  const [incForm,setIncForm]=useState({desc:"",valor:"",cat:"",data:today});
  const [revEdit,setRevEdit]=useState<number|null>(null);
  const [revVal,setRevVal]=useState("");
  const [revYear,setRevYear]=useState(String(new Date().getFullYear()));
  const [fMonth,setFMonth]=useState("todos");
  const [fYear,setFYear]=useState("todos");

  const expCats: ExpCat[] = world==="pessoal" ? PERSONAL_EXPENSE_CATS : CLINIC_EXPENSE_CATS;
  const incCats: IncCat[] = world==="pessoal" ? PERSONAL_INCOME_CATS  : CLINIC_INCOME_CATS;

  const myExpenses=useMemo(()=>expenses.filter((e: Expense)=>{
    if(e.world!==world)return false;
    const d=new Date(e.data);
    if(fYear!=="todos"&&String(d.getFullYear())!==fYear)return false;
    if(fMonth!=="todos"&&String(d.getMonth())!==fMonth)return false;
    return true;
  }),[expenses,world,fYear,fMonth]);

  const myIncomes=useMemo(()=>incomes.filter((i: Income)=>{
    if(i.world!==world)return false;
    const d=new Date(i.data);
    if(fYear!=="todos"&&String(d.getFullYear())!==fYear)return false;
    if(fMonth!=="todos"&&String(d.getMonth())!==fMonth)return false;
    return true;
  }),[incomes,world,fYear,fMonth]);

  const totalExp=myExpenses.reduce((s: number,e: Expense)=>s+e.valor,0);
  const totalInc=myIncomes.reduce((s: number,i: Income)=>s+i.valor,0);
  const balance=totalInc-totalExp;

  const byType=useMemo(()=>{
    const map: Record<TypeKey,number>={necessidade:0,desejo:0,investimento:0};
    myExpenses.forEach((e: Expense)=>{ if(e.tipo in map) map[e.tipo]+=e.valor; });
    return map;
  },[myExpenses]);

  const byCat=useMemo(()=>expCats.map(c=>({
    ...c,
    total:myExpenses.filter((e: Expense)=>e.cat===c.id).reduce((s: number,e: Expense)=>s+e.valor,0)
  })).sort((a,b)=>b.total-a.total),[myExpenses,expCats]);

  const byIncCat=useMemo(()=>incCats.map(c=>({
    ...c,
    total:myIncomes.filter((i: Income)=>i.cat===c.id).reduce((s: number,i: Income)=>s+i.valor,0)
  })).sort((a,b)=>b.total-a.total),[myIncomes,incCats]);

  const maxCat=Math.max(...byCat.map(c=>c.total),1);
  const maxInc=Math.max(...byIncCat.map(c=>c.total),1);

  const revArr: number[] = monthlyRev[world]?.[revYear] || new Array(12).fill(0);
  const maxBar=Math.max(...revArr,...MONTHS.map((_,i)=>
    expenses.filter((e: Expense)=>e.world===world&&new Date(e.data).getMonth()===i&&String(new Date(e.data).getFullYear())===revYear).reduce((s: number,e: Expense)=>s+e.valor,0)
  ),1);

  const overBudget=(Object.entries(BUDGET_TARGETS) as [TypeKey,number][]).filter(([type,target])=>{
    const actual=byType[type]||0;
    return actual>totalExp*(target/100)&&totalExp>0;
  });

  function addExpense(){
    if(!expForm.desc.trim()||!expForm.valor||!expForm.cat)return;
    setExpenses((p: Expense[])=>[...p,{...expForm,id:Date.now(),valor:Number(expForm.valor),world}]);
    setExpForm(f=>({...f,desc:"",valor:"",subcat:""}));
  }
  function addIncome(){
    if(!incForm.desc.trim()||!incForm.valor||!incForm.cat)return;
    setIncomes((p: Income[])=>[...p,{...incForm,id:Date.now(),valor:Number(incForm.valor),world}]);
    setIncForm(f=>({...f,desc:"",valor:""}));
  }
  function saveRev(){
    if(revEdit===null)return;
    const v=Number(revVal);
    if(!isNaN(v)){
      setMonthlyRev((prev: MonthlyRev)=>{
        const w={...(prev[world]||{})};
        const arr=[...(w[revYear]||new Array(12).fill(0))];
        arr[revEdit as number]=v;
        w[revYear]=arr;
        return {...prev,[world]:w};
      });
    }
    setRevEdit(null);
  }

  const accent=world==="clinica"?"#06b6d4":"#f97316";
  const accentDark=world==="clinica"?"#0e7490":"#c2410c";

  const S: Record<string,CSSProperties> = {
    root:{minHeight:"100vh",background:"#080810",color:"#e2e8f0",fontFamily:"'Sora',sans-serif",paddingBottom:64},
    header:{background:world==="clinica"?"linear-gradient(135deg,#0c1a2e,#0c2236)":"linear-gradient(135deg,#1a0c08,#2d150a)",padding:"24px 20px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"},
    body:{padding:"16px 20px"},
    card:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"16px 18px",marginBottom:14},
    inp:{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box",outline:"none",fontFamily:"'Sora',sans-serif"},
    sel:{width:"100%",background:"#111827",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box",outline:"none"},
    lbl:{fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:5},
    row2:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10},
    sg:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14},
  };

  const wBtn = (a: boolean): CSSProperties => ({flex:1,padding:"11px 0",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,transition:"all .2s",fontFamily:"'Sora',sans-serif",background:a?(world==="pessoal"?"linear-gradient(135deg,#f97316,#ef4444)":"linear-gradient(135deg,#06b6d4,#3b82f6)"):"rgba(255,255,255,0.05)",color:a?"#fff":"#64748b"});
  const tBtn = (a: boolean): CSSProperties => ({padding:"10px 14px",border:"none",borderRadius:"8px 8px 0 0",cursor:"pointer",fontSize:12,fontWeight:700,transition:"all .2s",whiteSpace:"nowrap",fontFamily:"'Sora',sans-serif",background:a?"rgba(255,255,255,0.07)":"transparent",color:a?accent:"#475569",borderBottom:a?`2px solid ${accent}`:"2px solid transparent"});
  const btnAdd: CSSProperties = {background:`linear-gradient(135deg,${accent},${accentDark})`,color:"#fff",border:"none",borderRadius:9,padding:"12px 0",fontWeight:700,fontSize:13,cursor:"pointer",width:"100%",fontFamily:"'Sora',sans-serif",marginTop:6};

  const selCat=expCats.find(c=>c.id===expForm.cat);

  return (
    <div style={S.root}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet"/>

      <div style={S.header}>
        <div style={{marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:"#f1f5f9",letterSpacing:"-0.4px"}}>💰 As Minhas Finanças</div>
            <div style={{fontSize:12,color:"#475569",marginTop:2}}>Pessoal & Clínica Privada · <span style={{color:"#34d399"}}>dados guardados ✓</span></div>
          </div>
          <button onClick={()=>{if(window.confirm("Apagar todos os dados? Esta ação não pode ser desfeita.")){setExpenses([]);setIncomes([]);setMonthlyRev({pessoal:{},clinica:{}});}}}
            style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,padding:"6px 10px",color:"#f87171",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif",whiteSpace:"nowrap"}}>
            🗑️ Limpar
          </button>
        </div>
        <div style={{display:"flex",gap:4,marginBottom:16}}>
          <button style={wBtn(world==="pessoal")} onClick={()=>{setWorld("pessoal");setTab("resumo");}}>👤 Pessoal</button>
          <button style={wBtn(world==="clinica")} onClick={()=>{setWorld("clinica");setTab("resumo");}}>🏥 Clínica</button>
        </div>
        <div style={{display:"flex",gap:2,overflowX:"auto"}}>
          {[["resumo","📊 Resumo"],["despesas","📥 Despesas"],["rendimentos","📈 Rendimentos"],["progressao","📉 Progressão"]].map(([id,lbl])=>(
            <button key={id} style={tBtn(tab===id)} onClick={()=>setTab(id)}>{lbl}</button>
          ))}
        </div>
      </div>

      <div style={{padding:"12px 20px 0",display:"flex",gap:8}}>
        <select style={{...S.sel,flex:1}} value={fYear} onChange={e=>setFYear(e.target.value)}>
          <option value="todos">Todos os anos</option>
          {["2024","2025","2026"].map(y=><option key={y} value={y}>{y}</option>)}
        </select>
        <select style={{...S.sel,flex:1}} value={fMonth} onChange={e=>setFMonth(e.target.value)}>
          <option value="todos">Todos os meses</option>
          {MONTHS.map((m,i)=><option key={i} value={String(i)}>{m}</option>)}
        </select>
      </div>

      <div style={S.body}>

        {/* ══ RESUMO ══════════════════════════════════════════════════════ */}
        {tab==="resumo"&&<>
          <div style={S.sg}>
            <StatCard label="Rendimento" value={totalInc} color="#34d399" sub={`${myIncomes.length} entradas`}/>
            <StatCard label="Despesas" value={totalExp} color="#fb7185" sub={`${myExpenses.length} items`}/>
          </div>
          <div style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <span style={{fontSize:13,color:"#64748b",fontWeight:600}}>Resultado</span>
            <span style={{fontSize:22,fontWeight:800,color:balance>=0?"#34d399":"#fb7185",letterSpacing:"-0.5px"}}>{fmt(balance)}</span>
          </div>

          <div style={S.card}>
            <SectionTitle>Distribuição por tipo — metas orçamentais</SectionTitle>
            {(Object.entries(TYPE_META) as [TypeKey, typeof TYPE_META[TypeKey]][]).map(([type,meta])=>{
              const actual=byType[type]||0;
              const target=BUDGET_TARGETS[type];
              const targetAmt=totalExp*(target/100);
              const actualPct=pct(actual,totalExp);
              const over=actual>targetAmt&&totalExp>0;
              return (
                <div key={type} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <span style={{fontSize:15}}>{meta.icon}</span>
                      <span style={{fontSize:13,fontWeight:600,color:over?"#ef4444":meta.color}}>{meta.label}</span>
                      <span style={{fontSize:10,color:"#4b5563",background:"rgba(255,255,255,0.05)",padding:"2px 7px",borderRadius:99}}>meta {target}%</span>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <span style={{fontSize:14,fontWeight:800,color:over?"#ef4444":meta.color}}>{fmt(actual)}</span>
                      <span style={{fontSize:11,color:over?"#ef4444":"#64748b",marginLeft:4}}>({actualPct}%)</span>
                    </div>
                  </div>
                  <div style={{position:"relative",height:8,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"visible"}}>
                    <div style={{position:"absolute",left:0,top:0,bottom:0,width:`${Math.min(100,actualPct)}%`,background:over?"#ef4444":meta.color,borderRadius:99,transition:"width .5s ease",overflow:"hidden"}}/>
                    <div style={{position:"absolute",top:-3,bottom:-3,left:`${target}%`,width:2,background:"rgba(255,255,255,0.35)",borderRadius:1,zIndex:2}}/>
                  </div>
                  {over&&(
                    <div style={{display:"flex",alignItems:"center",gap:7,background:"#450a0a",border:"1px solid #ef444460",borderRadius:8,padding:"7px 10px",marginTop:7}}>
                      <span style={{fontSize:14}}>⚠️</span>
                      <div>
                        <span style={{fontSize:11,fontWeight:700,color:"#fca5a5"}}>Limite excedido! </span>
                        <span style={{fontSize:11,color:"#f87171"}}>+{fmt(actual-targetAmt)} acima da meta ({actualPct-target}% extra)</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {totalExp===0&&<div style={{color:"#374151",fontSize:12,textAlign:"center",padding:"8px 0"}}>Regista despesas para ver a distribuição.</div>}
          </div>

          <div style={S.card}>
            <SectionTitle>Top categorias</SectionTitle>
            {byCat.filter(c=>c.total>0).slice(0,6).map(c=>(
              <div key={c.id} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:13}}>{c.icon} {c.label}</span>
                  <span style={{fontSize:13,fontWeight:700}}>{fmt(c.total)}</span>
                </div>
                <ProgressBar value={c.total} max={maxCat} color={TYPE_META[c.type]?.color||"#6b7280"} height={4}/>
              </div>
            ))}
            {byCat.filter(c=>c.total>0).length===0&&<div style={{color:"#374151",fontSize:13,textAlign:"center",padding:"16px 0"}}>Sem despesas.</div>}
          </div>

          <div style={S.card}>
            <SectionTitle>Fontes de rendimento</SectionTitle>
            {byIncCat.filter(c=>c.total>0).map(c=>(
              <div key={c.id} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:13}}>{c.icon} {c.label}</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#34d399"}}>{fmt(c.total)} <span style={{fontSize:11,color:"#64748b",fontWeight:400}}>({pct(c.total,totalInc)}%)</span></span>
                </div>
                <ProgressBar value={c.total} max={maxInc} color="#34d399" height={4}/>
              </div>
            ))}
            {byIncCat.filter(c=>c.total>0).length===0&&<div style={{color:"#374151",fontSize:13,textAlign:"center",padding:"16px 0"}}>Sem rendimentos.</div>}
          </div>
        </>}

        {/* ══ DESPESAS ════════════════════════════════════════════════════ */}
        {tab==="despesas"&&<>
          {overBudget.length>0&&(
            <div style={{background:"#450a0a",border:"1px solid #ef4444",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:"#fca5a5",marginBottom:5}}>⚠️ Orçamento excedido neste período</div>
              {overBudget.map(([type])=>{
                const actual=byType[type]||0;
                const target=BUDGET_TARGETS[type];
                const targetAmt=totalExp*(target/100);
                const meta=TYPE_META[type];
                return <div key={type} style={{fontSize:11,color:"#f87171",marginBottom:2}}>{meta.icon} {meta.label}: {pct(actual,totalExp)}% usado (meta {target}%) · excesso de {fmt(actual-targetAmt)}</div>;
              })}
            </div>
          )}

          <div style={S.card}>
            <SectionTitle>Adicionar Despesa</SectionTitle>
            <div style={S.row2}>
              <div>
                <label style={S.lbl}>Descrição</label>
                <input style={S.inp} placeholder="Ex: Renda" value={expForm.desc} onChange={e=>setExpForm(f=>({...f,desc:e.target.value}))}/>
              </div>
              <div>
                <label style={S.lbl}>Valor (€)</label>
                <input style={S.inp} type="number" placeholder="0,00" value={expForm.valor} onChange={e=>setExpForm(f=>({...f,valor:e.target.value}))}/>
              </div>
            </div>
            <div style={S.row2}>
              <div>
                <label style={S.lbl}>Categoria</label>
                <select style={S.sel} value={expForm.cat} onChange={e=>setExpForm(f=>({...f,cat:e.target.value,subcat:""}))}>
                  <option value="">Selecionar...</option>
                  {expCats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={S.lbl}>Data</label>
                <input style={S.inp} type="date" value={expForm.data} onChange={e=>setExpForm(f=>({...f,data:e.target.value}))}/>
              </div>
            </div>
            {selCat?.sub&&(
              <div style={{marginBottom:10}}>
                <label style={S.lbl}>Sub-categoria de {selCat.label}</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                  {selCat.sub.map((s: string)=>{
                    const active=expForm.subcat===s;
                    return (
                      <button key={s} onClick={()=>setExpForm(f=>({...f,subcat:active?"":s}))}
                        style={{padding:"7px 13px",border:`1.5px solid ${active?accent:"rgba(255,255,255,0.13)"}`,borderRadius:99,background:active?`${accent}22`:"rgba(255,255,255,0.04)",color:active?accent:"#94a3b8",fontSize:12,fontWeight:active?700:500,cursor:"pointer",transition:"all .15s",fontFamily:"'Sora',sans-serif",whiteSpace:"nowrap"}}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <label style={{...S.lbl,marginTop:4,marginBottom:7}}>Tipo de despesa</label>
            <TypeSelector value={expForm.tipo} onChange={(v: TypeKey)=>setExpForm(f=>({...f,tipo:v}))}/>
            <button style={btnAdd} onClick={addExpense}>+ Adicionar Despesa</button>
          </div>

          <div style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px"}}>
            <span style={{fontSize:12,color:"#64748b"}}>{myExpenses.length} despesa(s)</span>
            <span style={{fontSize:17,fontWeight:800,color:"#fb7185"}}>{fmt(totalExp)}</span>
          </div>

          {myExpenses.length>0&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {(Object.entries(TYPE_META) as [TypeKey, typeof TYPE_META[TypeKey]][]).map(([type,meta])=>{
                const actual=byType[type]||0;
                const target=BUDGET_TARGETS[type];
                const over=actual>totalExp*(target/100)&&totalExp>0;
                return (
                  <div key={type} style={{background:over?"#450a0a":meta.bg,border:`1px solid ${over?"#ef4444":meta.color}40`,borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
                    <div style={{fontSize:16,marginBottom:2}}>{meta.icon}</div>
                    <div style={{fontSize:12,fontWeight:800,color:over?"#ef4444":meta.color}}>{fmt(actual)}</div>
                    <div style={{fontSize:10,color:"#64748b",marginTop:1}}>{pct(actual,totalExp)}% / {target}%</div>
                    {over&&<div style={{fontSize:10,color:"#ef4444",fontWeight:700,marginTop:2}}>⚠️</div>}
                  </div>
                );
              })}
            </div>
          )}

          <div style={S.card}>
            {myExpenses.length===0&&<div style={{color:"#374151",fontSize:13,textAlign:"center",padding:"24px 0"}}>Sem despesas para este período. ☝️</div>}
            {[...myExpenses].reverse().map((e: Expense)=>{
              const cat=expCats.find(c=>c.id===e.cat);
              return (
                <div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                  <span style={{fontSize:20,minWidth:28,textAlign:"center"}}>{cat?.icon||"📦"}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.desc}{e.subcat?<span style={{color:"#64748b"}}> · {e.subcat}</span>:""}</div>
                    <div style={{display:"flex",alignItems:"center",gap:5,marginTop:3,flexWrap:"wrap"}}>
                      <span style={{fontSize:10,color:"#475569"}}>{new Date(e.data+"T12:00:00").toLocaleDateString("pt-PT")}</span>
                      <Tag type={e.tipo}/>
                    </div>
                  </div>
                  <span style={{fontSize:14,fontWeight:700,color:"#fca5a5",minWidth:68,textAlign:"right"}}>{fmt(e.valor)}</span>
                  <button onClick={()=>setExpenses((p: Expense[])=>p.filter((x: Expense)=>x.id!==e.id))} style={{background:"none",border:"none",cursor:"pointer",color:"#374151",fontSize:15,padding:"0 2px"}}>✕</button>
                </div>
              );
            })}
          </div>
        </>}

        {/* ══ RENDIMENTOS ═════════════════════════════════════════════════ */}
        {tab==="rendimentos"&&<>
          <div style={S.card}>
            <SectionTitle>Adicionar Rendimento</SectionTitle>
            <div style={S.row2}>
              <div>
                <label style={S.lbl}>Descrição</label>
                <input style={S.inp} placeholder="Ex: Salário Abril" value={incForm.desc} onChange={e=>setIncForm(f=>({...f,desc:e.target.value}))}/>
              </div>
              <div>
                <label style={S.lbl}>Valor (€)</label>
                <input style={S.inp} type="number" placeholder="0,00" value={incForm.valor} onChange={e=>setIncForm(f=>({...f,valor:e.target.value}))}/>
              </div>
            </div>
            <div style={S.row2}>
              <div>
                <label style={S.lbl}>Fonte</label>
                <select style={S.sel} value={incForm.cat} onChange={e=>setIncForm(f=>({...f,cat:e.target.value}))}>
                  <option value="">Selecionar...</option>
                  {incCats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={S.lbl}>Data</label>
                <input style={S.inp} type="date" value={incForm.data} onChange={e=>setIncForm(f=>({...f,data:e.target.value}))}/>
              </div>
            </div>
            <button style={btnAdd} onClick={addIncome}>+ Adicionar Rendimento</button>
          </div>

          <div style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px"}}>
            <span style={{fontSize:12,color:"#64748b"}}>{myIncomes.length} entrada(s)</span>
            <span style={{fontSize:17,fontWeight:800,color:"#34d399"}}>{fmt(totalInc)}</span>
          </div>

          <div style={S.card}>
            {myIncomes.length===0&&<div style={{color:"#374151",fontSize:13,textAlign:"center",padding:"24px 0"}}>Sem rendimentos registados. ☝️</div>}
            {[...myIncomes].reverse().map((i: Income)=>{
              const cat=incCats.find(c=>c.id===i.cat);
              return (
                <div key={i.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                  <span style={{fontSize:20,minWidth:28,textAlign:"center"}}>{cat?.icon||"📦"}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{i.desc}</div>
                    <div style={{fontSize:11,color:"#475569",marginTop:2}}>{new Date(i.data+"T12:00:00").toLocaleDateString("pt-PT")} · {cat?.label}</div>
                  </div>
                  <span style={{fontSize:14,fontWeight:700,color:"#6ee7b7",minWidth:68,textAlign:"right"}}>{fmt(i.valor)}</span>
                  <button onClick={()=>setIncomes((p: Income[])=>p.filter((x: Income)=>x.id!==i.id))} style={{background:"none",border:"none",cursor:"pointer",color:"#374151",fontSize:15,padding:"0 2px"}}>✕</button>
                </div>
              );
            })}
          </div>

          {myIncomes.length>0&&(
            <div style={S.card}>
              <SectionTitle>Por fonte</SectionTitle>
              {byIncCat.filter(c=>c.total>0).map(c=>(
                <div key={c.id} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:13}}>{c.icon} {c.label}</span>
                    <span style={{fontSize:13,fontWeight:700,color:"#34d399"}}>{fmt(c.total)} <span style={{fontSize:11,color:"#64748b",fontWeight:400}}>({pct(c.total,totalInc)}%)</span></span>
                  </div>
                  <ProgressBar value={c.total} max={maxInc} color="#34d399" height={4}/>
                </div>
              ))}
            </div>
          )}
        </>}

        {/* ══ PROGRESSÃO ══════════════════════════════════════════════════ */}
        {tab==="progressao"&&<>
          <div style={{display:"flex",gap:6,marginBottom:16}}>
            {["2024","2025","2026"].map(y=>(
              <button key={y} onClick={()=>setRevYear(y)} style={{flex:1,padding:"9px 0",border:`1px solid ${revYear===y?accent:"rgba(255,255,255,0.08)"}`,borderRadius:9,background:revYear===y?`${accent}22`:"transparent",color:revYear===y?accent:"#64748b",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>{y}</button>
            ))}
          </div>

          <div style={S.sg}>
            <StatCard label={`Receita ${revYear}`} value={revArr.reduce((s: number,v: number)=>s+v,0)} color="#34d399"/>
            <StatCard label={`Despesas ${revYear}`} value={expenses.filter((e: Expense)=>e.world===world&&String(new Date(e.data).getFullYear())===revYear).reduce((s: number,e: Expense)=>s+e.valor,0)} color="#fb7185"/>
          </div>

          <div style={S.card}>
            <SectionTitle>Receita mensal — {revYear} (toca para editar)</SectionTitle>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {MONTHS.map((m,i)=>{
                const v=revArr[i]||0;
                const expM=expenses.filter((e: Expense)=>e.world===world&&new Date(e.data).getMonth()===i&&String(new Date(e.data).getFullYear())===revYear).reduce((s: number,e: Expense)=>s+e.valor,0);
                const net=v-expM;
                return (
                  <div key={i} onClick={()=>{setRevEdit(i);setRevVal(String(v));}}
                    style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${revEdit===i?accent:"rgba(255,255,255,0.07)"}`,borderRadius:10,padding:"10px 12px",cursor:"pointer",transition:"border .2s"}}>
                    <div style={{fontSize:11,color:"#64748b",marginBottom:4,fontWeight:600}}>{m}</div>
                    {revEdit===i
                      ?<input autoFocus style={{...S.inp,padding:"4px 6px",fontSize:13,height:28}} type="number" value={revVal} onChange={e=>setRevVal(e.target.value)} onBlur={saveRev} onKeyDown={e=>{if(e.key==="Enter")saveRev();if(e.key==="Escape")setRevEdit(null);}}/>
                      :<>
                        <div style={{fontSize:13,fontWeight:700,color:v>0?"#34d399":"#374151"}}>{fmt(v)}</div>
                        {v>0&&<div style={{fontSize:10,color:net>=0?"#6ee7b7":"#fca5a5",marginTop:2}}>líq: {fmt(net)}</div>}
                      </>
                    }
                  </div>
                );
              })}
            </div>
          </div>

          <div style={S.card}>
            <SectionTitle>Receita vs Despesas — {revYear}</SectionTitle>
            <div style={{display:"flex",alignItems:"flex-end",gap:4,height:90,marginBottom:8}}>
              {MONTHS.map((m,i)=>{
                const rev=revArr[i]||0;
                const exp=expenses.filter((e: Expense)=>e.world===world&&new Date(e.data).getMonth()===i&&String(new Date(e.data).getFullYear())===revYear).reduce((s: number,e: Expense)=>s+e.valor,0);
                const rH=Math.round((rev/maxBar)*78)||2;
                const eH=Math.round((exp/maxBar)*78)||2;
                return (
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <div style={{display:"flex",alignItems:"flex-end",gap:1,height:78}}>
                      <div style={{width:"45%",height:rH,background:"#34d399",borderRadius:"3px 3px 0 0",transition:"height .4s"}}/>
                      <div style={{width:"45%",height:eH,background:"#fb7185",borderRadius:"3px 3px 0 0",transition:"height .4s"}}/>
                    </div>
                    <span style={{fontSize:8,color:"#374151"}}>{m}</span>
                  </div>
                );
              })}
            </div>
            <div style={{display:"flex",gap:14}}>
              <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#94a3b8"}}><div style={{width:10,height:10,borderRadius:2,background:"#34d399"}}/>Receita</div>
              <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#94a3b8"}}><div style={{width:10,height:10,borderRadius:2,background:"#fb7185"}}/>Despesas</div>
            </div>
          </div>
        </>}

      </div>
    </div>
  );
}
