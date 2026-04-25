import { useMemo, CSSProperties } from "react";

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

export default function MonthComparison({ expenses, incomes, expCats, world, accent, cardBg, cardBorder, subtext, positive, negative }: Props) {
  const now = new Date();
  const currMonth = now.getMonth();
  const currYear  = now.getFullYear();

  // Build last 6 months of data
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
      // By category
      const byCat: Record<string,number> = {};
      expCats.forEach(c=>{ byCat[c.id]=exp.filter(e=>e.cat===c.id).reduce((s,e)=>s+Number(e.valor),0); });
      // By type
      const byType: Record<TypeKey,number> = { necessidade:0, desejo:0, investimento:0 };
      exp.forEach(e=>{ if(e.tipo in byType) byType[e.tipo]+=Number(e.valor); });
      result.push({ month:m, year:y, label:MONTHS_SHORT[m], fullLabel:MONTHS_PT[m], totalExp, totalInc, poupanca:totalInc-totalExp, byCat, byType, expCount:exp.length });
    }
    return result;
  }, [expenses, incomes, world, expCats]);

  const curr = months[5];
  const prev = months[4];
  const maxBar = Math.max(...months.map(m=>Math.max(m.totalExp, m.totalInc)), 1);
  const totalPoupanca = months.reduce((s,m)=>s+Math.max(0,m.poupanca),0);

  // Auto insight
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

      {/* Insight automático */}
      {insight&&(
        <div style={{ background:insight.type==="good"?"rgba(52,211,153,0.08)":insight.type==="warn"?"rgba(251,113,133,0.08)":"rgba(255,255,255,0.04)", border:`1px solid ${insight.type==="good"?"rgba(52,211,153,0.3)":insight.type==="warn"?"rgba(251,113,133,0.3)":"rgba(255,255,255,0.08)"}`, borderRadius:14, padding:"14px 16px", marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:insight.type==="good"?positive:insight.type==="warn"?negative:"#94a3b8", marginBottom:5 }}>
            {insight.type==="good"?"🎉 Boa notícia!":insight.type==="warn"?"⚠️ Atenção":"📊 Análise"}
          </div>
          <div style={{ fontSize:13, color:"#94a3b8", lineHeight:1.6 }}>{insight.text}</div>
        </div>
      )}

      {/* KPI comparison curr vs prev */}
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

      {/* Bar chart — 6 months */}
      <div style={{ ...S.card }}>
        <span style={S.secTitle}>Evolução 6 meses</span>
        <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:80, marginBottom:10 }}>
          {months.map((m,i)=>{
            const rH = Math.round((m.totalInc/maxBar)*72)||2;
            const dH = Math.round((m.totalExp/maxBar)*72)||2;
            const isLast = i===5;
            return(
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                <div style={{ display:"flex", alignItems:"flex-end", gap:1, height:72 }}>
                  <div style={{ width:"45%", height:rH, background:isLast?positive:`${positive}55`, borderRadius:"3px 3px 0 0", transition:"height .4s" }}/>
                  <div style={{ width:"45%", height:dH, background:isLast?negative:`${negative}55`, borderRadius:"3px 3px 0 0", transition:"height .4s" }}/>
                </div>
                <span style={{ fontSize:9, color:isLast?accent:subtext, fontWeight:isLast?700:400 }}>{m.label}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#94a3b8" }}><div style={{ width:10,height:10,borderRadius:2,background:positive }}/>Rendimento</div>
          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#94a3b8" }}><div style={{ width:10,height:10,borderRadius:2,background:negative }}/>Despesas</div>
        </div>
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
              {/* Two bars: curr vs prev */}
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

    </div>
  );
}
