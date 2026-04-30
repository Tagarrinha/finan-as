import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = "re_CDJr9QBs_CMnD4n7aNtXJLVdyypxKJSSD";
const FROM_EMAIL = "onboarding@resend.dev";
const APP_NAME = "My Own Fintrack";
const APP_URL = "https://myownfintrack.netlify.app";

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
<body style="margin:0;padding:0;background:#080810;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080810;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo / Header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="display:inline-block;background:linear-gradient(135deg,#f97316,#ef4444);border-radius:16px;padding:14px 20px;font-size:28px;">💰</div>
              <div style="color:#f97316;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin-top:12px;">${APP_NAME}</div>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:36px 32px;">

              <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#f1f5f9;letter-spacing:-0.5px;">
                Olá, ${userName}! 👋
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
                Bem-vindo ao <strong style="color:#f97316;">${APP_NAME}</strong>. A tua conta está criada e pronta a usar.
              </p>

              <!-- Divider -->
              <div style="height:1px;background:rgba(255,255,255,0.07);margin-bottom:24px;"></div>

              <!-- Features -->
              <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.1em;">O que podes fazer</p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span style="font-size:18px;vertical-align:middle;">📊</span>
                    <span style="font-size:14px;color:#cbd5e1;margin-left:10px;vertical-align:middle;">Acompanha despesas e rendimentos em tempo real</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span style="font-size:18px;vertical-align:middle;">🎯</span>
                    <span style="font-size:14px;color:#cbd5e1;margin-left:10px;vertical-align:middle;">Define metas orçamentais e recebe alertas</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span style="font-size:18px;vertical-align:middle;">🔄</span>
                    <span style="font-size:14px;color:#cbd5e1;margin-left:10px;vertical-align:middle;">Gere despesas recorrentes automaticamente</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;">
                    <span style="font-size:18px;vertical-align:middle;">🏦</span>
                    <span style="font-size:14px;color:#cbd5e1;margin-left:10px;vertical-align:middle;">Controla todas as tuas contas bancárias</span>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <div style="height:1px;background:rgba(255,255,255,0.07);margin:24px 0;"></div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#f97316,#ef4444);border-radius:12px;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;letter-spacing:-0.2px;">
                      Entrar na app →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Tip -->
              <div style="background:rgba(249,115,22,0.08);border:1px solid rgba(249,115,22,0.2);border-radius:12px;padding:14px 16px;margin-top:24px;">
                <p style="margin:0;font-size:13px;color:#f97316;line-height:1.5;">
                  💡 <strong>Dica:</strong> começa por adicionar as tuas contas bancárias e os teus rendimentos mensais. O tour interativo dentro da app guia-te em tudo.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#1f2937;line-height:1.6;">
                Recebeste este email porque criaste uma conta no ${APP_NAME}.<br/>
                Os teus dados estão seguros e encriptados. 🔒
              </p>
              <p style="margin:8px 0 0;font-size:12px;">
                <a href="${APP_URL}" style="color:#374151;text-decoration:none;">${APP_URL}</a>
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
        subject: `Bem-vindo ao ${APP_NAME} 💰`,
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
