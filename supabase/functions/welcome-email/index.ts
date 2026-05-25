// ============================================================
// supabase/functions/welcome-email/index.ts
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
              Bem-vindo ao único lugar onde consegues gerir as tuas finanças pessoais <strong style="color:#f1f5f9;">e as do casal</strong> — tudo numa só app.
            </p>

            <!-- Divider -->
            <div style="height:1px;background:rgba(255,255,255,0.07);margin-bottom:28px;"></div>

            <!-- HERO — Modo Casal -->
            <div style="background:linear-gradient(135deg,rgba(236,72,153,0.12),rgba(249,115,22,0.08));border:1.5px solid rgba(236,72,153,0.3);border-radius:16px;padding:24px;margin-bottom:28px;">
              <div style="text-align:center;margin-bottom:16px;">
                <div style="font-size:40px;margin-bottom:8px;">💑</div>
                <div style="font-size:18px;font-weight:800;color:#f1f5f9;margin-bottom:6px;">Modo Casal — o teu diferenciador</div>
                <div style="font-size:13px;color:#667085;line-height:1.6;">Gere as finanças a dois de forma transparente, justa e sem conflitos.</div>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:32px;font-size:18px;">⚖️</td>
                        <td style="padding-left:10px;">
                          <div style="font-size:13px;font-weight:700;color:#f1f5f9;">Divide despesas automaticamente</div>
                          <div style="font-size:12px;color:#667085;margin-top:2px;">50/50 ou personalizado — tu decides</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:32px;font-size:18px;">🔄</td>
                        <td style="padding-left:10px;">
                          <div style="font-size:13px;font-weight:700;color:#f1f5f9;">Acertos automáticos</div>
                          <div style="font-size:12px;color:#667085;margin-top:2px;">Quem pagou o quê — sempre claro e justo</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:32px;font-size:18px;">🎯</td>
                        <td style="padding-left:10px;">
                          <div style="font-size:13px;font-weight:700;color:#f1f5f9;">Metas partilhadas</div>
                          <div style="font-size:12px;color:#667085;margin-top:2px;">Poupem juntos para férias, casa, carro...</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:32px;font-size:18px;">📊</td>
                        <td style="padding-left:10px;">
                          <div style="font-size:13px;font-weight:700;color:#f1f5f9;">Relatório mensal de casal</div>
                          <div style="font-size:12px;color:#667085;margin-top:2px;">Resumo conjunto dia 2 de cada mês</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:32px;font-size:18px;">🔔</td>
                        <td style="padding-left:10px;">
                          <div style="font-size:13px;font-weight:700;color:#f1f5f9;">Notificações em tempo real</div>
                          <div style="font-size:12px;color:#667085;margin-top:2px;">Sabes sempre quando o teu parceiro/a adiciona ou liquida uma despesa</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Tudo no mesmo sítio -->
            <div style="margin-bottom:28px;">
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#667085;text-transform:uppercase;letter-spacing:0.12em;">Tudo num só lugar</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding-right:6px;">
                    <div style="background:#0A0D14;border:1px solid rgba(93,169,255,0.2);border-radius:12px;padding:16px;text-align:center;">
                      <div style="font-size:24px;margin-bottom:8px;">👤</div>
                      <div style="font-size:13px;font-weight:700;color:#5DA9FF;margin-bottom:4px;">Conta Pessoal</div>
                      <div style="font-size:11px;color:#667085;line-height:1.5;">Despesas, rendimentos, metas e Net Worth pessoal</div>
                    </div>
                  </td>
                  <td width="50%" style="padding-left:6px;">
                    <div style="background:#0A0D14;border:1px solid rgba(236,72,153,0.2);border-radius:12px;padding:16px;text-align:center;">
                      <div style="font-size:24px;margin-bottom:8px;">💑</div>
                      <div style="font-size:13px;font-weight:700;color:#ec4899;margin-bottom:4px;">Conta Casal</div>
                      <div style="font-size:11px;color:#667085;line-height:1.5;">Despesas conjuntas, acertos e metas partilhadas</div>
                    </div>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Divider -->
            <div style="height:1px;background:rgba(255,255,255,0.07);margin-bottom:28px;"></div>

            <!-- Planos -->
            <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:#667085;text-transform:uppercase;letter-spacing:0.12em;">Planos disponíveis</p>

            <!-- Free -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
              <tr>
                <td style="background:#0A0D14;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px 18px;">
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
                <td style="background:#0A0D14;border:1px solid rgba(93,169,255,0.25);border-radius:12px;padding:14px 18px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <div style="font-size:13px;font-weight:800;color:#f1f5f9;">Individual</div>
                        <div style="font-size:11px;color:#667085;margin-top:2px;">Tudo ilimitado · metas · recorrentes · estatísticas</div>
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
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:linear-gradient(135deg,rgba(236,72,153,0.12),rgba(139,109,255,0.08));border:1.5px solid #ec4899;border-radius:12px;padding:14px 18px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <div style="font-size:11px;font-weight:700;color:#ec4899;margin-bottom:4px;">💑 INCLUI MODO CASAL</div>
                        <div style="font-size:13px;font-weight:800;color:#f1f5f9;">Premium</div>
                        <div style="font-size:11px;color:#667085;margin-top:2px;">Tudo do Individual + modo casal completo para ambos</div>
                      </td>
                      <td align="right">
                        <div style="font-size:16px;font-weight:800;color:#ec4899;">7,99€<span style="font-size:11px;font-weight:400;color:#667085;">/mês</span></div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td align="center">
                  <a href="${APP_URL}" style="display:inline-block;padding:15px 40px;background:linear-gradient(135deg,#5DA9FF,#8B6DFF);border-radius:12px;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;letter-spacing:-0.2px;">
                    Entrar na app →
                  </a>
                </td>
              </tr>
            </table>

            <!-- Tip -->
            <div style="background:rgba(236,72,153,0.08);border:1px solid rgba(236,72,153,0.2);border-radius:12px;padding:14px 16px;">
              <p style="margin:0;font-size:13px;color:#ec4899;line-height:1.6;">
                💡 <strong>Dica:</strong> convida o teu parceiro/a dentro da app em <strong>Casal → Convidar</strong>. O teu parceiro/a terá acesso completo ao modo casal enquanto estiverem ligados.
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
        subject: `Bem-vindo ao ${APP_NAME} — finanças pessoais e de casal numa só app 💑`,
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