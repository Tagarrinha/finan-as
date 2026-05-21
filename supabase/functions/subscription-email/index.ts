// ============================================================
// supabase/functions/subscription-email/index.ts
// Cria a pasta: ~/Desktop/finan-as/supabase/functions/subscription-email/index.ts
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

const PLAN_FEATURES: Record<string, { name: string; color: string; features: string[] }> = {
  individual: {
    name: "Individual",
    color: "#5DA9FF",
    features: [
      "✅ Despesas e rendimentos ilimitados",
      "✅ Metas financeiras avançadas",
      "✅ Despesas recorrentes",
      "✅ Histórico completo",
      "✅ Estatísticas avançadas",
      "✅ Export PDF + Excel",
    ],
  },
  premium: {
    name: "Premium",
    color: "#8B6DFF",
    features: [
      "✅ Tudo do plano Individual",
      "✅ Modo casal completo",
      "✅ Acertos automáticos entre parceiros",
      "✅ Conta conjunta partilhada",
      "✅ Sincronização a dois em tempo real",
      "✅ Suporte prioritário",
    ],
  },
};

serve(async (req) => {
  try {
    const body = await req.json();
    const { user_id, plan } = body;

    if (!user_id || !plan) {
      return new Response(JSON.stringify({ error: "Missing user_id or plan" }), { status: 400 });
    }

    // Busca dados do utilizador
    const { data: userData } = await supabase.auth.admin.getUserById(user_id);
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    const userEmail = userData.user.email!;
    const userName = userData.user.user_metadata?.name || userEmail.split("@")[0];
    const planInfo = PLAN_FEATURES[plan];

    if (!planInfo) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), { status: 400 });
    }

    const html = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Subscrição ${planInfo.name} ativada</title>
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

            <!-- Badge -->
            <div style="text-align:center;margin-bottom:24px;">
              <div style="display:inline-block;background:rgba(87,227,160,0.12);border:1px solid rgba(87,227,160,0.3);border-radius:99px;padding:8px 20px;font-size:13px;font-weight:700;color:#57E3A0;">
                ✅ Plano ${planInfo.name} ativado
              </div>
            </div>

            <!-- Greeting -->
            <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#f1f5f9;letter-spacing:-0.5px;text-align:center;">
              Obrigado, ${userName}!
            </h1>
            <p style="margin:0 0 28px;font-size:15px;color:#667085;line-height:1.7;text-align:center;">
              A tua subscrição <strong style="color:${planInfo.color};">${planInfo.name}</strong> está ativa. Tens agora acesso completo a todas as funcionalidades.
            </p>

            <!-- Divider -->
            <div style="height:1px;background:rgba(255,255,255,0.07);margin-bottom:28px;"></div>

            <!-- Features -->
            <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:#667085;text-transform:uppercase;letter-spacing:0.12em;">O que tens acesso</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              ${planInfo.features.map(f => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;color:#cbd5e1;">
                  ${f}
                </td>
              </tr>`).join("")}
            </table>

            ${plan === "premium" ? `
            <!-- Modo casal destaque -->
            <div style="background:linear-gradient(135deg,rgba(139,109,255,0.12),rgba(93,169,255,0.06));border:1px solid rgba(93,169,255,0.25);border-radius:14px;padding:18px 20px;margin-bottom:28px;">
              <div style="font-size:14px;font-weight:800;color:#f1f5f9;margin-bottom:6px;">💑 Modo casal ativado</div>
              <div style="font-size:13px;color:#667085;line-height:1.6;">
                Convida o teu parceiro/a dentro da app em <strong style="color:#5DA9FF;">⚙️ → Modo Casal</strong>. O teu parceiro terá acesso completo à app enquanto estiverem ligados.
              </div>
            </div>` : ""}

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${APP_URL}" style="display:inline-block;padding:15px 40px;background:linear-gradient(135deg,#5DA9FF,#8B6DFF);border-radius:12px;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;">
                    Explorar a app →
                  </a>
                </td>
              </tr>
            </table>

            <!-- Tip -->
            <div style="background:rgba(93,169,255,0.08);border:1px solid rgba(93,169,255,0.2);border-radius:12px;padding:14px 16px;margin-top:24px;">
              <p style="margin:0;font-size:13px;color:#5DA9FF;line-height:1.6;">
                💡 <strong>Próximo passo:</strong> adiciona as tuas contas bancárias para começar a ver o teu Net Worth em tempo real.
              </p>
            </div>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td align="center" style="padding-top:24px;">
            <p style="margin:0;font-size:12px;color:#334155;line-height:1.6;">
              Podes cancelar a tua subscrição a qualquer momento.<br/>
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
        subject: `Plano ${planInfo.name} ativado com sucesso! 🎉`,
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
