// ============================================================
// supabase/functions/welcome-email/index.ts
// Substitui o ficheiro existente
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = "re_CDJr9QBs_CMnD4n7aNtXJLVdyypxKJSSD";
const FROM_EMAIL = "hello@myownfintrack.app";
const APP_NAME = "MyOwnFintrack";
const APP_URL = "https://myownfintrack.app";

serve(async (req) => {
  try {
    const body = await req.json();
    const record = body.record;

    if (!record?.email) {
      return new Response(JSON.stringify({ error: "No email found" }), { status: 400 });
    }

    const userName = record.raw_user_meta_data?.name || record.email.split("@")[0];
    const userEmail = record.email;

    const html = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Bem-vindo ao ${APP_NAME}</title>
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

            <!-- Greeting -->
            <h1 style="margin:0 0 8px;font-size:28px;font-weight:800;color:#f1f5f9;letter-spacing:-0.5px;">
              Olá, ${userName}! 👋
            </h1>
            <p style="margin:0 0 28px;font-size:15px;color:#667085;line-height:1.7;">
              A tua conta está criada. Bem-vindo ao lugar onde as tuas finanças finalmente fazem sentido.
            </p>

            <!-- Divider -->
            <div style="height:1px;background:rgba(255,255,255,0.07);margin-bottom:28px;"></div>

            <!-- Features -->
            <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:#667085;text-transform:uppercase;letter-spacing:0.12em;">O que tens à disposição</p>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:36px;height:36px;background:rgba(93,169,255,0.12);border-radius:10px;text-align:center;vertical-align:middle;font-size:18px;">📊</td>
                      <td style="padding-left:14px;vertical-align:middle;">
                        <div style="font-size:14px;font-weight:700;color:#f1f5f9;">Dashboard em tempo real</div>
                        <div style="font-size:12px;color:#667085;margin-top:2px;">Receitas, despesas e saldo sempre visíveis</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:36px;height:36px;background:rgba(93,169,255,0.12);border-radius:10px;text-align:center;vertical-align:middle;font-size:18px;">🎯</td>
                      <td style="padding-left:14px;vertical-align:middle;">
                        <div style="font-size:14px;font-weight:700;color:#f1f5f9;">Metas financeiras</div>
                        <div style="font-size:12px;color:#667085;margin-top:2px;">Define objetivos e acompanha o progresso</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:36px;height:36px;background:rgba(93,169,255,0.12);border-radius:10px;text-align:center;vertical-align:middle;font-size:18px;">🔄</td>
                      <td style="padding-left:14px;vertical-align:middle;">
                        <div style="font-size:14px;font-weight:700;color:#f1f5f9;">Despesas recorrentes</div>
                        <div style="font-size:12px;color:#667085;margin-top:2px;">Renda, ginásio, subscrições — tudo controlado</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:36px;height:36px;background:rgba(93,169,255,0.12);border-radius:10px;text-align:center;vertical-align:middle;font-size:18px;">🏦</td>
                      <td style="padding-left:14px;vertical-align:middle;">
                        <div style="font-size:14px;font-weight:700;color:#f1f5f9;">Contas bancárias & Net Worth</div>
                        <div style="font-size:12px;color:#667085;margin-top:2px;">Centraliza tudo e vê o teu património</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:36px;height:36px;background:rgba(93,169,255,0.12);border-radius:10px;text-align:center;vertical-align:middle;font-size:18px;">📈</td>
                      <td style="padding-left:14px;vertical-align:middle;">
                        <div style="font-size:14px;font-weight:700;color:#f1f5f9;">Comparação mensal</div>
                        <div style="font-size:12px;color:#667085;margin-top:2px;">Evolução mês a mês sempre visível</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Divider -->
            <div style="height:1px;background:rgba(255,255,255,0.07);margin:28px 0;"></div>

            <!-- Exemplo fictício de dashboard -->
            <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:#667085;text-transform:uppercase;letter-spacing:0.12em;">Exemplo do teu dashboard</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
              <tr>
                <td width="33%" style="padding-right:6px;">
                  <div style="background:#0A0D14;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;text-align:center;">
                    <div style="font-size:10px;color:#667085;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Receitas</div>
                    <div style="font-size:18px;font-weight:800;color:#57E3A0;">2.800€</div>
                  </div>
                </td>
                <td width="33%" style="padding:0 3px;">
                  <div style="background:#0A0D14;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;text-align:center;">
                    <div style="font-size:10px;color:#667085;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Despesas</div>
                    <div style="font-size:18px;font-weight:800;color:#FF7D7D;">1.240€</div>
                  </div>
                </td>
                <td width="33%" style="padding-left:6px;">
                  <div style="background:#0A0D14;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;text-align:center;">
                    <div style="font-size:10px;color:#667085;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Resultado</div>
                    <div style="font-size:18px;font-weight:800;color:#5DA9FF;">+1.560€</div>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Divider -->
            <div style="height:1px;background:rgba(255,255,255,0.07);margin:28px 0;"></div>

            <!-- Planos -->
            <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:#667085;text-transform:uppercase;letter-spacing:0.12em;">Planos disponíveis</p>

            <!-- Free -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
              <tr>
                <td style="background:#0A0D14;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px 18px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <div style="font-size:13px;font-weight:800;color:#f1f5f9;">Grátis</div>
                        <div style="font-size:11px;color:#667085;margin-top:2px;">Dashboard básico · 1 meta · histórico limitado</div>
                      </td>
                      <td align="right">
                        <div style="font-size:16px;font-weight:800;color:#f1f5f9;">0€</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Individual -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
              <tr>
                <td style="background:#0A0D14;border:1px solid rgba(93,169,255,0.3);border-radius:12px;padding:16px 18px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <div style="font-size:13px;font-weight:800;color:#f1f5f9;">Individual</div>
                        <div style="font-size:11px;color:#667085;margin-top:2px;">Tudo ilimitado · metas avançadas · recorrentes · estatísticas</div>
                      </td>
                      <td align="right">
                        <div style="font-size:16px;font-weight:800;color:#5DA9FF;">4,99€<span style="font-size:11px;font-weight:400;color:#667085;">/mês</span></div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Premium -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:linear-gradient(135deg,rgba(139,109,255,0.15),rgba(93,169,255,0.08));border:1.5px solid #5DA9FF;border-radius:12px;padding:16px 18px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <div style="font-size:11px;font-weight:700;color:#8B6DFF;margin-bottom:4px;">⭐ MAIS POPULAR</div>
                        <div style="font-size:13px;font-weight:800;color:#f1f5f9;">Premium</div>
                        <div style="font-size:11px;color:#667085;margin-top:2px;">Tudo do Individual + modo casal + acertos automáticos</div>
                      </td>
                      <td align="right">
                        <div style="font-size:16px;font-weight:800;color:#5DA9FF;">7,99€<span style="font-size:11px;font-weight:400;color:#667085;">/mês</span></div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${APP_URL}" style="display:inline-block;padding:15px 40px;background:linear-gradient(135deg,#5DA9FF,#8B6DFF);border-radius:12px;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;letter-spacing:-0.2px;">
                    Entrar na app →
                  </a>
                </td>
              </tr>
            </table>

            <!-- Tip -->
            <div style="background:rgba(93,169,255,0.08);border:1px solid rgba(93,169,255,0.2);border-radius:12px;padding:14px 16px;margin-top:24px;">
              <p style="margin:0;font-size:13px;color:#5DA9FF;line-height:1.6;">
                💡 <strong>Dica:</strong> começa por adicionar as tuas contas bancárias e rendimentos mensais. O tour interativo dentro da app guia-te em tudo.
              </p>
            </div>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td align="center" style="padding-top:24px;">
            <p style="margin:0;font-size:12px;color:#334155;line-height:1.6;">
              Recebeste este email porque criaste uma conta no ${APP_NAME}.<br/>
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
        subject: `Bem-vindo ao ${APP_NAME} 👋`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend error:", data);
      return new Response(JSON.stringify({ error: data }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
