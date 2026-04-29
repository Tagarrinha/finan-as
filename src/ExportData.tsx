import { useState, CSSProperties } from "react";

type TypeKey = "necessidade"|"desejo"|"investimento";

interface Expense { id:number; descricao:string; valor:number; cat:string; subcat:string; data:string; tipo:TypeKey; world:string; }
interface Income  { id:number; descricao:string; valor:number; cat:string; data:string; world:string; }
interface BankAccount { id:number; nome:string; tipo:string; saldo:number; icon:string; }
interface ExpCat { id:string; label:string; icon:string; type:TypeKey; }
interface IncCat { id:string; label:string; icon:string; }

interface Props {
  expenses: Expense[];
  incomes: Income[];
  accounts: BankAccount[];
  expCats: ExpCat[];
  incCats: IncCat[];
  world: string;
  world1Name: string;
  world2Name: string;
  userName: string;
  accent: string;
  accentDark: string;
  cardBg: string;
  cardBorder: string;
  subtext: string;
  positive: string;
  negative: string;
}

const fmt = (n:number) => new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR"}).format(n||0);
const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const TYPE_LABELS: Record<TypeKey,string> = { necessidade:"Necessidade", desejo:"Desejo", investimento:"Investimento" };

export default function ExportData({ expenses, incomes, accounts, expCats, incCats, world, world1Name, world2Name, userName, accent, accentDark, cardBg, cardBorder, subtext, positive, negative }: Props) {
  const [period, setPeriod] = useState<"month"|"year"|"all">("month");
  const [exporting, setExporting] = useState<""|"pdf"|"excel">("");

  const now = new Date();
  const currMonth = now.getMonth();
  const currYear  = now.getFullYear();
  const worldName = world === "pessoal" ? world1Name : world2Name;

  // Filter by period
  const filtered = (arr: (Expense|Income)[]) => arr.filter(e => {
    if(e.world !== world) return false;
    const d = new Date(e.data+"T12:00:00");
    if(period === "month") return d.getMonth()===currMonth && d.getFullYear()===currYear;
    if(period === "year")  return d.getFullYear()===currYear;
    return true;
  });

  const myExpenses = filtered(expenses) as Expense[];
  const myIncomes  = filtered(incomes)  as Income[];
  const totalExp   = myExpenses.reduce((s,e)=>s+Number(e.valor),0);
  const totalInc   = myIncomes.reduce((s,i)=>s+Number(i.valor),0);
  const balance    = totalInc - totalExp;
  const totalSaldo = accounts.reduce((s,a)=>s+Number(a.saldo),0);

  const periodLabel = period==="month" ? `${MONTHS[currMonth]} ${currYear}` : period==="year" ? String(currYear) : "Todo o período";

  // ── EXCEL EXPORT ──────────────────────────────────────────────────────────
  async function exportExcel() {
    setExporting("excel");
    try {
      // Load SheetJS
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      document.head.appendChild(script);
      await new Promise(r=>script.onload=r);
      const XLSX = (window as any).XLSX;

      const wb = XLSX.utils.book_new();

      // Sheet 1 — Despesas
      const expData = [
        ["Data","Descrição","Categoria","Sub-categoria","Tipo","Valor (€)"],
        ...myExpenses.map(e=>{
          const cat = expCats.find(c=>c.id===e.cat);
          return [
            new Date(e.data+"T12:00:00").toLocaleDateString("pt-PT"),
            e.descricao,
            cat?.label||e.cat,
            e.subcat||"",
            TYPE_LABELS[e.tipo]||e.tipo,
            Number(e.valor),
          ];
        }),
        [],
        ["","","","","TOTAL", totalExp],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(expData);
      ws1["!cols"] = [{wch:12},{wch:30},{wch:18},{wch:18},{wch:14},{wch:12}];
      XLSX.utils.book_append_sheet(wb, ws1, "Despesas");

      // Sheet 2 — Rendimentos
      const incData = [
        ["Data","Descrição","Categoria","Valor (€)"],
        ...myIncomes.map(i=>{
          const cat = incCats.find(c=>c.id===i.cat);
          return [
            new Date(i.data+"T12:00:00").toLocaleDateString("pt-PT"),
            i.descricao,
            cat?.label||i.cat,
            Number(i.valor),
          ];
        }),
        [],
        ["","","TOTAL", totalInc],
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(incData);
      ws2["!cols"] = [{wch:12},{wch:30},{wch:18},{wch:12}];
      XLSX.utils.book_append_sheet(wb, ws2, "Rendimentos");

      // Sheet 3 — Resumo
      const byType: Record<string,number> = { necessidade:0, desejo:0, investimento:0 };
      myExpenses.forEach(e=>{ if(e.tipo in byType) byType[e.tipo]+=Number(e.valor); });

      const summaryData = [
        [`Relatório Financeiro — ${worldName}`],
        [`Período: ${periodLabel}`],
        [`Utilizador: ${userName}`],
        [],
        ["RESUMO",""],
        ["Rendimento total", totalInc],
        ["Despesas total", totalExp],
        ["Resultado", balance],
        [],
        ["CONTAS BANCÁRIAS",""],
        ...accounts.map(a=>[`${a.icon} ${a.nome}`, Number(a.saldo)]),
        ["Saldo total", totalSaldo],
        [],
        ["DISTRIBUIÇÃO POR TIPO",""],
        ["Necessidades", byType.necessidade],
        ["Desejos", byType.desejo],
        ["Investimentos", byType.investimento],
        [],
        ["TOP CATEGORIAS",""],
        ...expCats.map(c=>{
          const total = myExpenses.filter(e=>e.cat===c.id).reduce((s,e)=>s+Number(e.valor),0);
          return total > 0 ? [`${c.icon} ${c.label}`, total] : null;
        }).filter(Boolean).sort((a:any,b:any)=>b[1]-a[1]).slice(0,8) as any[],
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(summaryData);
      ws3["!cols"] = [{wch:28},{wch:16}];
      XLSX.utils.book_append_sheet(wb, ws3, "Resumo");

      // Download
      XLSX.writeFile(wb, `FinTrack_${worldName}_${periodLabel.replace(" ","_")}.xlsx`);
    } catch(e) { console.error(e); }
    setExporting("");
  }

  // ── PDF EXPORT ────────────────────────────────────────────────────────────
  async function exportPDF() {
    setExporting("pdf");
    try {
      // Build HTML for PDF
      const byType: Record<string,number> = { necessidade:0, desejo:0, investimento:0 };
      myExpenses.forEach(e=>{ if(e.tipo in byType) byType[e.tipo]+=Number(e.valor); });

      const topCats = expCats.map(c=>({
        ...c,
        total: myExpenses.filter(e=>e.cat===c.id).reduce((s,e)=>s+Number(e.valor),0)
      })).filter(c=>c.total>0).sort((a,b)=>b.total-a.total).slice(0,6);

      const html = `
<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Helvetica Neue',Arial,sans-serif;background:#fff;color:#1a1a2e;padding:32px;}
  .header{display:flex;justify-content:space-between;align-items:center;padding-bottom:20px;border-bottom:3px solid #f97316;margin-bottom:24px;}
  .logo{font-size:24px;font-weight:900;color:#f97316;letter-spacing:-0.5px;}
  .meta{text-align:right;font-size:12px;color:#64748b;}
  h2{font-size:14px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:.1em;margin:20px 0 10px;padding-bottom:4px;border-bottom:1px solid #f9731630;}
  .kpi-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:4px;}
  .kpi{background:#f8fafc;border-radius:10px;padding:14px;text-align:center;border:1px solid #e2e8f0;}
  .kpi-label{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px;}
  .kpi-val{font-size:20px;font-weight:800;letter-spacing:-0.5px;}
  .green{color:#10b981;} .red{color:#ef4444;} .orange{color:#f97316;}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:4px;}
  th{background:#f97316;color:#fff;padding:8px 10px;text-align:left;font-weight:700;}
  td{padding:7px 10px;border-bottom:1px solid #f1f5f9;}
  tr:nth-child(even) td{background:#fafafa;}
  .total-row td{font-weight:700;background:#fff7ed;color:#f97316;}
  .bar-wrap{margin-bottom:8px;}
  .bar-label{display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;}
  .bar-track{height:8px;background:#f1f5f9;border-radius:99px;overflow:hidden;}
  .bar-fill{height:100%;border-radius:99px;}
  .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between;}
  @media print{body{padding:20px;}}
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">💰 FinTrack</div>
      <div style="font-size:13px;color:#64748b;margin-top:4px;">Relatório Financeiro — ${worldName}</div>
    </div>
    <div class="meta">
      <div><strong>Período:</strong> ${periodLabel}</div>
      <div><strong>Utilizador:</strong> ${userName}</div>
      <div><strong>Gerado em:</strong> ${now.toLocaleDateString("pt-PT")}</div>
    </div>
  </div>

  <h2>Resumo</h2>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Rendimento</div><div class="kpi-val green">${fmt(totalInc)}</div></div>
    <div class="kpi"><div class="kpi-label">Despesas</div><div class="kpi-val red">${fmt(totalExp)}</div></div>
    <div class="kpi"><div class="kpi-label">Resultado</div><div class="kpi-val ${balance>=0?"green":"red"}">${fmt(balance)}</div></div>
  </div>

  <h2>Distribuição por Tipo</h2>
  ${["necessidade","desejo","investimento"].map(tipo=>{
    const v = byType[tipo]||0;
    const w = totalExp>0?Math.round(v/totalExp*100):0;
    const colors: Record<string,string> = {necessidade:"#3b82f6",desejo:"#f59e0b",investimento:"#10b981"};
    const labels: Record<string,string> = {necessidade:"🏠 Necessidades",desejo:"✨ Desejos",investimento:"📈 Investimentos"};
    return `<div class="bar-wrap">
      <div class="bar-label"><span>${labels[tipo]}</span><span><strong>${fmt(v)}</strong> (${w}%)</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${w}%;background:${colors[tipo]};"></div></div>
    </div>`;
  }).join("")}

  ${topCats.length>0?`
  <h2>Top Categorias</h2>
  <table>
    <tr><th>Categoria</th><th>Tipo</th><th style="text-align:right">Valor</th><th style="text-align:right">%</th></tr>
    ${topCats.map(c=>`<tr><td>${c.icon} ${c.label}</td><td>${TYPE_LABELS[c.type]}</td><td style="text-align:right;color:#ef4444;">${fmt(c.total)}</td><td style="text-align:right;">${totalExp>0?Math.round(c.total/totalExp*100):0}%</td></tr>`).join("")}
    <tr class="total-row"><td colspan="2">Total</td><td style="text-align:right">${fmt(totalExp)}</td><td></td></tr>
  </table>`:""}

  ${myIncomes.length>0?`
  <h2>Rendimentos por Fonte</h2>
  <table>
    <tr><th>Fonte</th><th style="text-align:right">Valor</th><th style="text-align:right">%</th></tr>
    ${incCats.map(c=>{const total=myIncomes.filter(i=>i.cat===c.id).reduce((s,i)=>s+Number(i.valor),0);if(!total)return"";return`<tr><td>${c.icon} ${c.label}</td><td style="text-align:right;color:#10b981;">${fmt(total)}</td><td style="text-align:right;">${totalInc>0?Math.round(total/totalInc*100):0}%</td></tr>`;}).join("")}
    <tr class="total-row"><td>Total (${myIncomes.length} entradas)</td><td style="text-align:right">${fmt(totalInc)}</td><td></td></tr>
  </table>`:""}

  ${accounts.length>0?`
  <h2>Contas Bancárias</h2>
  <table>
    <tr><th>Conta</th><th>Tipo</th><th style="text-align:right">Saldo</th></tr>
    ${accounts.map(a=>`<tr><td>${a.icon} ${a.nome}</td><td>${a.tipo}</td><td style="text-align:right;color:${Number(a.saldo)>=0?"#10b981":"#ef4444"};">${fmt(Number(a.saldo))}</td></tr>`).join("")}
    <tr class="total-row"><td colspan="2">💎 Net Worth</td><td style="text-align:right">${fmt(totalSaldo)}</td></tr>
  </table>`:""}

  <div class="footer">
    <span>FinTrack — myownfintrack.netlify.app</span>
    <span>Gerado em ${now.toLocaleDateString("pt-PT")} às ${now.toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit"})}</span>
  </div>
</body>
</html>`;

      // Open print dialog
      const win = window.open("","_blank","width=900,height=700");
      if(!win) { alert("Permite pop-ups para gerar o PDF"); setExporting(""); return; }
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(()=>{ win.print(); }, 600);
    } catch(e) { console.error(e); }
    setExporting("");
  }

  const btn = (color:string):CSSProperties => ({
    flex:1, padding:"14px 0", border:"none", borderRadius:12, color:"#fff",
    fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'Sora',sans-serif",
    background:`linear-gradient(135deg,${color},${color}bb)`,
    boxShadow:`0 4px 16px ${color}40`, opacity: exporting?0.7:1,
    transition:"all .2s",
  });

  const card:CSSProperties = { background:cardBg, border:`1px solid ${cardBorder}`, borderRadius:14, padding:"16px 18px", marginBottom:12 };

  return (
    <div style={{ fontFamily:"'Sora',sans-serif" }}>

      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${accent}15,${accentDark}08)`, border:`1px solid ${accent}25`, borderRadius:16, padding:"16px 18px", marginBottom:16, textAlign:"center" as const }}>
        <div style={{ fontSize:32, marginBottom:8 }}>📤</div>
        <div style={{ fontSize:15, fontWeight:800, color:"#f1f5f9", marginBottom:4 }}>Exportar dados</div>
        <div style={{ fontSize:13, color:subtext }}>PDF ou Excel com os teus dados financeiros</div>
      </div>

      {/* Period selector */}
      <div style={{ ...card }}>
        <div style={{ fontSize:10, fontWeight:700, color:subtext, textTransform:"uppercase" as const, letterSpacing:"0.08em", marginBottom:12 }}>Período</div>
        <div style={{ display:"flex", gap:8 }}>
          {([["month","Este mês"],["year","Este ano"],["all","Tudo"]] as const).map(([p,lbl])=>(
            <button key={p} onClick={()=>setPeriod(p)} style={{ flex:1, padding:"10px 0", border:`1.5px solid ${period===p?accent:"rgba(255,255,255,0.1)"}`, borderRadius:10, background:period===p?`${accent}20`:"transparent", color:period===p?accent:"#64748b", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'Sora',sans-serif", transition:"all .2s" }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div style={{ ...card }}>
        <div style={{ fontSize:10, fontWeight:700, color:subtext, textTransform:"uppercase" as const, letterSpacing:"0.08em", marginBottom:12 }}>Pré-visualização</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:10 }}>
          {[
            { label:"Rendimento", val:totalInc, color:positive },
            { label:"Despesas",   val:totalExp, color:negative },
            { label:"Resultado",  val:balance,  color:balance>=0?positive:negative },
          ].map(k=>(
            <div key={k.label} style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px 8px", textAlign:"center" as const }}>
              <div style={{ fontSize:10, color:subtext, marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:14, fontWeight:800, color:k.color }}>{fmt(k.val)}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:12, color:subtext, textAlign:"center" as const }}>
          {worldName} · {periodLabel} · {myExpenses.length} despesas · {myIncomes.length} rendimentos
        </div>
      </div>

      {/* Export buttons */}
      <div style={{ display:"flex", gap:10, marginBottom:12 }}>
        <button onClick={exportPDF} disabled={!!exporting} style={btn("#ef4444")}>
          {exporting==="pdf" ? "A gerar..." : "📄 Exportar PDF"}
        </button>
        <button onClick={exportExcel} disabled={!!exporting} style={btn("#10b981")}>
          {exporting==="excel" ? "A gerar..." : "📊 Exportar Excel"}
        </button>
      </div>

      {/* Info */}
      <div style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${cardBorder}`, borderRadius:12, padding:"12px 16px" }}>
        <div style={{ fontSize:12, color:subtext, lineHeight:1.7 }}>
          <div>📄 <strong style={{color:"#e2e8f0"}}>PDF</strong> — abre uma janela para imprimir ou guardar como PDF</div>
          <div>📊 <strong style={{color:"#e2e8f0"}}>Excel</strong> — descarrega um ficheiro .xlsx com 3 folhas: Despesas, Rendimentos e Resumo</div>
        </div>
      </div>
    </div>
  );
}
