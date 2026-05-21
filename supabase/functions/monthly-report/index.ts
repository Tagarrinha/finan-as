// ============================================================
// supabase/functions/monthly-report/index.ts
// Cria a pasta: ~/Desktop/finan-as/supabase/functions/monthly-report/index.ts
// Cron job: dia 2 de cada mês às 8h
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

serve(async (req) => {
  try {
    // Calcula o mês anterior
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const monthName = MONTHS_PT[prevMonth];

    // Data de início e fim do mês anterior
    const startDate = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-01`;
    const endDate = new Date(prevYear, prevMonth + 1, 0).toISOString().slice(0, 10);

    // Busca todos os utilizadores ativos
    const { data: users } = await supabase.auth.admin.listUsers();
    if (!users?.users?.length) {
      return new Response(JSON.stringify({ message: "No users found" }), { status: 200 });
    }

    let sent = 0;
    let errors = 0;

    for (const user of users.users) {
      try {
        const userId = user.id;
        const userEmail = user.email;
        const userName = user.user_metadata?.name || userEmail?.split("@")[0] || "utilizador";

        if (!userEmail) continue;

        // Busca despesas do mês anterior (mundo pessoal)
        const { data: expenses } = await supabase
          .from("expenses")
          .select("valor, cat, tipo")
          .eq("user_id", userId)
          .eq("world", "pessoal")
          .gte("data", startDate)
          .lte("data", endDate);

        // Busca rendimentos do mês anterior (mundo pessoal)
        const { data: incomes } = await supabase
          .from("incomes")
          .select("valor, cat")
          .eq("user_id", userId)
          .eq("world", "pessoal")
          .gte("data", startDate)
          .lte("data", endDate);

        // Busca contas bancárias
        const { data: accounts } = await supabase
          .from("accounts")
          .select("saldo, nome")
          .eq("user_id", userId);

        // Calcula totais
        const totalExp = (expenses || []).reduce((s, e) => s + Number(e.valor), 0);
        const totalInc = (incomes || []).reduce((s, i) => s + Number(i.valor), 0);
        const balance = totalInc - totalExp;
        const totalSaldo = (accounts || []).reduce((s, a) => s + Number(a.saldo), 0);

        // Se não tem dados no mês, skip
        if (totalExp === 0 && totalInc === 0) continue;

        // Top 3 categorias de despesa
        const catMap: Record<string, number> = {};
        (expenses || []).forEach(e => {
          catMap[e.cat] = (catMap[e.cat] || 0) + Number(e.valor);
        });
        const topCats = Object.entries(catMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);

        // Por tipo
        const byType = { necessidade: 0, desejo: 0, investimento: 0 };
        (expenses || []).forEach(e => {
          if (e.tipo in byType) byType[e.tipo as keyof typeof byType] += Number(e.valor);
        });

        const pct = (val: number, total: number) => total > 0 ? Math.round((val / total) * 100) : 0;

        const html = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Relatório de ${monthName} ${prevYear}</title>
</head>
<body style="margin:0;padding:0;background:#0A0D14;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0D14;padding:40px 20px;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <!-- HEADER -->
        <tr>
          <td align="center" style="padding-bottom:32px;">
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

            <!-- Title -->
            <div style="text-align:center;margin-bottom:8px;">
              <div style="font-size:11px;font-weight:700;color:#667085;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">Relatório mensal</div>
              <h1 style="margin:0;font-size:26px;font-weight:800;color:#f1f5f9;letter-spacing:-0.5px;">
                ${monthName} ${prevYear}
              </h1>
              <p style="margin:8px 0 0;font-size:14px;color:#667085;">Olá ${userName}, aqui está o resumo do teu mês</p>
            </div>

            <!-- Divider -->
            <div style="height:1px;background:rgba(255,255,255,0.07);margin:24px 0;"></div>

            <!-- Métricas principais -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td width="33%" style="padding-right:5px;">
                  <div style="background:#0A0D14;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;text-align:center;">
                    <div style="font-size:10px;color:#667085;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Receitas</div>
                    <div style="font-size:17px;font-weight:800;color:#57E3A0;">${fmt(totalInc)}</div>
                  </div>
                </td>
                <td width="33%" style="padding:0 2px;">
                  <div style="background:#0A0D14;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;text-align:center;">
                    <div style="font-size:10px;color:#667085;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Despesas</div>
                    <div style="font-size:17px;font-weight:800;color:#FF7D7D;">${fmt(totalExp)}</div>
                  </div>
                </td>
                <td width="33%" style="padding-left:5px;">
                  <div style="background:#0A0D14;border:1px solid ${balance >= 0 ? "rgba(87,227,160,0.2)" : "rgba(255,125,125,0.2)"};border-radius:12px;padding:16px;text-align:center;">
                    <div style="font-size:10px;color:#667085;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Resultado</div>
                    <div style="font-size:17px;font-weight:800;color:${balance >= 0 ? "#57E3A0" : "#FF7D7D"};">${balance >= 0 ? "+" : ""}${fmt(balance)}</div>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Net Worth -->
            ${accounts && accounts.length > 0 ? `
            <div style="background:#0A0D14;border:1px solid rgba(93,169,255,0.2);border-radius:12px;padding:16px;text-align:center;margin-bottom:20px;">
              <div style="font-size:10px;color:#667085;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Net Worth atual</div>
              <div style="font-size:24px;font-weight:800;color:#5DA9FF;">${fmt(totalSaldo)}</div>
              <div style="font-size:11px;color:#667085;margin-top:4px;">${(accounts || []).length} conta${(accounts || []).length !== 1 ? "s" : ""} bancária${(accounts || []).length !== 1 ? "s" : ""}</div>
            </div>` : ""}

            <!-- Divider -->
            <div style="height:1px;background:rgba(255,255,255,0.07);margin-bottom:20px;"></div>

            <!-- Composição -->
            ${totalExp > 0 ? `
            <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#667085;text-transform:uppercase;letter-spacing:0.12em;">Composição das despesas</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:13px;color:#cbd5e1;">🏠 Necessidades</td>
                      <td align="right" style="font-size:13px;font-weight:700;color:#3b82f6;">${fmt(byType.necessidade)} <span style="font-size:11px;color:#667085;font-weight:400;">(${pct(byType.necessidade, totalInc)}%)</span></td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:13px;color:#cbd5e1;">✨ Desejos</td>
                      <td align="right" style="font-size:13px;font-weight:700;color:#f59e0b;">${fmt(byType.desejo)} <span style="font-size:11px;color:#667085;font-weight:400;">(${pct(byType.desejo, totalInc)}%)</span></td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:13px;color:#cbd5e1;">📈 Investimentos</td>
                      <td align="right" style="font-size:13px;font-weight:700;color:#10b981;">${fmt(byType.investimento)} <span style="font-size:11px;color:#667085;font-weight:400;">(${pct(byType.investimento, totalInc)}%)</span></td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>` : ""}

            <!-- Top categorias -->
            ${topCats.length > 0 ? `
            <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#667085;text-transform:uppercase;letter-spacing:0.12em;">Top categorias</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              ${topCats.map(([cat, val], i) => `
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:13px;color:#cbd5e1;">${i + 1}. ${cat}</td>
                      <td align="right" style="font-size:13px;font-weight:700;color:#f1f5f9;">${fmt(val)}</td>
                    </tr>
                  </table>
                </td>
              </tr>`).join("")}
            </table>` : ""}

            <!-- Mensagem motivacional -->
            <div style="background:${balance >= 0 ? "rgba(87,227,160,0.08)" : "rgba(255,125,125,0.08)"};border:1px solid ${balance >= 0 ? "rgba(87,227,160,0.2)" : "rgba(255,125,125,0.2)"};border-radius:12px;padding:16px;margin-bottom:24px;text-align:center;">
              <div style="font-size:22px;margin-bottom:8px;">${balance >= 0 ? "🎉" : "💪"}</div>
              <div style="font-size:14px;font-weight:700;color:${balance >= 0 ? "#57E3A0" : "#FF7D7D"};">
                ${balance >= 0
                  ? `Guardaste ${fmt(balance)} em ${monthName}. Continua assim!`
                  : `Mês difícil, mas estás a acompanhar. Continua a registar!`
                }
              </div>
            </div>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${APP_URL}" style="display:inline-block;padding:15px 40px;background:linear-gradient(135deg,#5DA9FF,#8B6DFF);border-radius:12px;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;">
                    Ver dashboard completo →
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
              Relatório automático de ${monthName} ${prevYear} · ${APP_NAME}<br/>
              Os teus dados estão seguros e encriptados. 🔒
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
</html>
        `;

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${APP_NAME} <${FROM_EMAIL}>`,
            to: [userEmail],
            subject: `O teu relatório de ${monthName} ${prevYear} 📊`,
            html,
          }),
        });

        if (res.ok) {
          sent++;
        } else {
          errors++;
        }

      } catch (userErr) {
        console.error(`Error processing user ${user.id}:`, userErr);
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
