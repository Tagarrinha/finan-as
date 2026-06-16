// ============================================================
// supabase/functions/couple-monthly-report/index.ts
// Cria a pasta: ~/Desktop/finan-as/supabase/functions/couple-monthly-report/index.ts
// Cron job: dia 2 de cada mês às 8h30 (30 min depois do personal)
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = "re_CDJr9QBs_CMnD4n7aNtXJLVdyypxKJSSD";
const FROM_EMAIL = "hello@myownfintrack.app";
const APP_NAME = "MyOwnFintrack";
const APP_URL = "https://myownfintrack.app";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function fmt(n: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n || 0);
}

const CAT_ICONS: Record<string, string> = {
  casa:"🏠", supermercado:"🛒", restaurantes:"🍽️", combustivel:"⛽",
  carro:"🚗", barbeiro:"✂️", ginasio:"🏋️", saude:"🏥",
  compras:"🛍️", prendas:"🎁", viagens:"✈️", educacao:"📚", outros_p:"📦",
  renda:"🏢", equipamento:"🩺", consumiveis:"🧴", marketing:"📣",
  contabilidade:"📋", seguros_c:"🛡️", formacao_c:"📚", software:"💻", outros_c:"📦",
  salario:"💼", refeicao:"🍱", clinica:"🏥", prendas_r:"🎁", outros_r:"📦",
  consultas:"🧑‍⚕️", seguradoras:"🛡️", workshops:"📣", outros_ci:"📦",
};

serve(async (req) => {
  try {
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const prevPrevMonth = prevMonth === 0 ? 11 : prevMonth - 1;
    const prevPrevYear = prevMonth === 0 ? prevYear - 1 : prevYear;
    const monthName = MONTHS_PT[prevMonth];

    const startDate = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-01`;
    const endDate = new Date(prevYear, prevMonth + 1, 0).toISOString().slice(0, 10);
    const prevStartDate = `${prevPrevYear}-${String(prevPrevMonth + 1).padStart(2, "0")}-01`;
    const prevEndDate = new Date(prevPrevYear, prevPrevMonth + 1, 0).toISOString().slice(0, 10);

    // Busca todos os casais ativos
    const { data: couples } = await supabase
      .from("couples")
      .select("*")
      .eq("status", "active");

    if (!couples?.length) {
      return new Response(JSON.stringify({ message: "No active couples" }), { status: 200 });
    }

    let sent = 0;
    let errors = 0;

    for (const couple of couples) {
      try {
        // Busca despesas conjuntas do mês anterior
        const { data: thisMonthExp } = await supabase
          .from("couple_expenses")
          .select("*")
          .eq("couple_id", couple.id)
          .eq("liquidado", true)
          .gte("data", startDate)
          .lte("data", endDate);

        // Busca despesas do mês anterior ao anterior (para comparação)
        const { data: prevMonthExp } = await supabase
          .from("couple_expenses")
          .select("*")
          .eq("couple_id", couple.id)
          .eq("liquidado", true)
          .gte("data", prevStartDate)
          .lte("data", prevEndDate);

        // Busca conta conjunta
        const { data: account } = await supabase
          .from("couple_account")
          .select("*")
          .eq("couple_id", couple.id)
          .maybeSingle();

        // Se não há dados este mês, skip
        if (!thisMonthExp?.length) continue;

        // Totais
        const totalThisMonth = (thisMonthExp || []).reduce((s: number, e: any) => s + Number(e.valor), 0);
        const totalPrevMonth = (prevMonthExp || []).reduce((s: number, e: any) => s + Number(e.valor), 0);
        const monthDiff = totalThisMonth - totalPrevMonth;

        // Contribuições
        const contrib1 = (thisMonthExp || []).reduce((s: number, e: any) => s + Number(e.split_user1), 0);
        const contrib2 = (thisMonthExp || []).reduce((s: number, e: any) => s + Number(e.split_user2), 0);
        const totalContrib = contrib1 + contrib2;
        const saldoConjunto = totalContrib - totalThisMonth;


        // Top categorias este mês
        const catMap: Record<string, number> = {};
        (thisMonthExp || []).forEach((e: any) => {
          catMap[e.cat] = (catMap[e.cat] || 0) + Number(e.valor);
        });

        // Top categorias mês anterior
        const prevCatMap: Record<string, number> = {};
        (prevMonthExp || []).forEach((e: any) => {
          prevCatMap[e.cat] = (prevCatMap[e.cat] || 0) + Number(e.valor);
        });

        const topCats = Object.entries(catMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        // Quem contribuiu mais
        const user1MoreThanUser2 = contrib1 >= contrib2;
        const contrib1Pct = totalContrib > 0 ? Math.round((contrib1 / totalContrib) * 100) : 50;
        const contrib2Pct = 100 - contrib1Pct;

        // Busca emails dos utilizadores
        const { data: user1Data } = await supabase.auth.admin.getUserById(couple.user1_id);
        const { data: user2Data } = couple.user2_id
          ? await supabase.auth.admin.getUserById(couple.user2_id)
          : { data: null };

        const user1Email = user1Data?.user?.email;
        const user2Email = user2Data?.user?.email;
        const user1Name = user1Data?.user?.user_metadata?.name || user1Email?.split("@")[0] || "Utilizador 1";
        const user2Name = user2Data?.user?.user_metadata?.name || user2Email?.split("@")[0] || "Utilizador 2";

        // Gera HTML do email
        const generateHtml = (userName: string, isUser1: boolean) => {
          const myContrib = isUser1 ? contrib1 : contrib2;
          const myContribPct = isUser1 ? contrib1Pct : contrib2Pct;
          const partnerName = isUser1 ? user2Name : user1Name;
          const partnerContrib = isUser1 ? contrib2 : contrib1;
          const partnerContribPct = isUser1 ? contrib2Pct : contrib1Pct;

          return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Relatório de Casal — ${monthName} ${prevYear}</title>
</head>
<body style="margin:0;padding:0;background:#0A0D14;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0D14;padding:40px 20px;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <!-- HEADER -->
        <tr>
          <td align="center" style="padding-bottom:24px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:linear-gradient(135deg,#5DA9FF,#8B6DFF);border-radius:14px;padding:12px 20px;text-align:center;">
                  <span style="font-size:13px;font-weight:800;color:#ffffff;letter-spacing:0.05em;">MyOwnFintrack</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- MAIN CARD -->
        <tr>
          <td style="background:#151B2D;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:40px 36px;">

            <!-- Badge casal -->
            <div style="text-align:center;margin-bottom:20px;">
              <div style="display:inline-block;background:rgba(236,72,153,0.12);border:1px solid rgba(236,72,153,0.3);border-radius:99px;padding:6px 16px;font-size:12px;font-weight:700;color:#ec4899;">
                💑 Relatório de Casal
              </div>
            </div>

            <!-- Title -->
            <div style="text-align:center;margin-bottom:8px;">
              <div style="font-size:11px;font-weight:700;color:#667085;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">Relatório mensal</div>
              <h1 style="margin:0;font-size:26px;font-weight:800;color:#f1f5f9;letter-spacing:-0.5px;">
                ${monthName} ${prevYear}
              </h1>
              <p style="margin:8px 0 0;font-size:14px;color:#667085;">Olá ${userName}, aqui está o resumo conjunto do mês</p>
            </div>

            <!-- Divider -->
            <div style="height:1px;background:rgba(255,255,255,0.07);margin:24px 0;"></div>

            <!-- Métricas principais -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td width="50%" style="padding-right:5px;">
                  <div style="background:#0A0D14;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;text-align:center;">
                    <div style="font-size:10px;color:#667085;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Despesas conjuntas</div>
                    <div style="font-size:20px;font-weight:800;color:#FF7D7D;">${fmt(totalThisMonth)}</div>
                    <div style="font-size:11px;color:#667085;margin-top:4px;">${(thisMonthExp || []).length} despesa${(thisMonthExp || []).length !== 1 ? "s" : ""}</div>
                  </div>
                </td>
                <td width="50%" style="padding-left:5px;">
                  <div style="background:#0A0D14;border:1px solid ${saldoConjunto >= 0 ? "rgba(87,227,160,0.2)" : "rgba(255,125,125,0.2)"};border-radius:12px;padding:16px;text-align:center;">
                    <div style="font-size:10px;color:#667085;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Saldo conjunto</div>
                    <div style="font-size:20px;font-weight:800;color:${saldoConjunto >= 0 ? "#57E3A0" : "#FF7D7D"};">${saldoConjunto >= 0 ? "+" : ""}${fmt(saldoConjunto)}</div>
                    <div style="font-size:11px;color:#667085;margin-top:4px;">${fmt(totalContrib)} contribuições</div>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Comparação mensal -->
            ${totalPrevMonth > 0 ? `
            <div style="background:${monthDiff <= 0 ? "rgba(87,227,160,0.06)" : "rgba(255,125,125,0.06)"};border:1px solid ${monthDiff <= 0 ? "rgba(87,227,160,0.2)" : "rgba(255,125,125,0.2)"};border-radius:14px;padding:14px 16px;margin-bottom:20px;">
              <div style="font-size:10px;font-weight:700;color:#667085;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Comparação mensal</div>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                <tr>
                  <td width="50%" style="text-align:center;">
                    <div style="font-size:10px;color:#667085;margin-bottom:4px;">${MONTHS_PT[prevPrevMonth]}</div>
                    <div style="font-size:18px;font-weight:800;color:#94a3b8;">${fmt(totalPrevMonth)}</div>
                  </td>
                  <td width="50%" style="text-align:center;">
                    <div style="font-size:10px;color:#667085;margin-bottom:4px;">${monthName} (atual)</div>
                    <div style="font-size:18px;font-weight:800;color:#f1f5f9;">${fmt(totalThisMonth)}</div>
                  </td>
                </tr>
              </table>
              <div style="text-align:center;padding:8px 12px;background:${monthDiff <= 0 ? "rgba(87,227,160,0.1)" : "rgba(255,125,125,0.1)"};border-radius:10px;">
                <span style="font-size:13px;font-weight:700;color:${monthDiff <= 0 ? "#57E3A0" : "#FF7D7D"};">
                  ${monthDiff <= 0 ? "↓" : "↑"} ${fmt(Math.abs(monthDiff))} ${monthDiff <= 0 ? "menos" : "mais"} que o mês anterior
                </span>
              </div>
            </div>` : ""}

            <!-- Divider -->
            <div style="height:1px;background:rgba(255,255,255,0.07);margin-bottom:20px;"></div>

            <!-- Contribuições -->
            <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#667085;text-transform:uppercase;letter-spacing:0.12em;">Contribuições do mês</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td width="50%" style="padding-right:5px;">
                  <div style="background:rgba(249,115,22,0.08);border:1px solid rgba(249,115,22,0.2);border-radius:12px;padding:14px;text-align:center;">
                    <div style="font-size:11px;font-weight:700;color:#f97316;margin-bottom:6px;">👤 ${userName}</div>
                    <div style="font-size:18px;font-weight:800;color:#f97316;">${fmt(myContrib)}</div>
                    <div style="font-size:11px;color:#667085;margin-top:4px;">${myContribPct}% do total</div>
                  </div>
                </td>
                <td width="50%" style="padding-left:5px;">
                  <div style="background:rgba(236,72,153,0.08);border:1px solid rgba(236,72,153,0.2);border-radius:12px;padding:14px;text-align:center;">
                    <div style="font-size:11px;font-weight:700;color:#ec4899;margin-bottom:6px;">👤 ${partnerName}</div>
                    <div style="font-size:18px;font-weight:800;color:#ec4899;">${fmt(partnerContrib)}</div>
                    <div style="font-size:11px;color:#667085;margin-top:4px;">${partnerContribPct}% do total</div>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Top categorias -->
            ${topCats.length > 0 ? `
            <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#667085;text-transform:uppercase;letter-spacing:0.12em;">Top categorias conjuntas</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              ${topCats.map(([cat, val], i) => {
                const prevVal = prevCatMap[cat] || 0;
                const diff = val - prevVal;
                return `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:13px;color:#cbd5e1;">${CAT_ICONS[cat] || "📦"} ${cat}</td>
                      <td align="right">
                        <span style="font-size:13px;font-weight:700;color:#f1f5f9;">${fmt(val)}</span>
                        ${prevVal > 0 ? `<span style="font-size:10px;font-weight:700;color:${diff > 0 ? "#FF7D7D" : "#57E3A0"};margin-left:6px;">${diff > 0 ? "↑" : "↓"}${fmt(Math.abs(diff))}</span>` : ""}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`;
              }).join("")}
            </table>` : ""}

            <!-- Mensagem motivacional -->
            <div style="background:${saldoConjunto >= 0 ? "rgba(87,227,160,0.08)" : "rgba(255,125,125,0.08)"};border:1px solid ${saldoConjunto >= 0 ? "rgba(87,227,160,0.2)" : "rgba(255,125,125,0.2)"};border-radius:12px;padding:16px;margin-bottom:24px;text-align:center;">
              <div style="font-size:22px;margin-bottom:8px;">${saldoConjunto >= 0 ? "🎉" : "💪"}</div>
              <div style="font-size:14px;font-weight:700;color:${saldoConjunto >= 0 ? "#57E3A0" : "#FF7D7D"};">
                ${saldoConjunto >= 0
                  ? `Sobrou ${fmt(saldoConjunto)} em ${monthName}. Bom trabalho em equipa!`
                  : `Mês desafiante, mas estão a acompanhar juntos. Continuem!`
                }
              </div>
            </div>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${APP_URL}" style="display:inline-block;padding:15px 40px;background:linear-gradient(135deg,#5DA9FF,#8B6DFF);border-radius:12px;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;">
                    Ver modo casal →
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td align="center" style="padding-top:24px;">
            <p style="margin:0;font-size:12px;color:#334155;line-height:1.6;">
              Relatório conjunto de ${monthName} ${prevYear} · ${APP_NAME}<br/>
              Os vossos dados estão seguros e encriptados. 🔒
            </p>
            <p style="margin:8px 0 0;font-size:12px;">
              <a href="${APP_URL}" style="color:#667085;text-decoration:none;">${APP_URL}</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
        };

        // Envia para user1
        if (user1Email) {
          const html1 = generateHtml(user1Name, true);
          const res1 = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: `${APP_NAME} <${FROM_EMAIL}>`,
              to: [user1Email],
              subject: `Relatório de casal — ${monthName} ${prevYear} 💑`,
              html: html1,
            }),
          });
          if (res1.ok) sent++; else errors++;
        }

        // Envia para user2
        if (user2Email) {
          const html2 = generateHtml(user2Name, false);
          const res2 = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: `${APP_NAME} <${FROM_EMAIL}>`,
              to: [user2Email],
              subject: `Relatório de casal — ${monthName} ${prevYear} 💑`,
              html: html2,
            }),
          });
          if (res2.ok) sent++; else errors++;
        }

      } catch (coupleErr) {
        console.error(`Error processing couple ${couple.id}:`, coupleErr);
        errors++;
      }
    }

    return new Response(JSON.stringify({ success: true, sent, errors }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
