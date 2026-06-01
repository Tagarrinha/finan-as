import { useMemo, useState, CSSProperties } from "react";
const fmt = (n: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n || 0);
type TypeKey = "necessidade" | "desejo" | "investimento";
interface Expense { id:number; descricao:string; valor:number; cat:string; tipo:TypeKey; data:string; world:string; }
interface Income  { id:number; descricao:string; valor:number; cat:string; data:string; world:string; }
interface ExpCat  { id:string; label:string; icon:string; type:TypeKey; }
interface Props {
  expenses: Expense[];
  incomes: Income[];
  expCats: ExpCat[];
  world: string;
  accent: string;
  cardBg: string;
  cardBorder: string;
  subtext: string;
  positive: string;
  negative: string;
}
const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const CAT_COLORS = ["#5DA9FF","#f59e0b","#34d399","#f87171","#a78bfa","#fb923c","#38bdf8","#4ade80","#e879f9","#facc15","#f472b6","#60a5fa"];
function pctDiff(curr: number, prev: number) {
  if(prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}
function TrendBadge({ curr, prev, inverse = false }: { curr:number; prev:number; inverse?:boolean }) {
  if(prev === 0) return null;
  const diff = pctDiff(curr, prev);
  if(diff === 0) return <span style={{ fontSize:10, color:"#64748b", fontWeight:600 }}>= igual</span>;
  const up = diff > 0;
  const good = inverse ? !up : up;
  return (
    <span style={{ fontSize:10, fontWeight:700, color:good?"#34d399":"#fb7185", background:good?"rgba(52,211,153,0.1)":"rgba(251,113,133,0.1)", padding:"2px 7px", borderRadius:99 }}>
      {up?"↑":"↓"} {Math.abs(diff)}%
    </span>
  );
}
function CatEvolution({ months, expCats, cardBorder, cardBg, accent, subtext, negative }: {
  months: any[]; expCats: ExpCat[]; cardBorder:string; cardBg:string; accent:string; subtext:string; negative:string;
}) {
  const activeCats = expCats.filter(c=>months.some(m=>m.byCat[c.id]>0));
  const [selected, setSelected] = useState<string>("todas");
  const H=80, W=300;
  const catsToShow = selected==="todas" ? activeCats : activeCats.filter(c=>c.id===selected);
  const allVals = catsToShow.flatMap(c=>months.map(m=>m.byCat[c.id]||0));
  const maxV = Math.max(...allVals, 1);
  if(activeCats.length===0) return null;
  return(
    <div style={{background:cardBg,border:`1px solid ${cardBorder}`,borderRadius:14,padding:"14px 16px",marginBottom:12}}>
      <span style={{fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase" as const,letterSpacing:"0.1em",marginBottom:12,display:"block"}}>Evolução por categoria</span>
      {/* Selector */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap" as const,marginBottom:14}}>
        <button onClick={()=>setSelected("todas")} style={{padding:"5px 10px",borderRadius:99,border:`1px solid ${selected==="todas"?accent:"rgba(255,255,255,0.1)"}`,background:selected==="todas"?`${accent}20`:"transparent",color:selected==="todas"?accent:"#64748b",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
          Todas
        </button>
        {activeCats.map((c,idx)=>(
          <button key={c.id} onClick={()=>setSelected(c.id)} style={{padding:"5px 10px",borderRadius:99,border:`1px solid ${selected===c.id?CAT_COLORS[idx%CAT_COLORS.length]:"rgba(255,255,255,0.1)"}`,background:selected===c.id?`${CAT_COLORS[idx%CAT_COLORS.length]}20`:"transparent",color:selected===c.id?CAT_COLORS[idx%CAT_COLORS.length]:"#64748b",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
            {c.icon}
          </button>
        ))}
      </div>
      {/* Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H,overflow:"visible",marginBottom:8}}>
        <defs>
          {catsToShow.map((c)=>(
            <linearGradient key={c.id} id={`evGrad${c.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CAT_COLORS[activeCats.indexOf(c)%CAT_COLORS.length]} stopOpacity="0.2"/>
              <stop offset="100%" stopColor={CAT_COLORS[activeCats.indexOf(c)%CAT_COLORS.length]} stopOpacity="0"/>
            </linearGradient>
          ))}
        </defs>
        {catsToShow.map((c)=>{
          const color = CAT_COLORS[activeCats.indexOf(c)%CAT_COLORS.length];
          const vals = months.map(m=>m.byCat[c.id]||0);
          const points = vals.map((v,i)=>({
            x:Math.round((i/(months.length-1))*W),
            y:Math.round(H-8-(v/maxV)*(H-16))
          }));
          const pathD = points.map((p,i)=>`${i===0?"M":"L"}${p.x},${p.y}`).join(" ");
          const areaD = `${pathD} L${points[points.length-1].x},${H} L${points[0].x},${H} Z`;
          return(
            <g key={c.id}>
              {selected!=="todas"&&<path d={areaD} fill={`url(#evGrad${c.id})`}/>}
              <path d={pathD} fill="none" stroke={color} strokeWidth={selected==="todas"?1.5:2} strokeLinecap="round" strokeLinejoin="round" opacity={selected==="todas"?0.8:1}/>
              {points.map((p,i)=>(
                <circle key={i} cx={p.x} cy={p.y} r={i===5?3.5:2} fill={i===5?color:cardBg} stroke={color} strokeWidth="1.2" opacity={i===5?1:0.5}/>
              ))}
            </g>
          );
        })}
      </svg>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
        {months.map((m,i)=>(
          <span key={i} style={{fontSize:8,color:i===5?accent:subtext,flex:1,textAlign:"center" as const}}>{m.label}</span>
        ))}
      </div>
      {/* Legenda — todas */}
      {selected==="todas"&&(
        <div style={{display:"flex",gap:10,flexWrap:"wrap" as const,paddingTop:8,borderTop:`1px solid ${cardBorder}`}}>
          {activeCats.map((c,idx)=>(
            <div key={c.id} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#94a3b8"}}>
              <div style={{width:8,height:8,borderRadius:2,background:CAT_COLORS[idx%CAT_COLORS.length]}}/>
              {c.label}
            </div>
          ))}
        </div>
      )}
      {/* Legenda — categoria seleccionada */}
      {selected!=="todas"&&(()=>{
        const c = activeCats.find(x=>x.id===selected)!;
        const idx = activeCats.indexOf(c);
        const color = CAT_COLORS[idx%CAT_COLORS.length];
        const vals = months.map(m=>m.byCat[c.id]||0);
        const trend = vals[5]-vals[4];
        return(
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:8,borderTop:`1px solid ${cardBorder}`}}>
            <span style={{fontSize:12,fontWeight:600,color}}>{c.icon} {c.label}</span>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:12,fontWeight:700,color}}>{fmt(vals[5])}</span>
              {vals[4]>0&&<span style={{fontSize:10,fontWeight:700,color:trend>0?"#fb7185":"#34d399",background:trend>0?"rgba(251,113,133,0.1)":"rgba(52,211,153,0.1)",padding:"2px 7px",borderRadius:99}}>{trend>0?"↑":"↓"} {fmt(Math.abs(trend))}</span>}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
export default function MonthComparison({ expenses, incomes, expCats, world, accent, cardBg, cardBorder, subtext, positive, negative }: Props) {
  const now = new Date();
  const currMonth = now.getMonth();
  const currYear  = now.getFullYear();
  const months = useMemo(() => {
    const result = [];
    for(let i = 5; i >= 0; i--) {
      const d = new Date(currYear, currMonth - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const exp = expenses.filter(e => e.world === world && new Date(e.data+"T12:00:00").getMonth()===m && new Date(e.data+"T12:00:00").getFullYear()===y);
      const inc = incomes.filter(i2 => i2.world === world && new Date(i2.data+"T12:00:00").getMonth()===m && new Date(i2.data+"T12:00:00").getFullYear()===y);
      const totalExp = exp.reduce((s,e)=>s+Number(e.valor),0);
      const totalInc = inc.reduce((s,i2)=>s+Number(i2.valor),0);
      const byCat: Record<string,number> = {};
      expCats.forEach(c=>{ byCat[c.id]=exp.filter(e=>e.cat===c.id).reduce((s,e)=>s+Number(e.valor),0); });
      const byType: Record<TypeKey,number> = { necessidade:0, desejo:0, investimento:0 };
      exp.forEach(e=>{ if(e.tipo in byType) byType[e.tipo]+=Number(e.valor); });
      result.push({ month:m, year:y, label:MONTHS_SHORT[m], fullLabel:MONTHS_PT[m], totalExp, totalInc, poupanca:totalInc-totalExp, byCat, byType, expCount:exp.length });
    }
    return result;
  }, [expenses, incomes, world, expCats]);
  const curr = months[5];
  const prev = months[4];
  const totalPoupanca = months.reduce((s,m)=>s+Math.max(0,m.poupanca),0);
  const insight = useMemo(() => {
    if(!prev || prev.totalExp === 0) return null;
    const diffExp = curr.totalExp - prev.totalExp;
    const diffPoup = curr.poupanca - prev.poupanca;
    const topCat = expCats.map(c=>({ ...c, curr:curr.byCat[c.id]||0, prev:prev.byCat[c.id]||0 })).sort((a,b)=>b.curr-a.curr)[0];
    const biggestIncrease = expCats.map(c=>({ ...c, diff:(curr.byCat[c.id]||0)-(prev.byCat[c.id]||0) })).sort((a,b)=>b.diff-a.diff)[0];
    if(diffPoup > 0)
      return { type:"good", text:`Ótimo! Poupaste ${fmt(diffPoup)} mais do que em ${prev.fullLabel}. ${biggestIncrease.diff<0?`Reduziste ${biggestIncrease.icon} ${biggestIncrease.label} em ${fmt(Math.abs(biggestIncrease.diff))}.`:""}` };
    if(diffExp > 0)
      return { type:"warn", text:`Gastaste ${fmt(Math.abs(diffExp))} a mais do que em ${prev.fullLabel}. A categoria com maior aumento foi ${topCat.icon} ${topCat.label} (${fmt(curr.byCat[topCat.id]||0)}).` };
    return { type:"neutral", text:`As tuas despesas mantiveram-se estáveis em relação a ${prev.fullLabel}.` };
  }, [curr, prev, expCats]);
  const S: Record<string,CSSProperties> = {
    card: { background:cardBg, border:`1px solid ${cardBorder}`, borderRadius:14, padding:"14px 16px", marginBottom:12 },
    secTitle: { fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12, display:"block" },
  };
  if(months.every(m=>m.totalExp===0&&m.totalInc===0)) return (
    <div style={{ textAlign:"center", padding:"48px 0", color:subtext, fontFamily:"'Sora',sans-serif" }}>
      <div style={{ fontSize:40, marginBottom:12 }}>📊</div>
      <div style={{ fontSize:15, fontWeight:700, color:"#e2e8f0", marginBottom:6 }}>Sem dados ainda</div>
      <div style={{ fontSize:13, lineHeight:1.6 }}>Regista despesas e rendimentos<br/>para ver a comparação mensal.</div>
    </div>
  );
  return (
    <div style={{ fontFamily:"'Sora',sans-serif" }}>
      {insight&&(
        <div style={{ background:insight.type==="good"?"rgba(52,211,153,0.08)":insight.type==="warn"?"rgba(251,113,133,0.08)":"rgba(255,255,255,0.04)", border:`1px solid ${insight.type==="good"?"rgba(52,211,153,0.3)":insight.type==="warn"?"rgba(251,113,133,0.3)":"rgba(255,255,255,0.08)"}`, borderRadius:14, padding:"14px 16px", marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:insight.type==="good"?positive:insight.type==="warn"?negative:"#94a3b8", marginBottom:5 }}>
            {insight.type==="good"?"🎉 Boa notícia!":insight.type==="warn"?"⚠️ Atenção":"📊 Análise"}
          </div>
          <div style={{ fontSize:13, color:"#94a3b8", lineHeight:1.6 }}>{insight.text}</div>
        </div>
      )}
      <div style={{ ...S.card }}>
        <span style={S.secTitle}>{curr.fullLabel} vs {prev.fullLabel}</span>
        {[
          { label:"Rendimento", curr:curr.totalInc, prev:prev.totalInc, color:positive, inverse:false },
          { label:"Despesas",   curr:curr.totalExp, prev:prev.totalExp, color:negative, inverse:true  },
          { label:"Poupança",   curr:curr.poupanca, prev:prev.poupanca, color:accent,   inverse:false },
        ].map(row=>(
          <div key={row.label} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${cardBorder}` }}>
            <span style={{ flex:"0 0 90px", fontSize:12, color:subtext }}>{row.label}</span>
            <span style={{ flex:1, fontSize:13, fontWeight:700, color:row.color }}>{fmt(row.curr)}</span>
            <TrendBadge curr={row.curr} prev={row.prev} inverse={row.inverse}/>
            <span style={{ fontSize:11, color:subtext, flex:"0 0 80px", textAlign:"right" as const }}>ant: {fmt(row.prev)}</span>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:10 }}>
          <span style={{ fontSize:12, color:subtext }}>Poupança acumulada ({currYear})</span>
          <span style={{ fontSize:15, fontWeight:800, color:"#a78bfa" }}>{fmt(totalPoupanca)}</span>
        </div>
      </div>
      {/* Linha resultado líquido */}
      <div style={{ ...S.card }}>
        <span style={S.secTitle}>Resultado líquido — 6 meses</span>
        {(()=>{
          const H=80, W=300;
          const vals = months.map(m=>m.poupanca);
          const maxV = Math.max(...vals.map(Math.abs), 1);
          const mid = H/2;
          const points = months.map((m,i)=>({
            x: Math.round((i/(months.length-1))*W),
            y: Math.round(mid - (m.poupanca/maxV)*(mid-8)),
            m
          }));
          const pathD = points.map((p,i)=>`${i===0?"M":"L"}${p.x},${p.y}`).join(" ");
          const areaPos = `M${points[0].x},${mid} ${points.map(p=>`L${p.x},${Math.min(p.y,mid)}`).join(" ")} L${points[points.length-1].x},${mid} Z`;
          const areaNeg = `M${points[0].x},${mid} ${points.map(p=>`L${p.x},${Math.max(p.y,mid)}`).join(" ")} L${points[points.length-1].x},${mid} Z`;
          return(
            <div>
              <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H,overflow:"visible",marginBottom:8}}>
                <defs>
                  <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={positive} stopOpacity="0.3"/>
                    <stop offset="100%" stopColor={positive} stopOpacity="0"/>
                  </linearGradient>
                  <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={negative} stopOpacity="0"/>
                    <stop offset="100%" stopColor={negative} stopOpacity="0.3"/>
                  </linearGradient>
                </defs>
                <line x1={0} y1={mid} x2={W} y2={mid} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4,4"/>
                <path d={areaPos} fill="url(#posGrad)"/>
                <path d={areaNeg} fill="url(#negGrad)"/>
                <path d={pathD} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                {points.map((p,i)=>{
                  const isLast=i===5;
                  const color=p.m.poupanca>=0?positive:negative;
                  return(
                    <g key={i}>
                      {isLast&&<circle cx={p.x} cy={p.y} r={8} fill={color} fillOpacity="0.15"/>}
                      <circle cx={p.x} cy={p.y} r={isLast?4:2.5} fill={isLast?color:cardBg} stroke={color} strokeWidth="1.5"/>
                    </g>
                  );
                })}
              </svg>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                {months.map((m,i)=>(
                  <span key={i} style={{fontSize:9,color:i===5?accent:subtext,fontWeight:i===5?700:400,flex:1,textAlign:"center" as const}}>{m.label}</span>
                ))}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,paddingTop:8,borderTop:`1px solid ${cardBorder}`}}>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#94a3b8"}}><div style={{width:10,height:10,borderRadius:2,background:positive}}/>Positivo</div>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#94a3b8"}}><div style={{width:10,height:10,borderRadius:2,background:negative}}/>Negativo</div>
                <span style={{fontSize:11,color:subtext}}>mês actual destacado</span>
              </div>
            </div>
          );
        })()}
      </div>
      {/* Category comparison */}
      <div style={{ ...S.card }}>
        <span style={S.secTitle}>Categorias — {curr.fullLabel} vs {prev.fullLabel}</span>
        {expCats.map(c=>{
          const cVal = curr.byCat[c.id]||0;
          const pVal = prev.byCat[c.id]||0;
          if(cVal===0&&pVal===0) return null;
          const diff = cVal - pVal;
          const maxVal = Math.max(cVal, pVal, 1);
          return(
            <div key={c.id} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                <span style={{ fontSize:13 }}>{c.icon} {c.label}</span>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {pVal>0&&<span style={{ fontSize:11, color:subtext }}>ant: {fmt(pVal)}</span>}
                  <span style={{ fontSize:13, fontWeight:700, color:cVal>0?negative:subtext }}>{fmt(cVal)}</span>
                  {pVal>0&&<TrendBadge curr={cVal} prev={pVal} inverse/>}
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <div style={{ height:5, borderRadius:99, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
                  <div style={{ width:`${(cVal/maxVal)*100}%`, height:"100%", background:negative, borderRadius:99, transition:"width .5s" }}/>
                </div>
                <div style={{ height:5, borderRadius:99, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
                  <div style={{ width:`${(pVal/maxVal)*100}%`, height:"100%", background:`${negative}55`, borderRadius:99, transition:"width .5s" }}/>
                </div>
              </div>
              {diff!==0&&<div style={{ fontSize:10, color:diff>0?"#fb7185":"#34d399", marginTop:3, fontWeight:600 }}>{diff>0?"↑":"↓"} {fmt(Math.abs(diff))} vs mês anterior</div>}
            </div>
          );
        })}
      </div>
      {/* Poupança trend */}
      <div style={{ ...S.card }}>
        <span style={S.secTitle}>Poupança mensal</span>
        {months.map((m,i)=>{
          const isPos = m.poupanca >= 0;
          const maxP  = Math.max(...months.map(x=>Math.abs(x.poupanca)),1);
          const w     = Math.round((Math.abs(m.poupanca)/maxP)*100);
          const isLast= i===5;
          return(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <span style={{ fontSize:11, color:isLast?accent:subtext, fontWeight:isLast?700:400, flex:"0 0 32px" }}>{m.label}</span>
              <div style={{ flex:1, height:8, borderRadius:99, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
                <div style={{ width:`${w}%`, height:"100%", background:isPos?positive:negative, borderRadius:99, transition:"width .5s", opacity:isLast?1:0.6 }}/>
              </div>
              <span style={{ fontSize:12, fontWeight:isLast?800:600, color:isPos?positive:negative, flex:"0 0 80px", textAlign:"right" as const }}>{fmt(m.poupanca)}</span>
            </div>
          );
        })}
      </div>
      {/* Evolução por categoria — interactivo */}
      <CatEvolution months={months} expCats={expCats} cardBorder={cardBorder} cardBg={cardBg} accent={accent} subtext={subtext} negative={negative}/>
    </div>
  );
}