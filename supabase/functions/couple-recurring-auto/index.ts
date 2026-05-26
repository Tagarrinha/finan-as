// ============================================================
// supabase/functions/couple-recurring-auto/index.ts
// Cron job: todos os dias às 8h
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function nextDate(freq: string, from: string): string {
  const d = new Date(from + "T12:00:00");
  if (freq === "mensal")  d.setMonth(d.getMonth() + 1);
  if (freq === "semanal") d.setDate(d.getDate() + 7);
  if (freq === "anual")   d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

serve(async (req) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Busca todas as recorrentes conjuntas vencidas e ativas
    const { data: dueItems, error } = await supabase
      .from("couple_recurring_expenses")
      .select("*, couples(user1_id, user2_id)")
      .eq("ativa", true)
      .lte("proxima_data", today);

    if (error) {
      console.error("Error fetching due items:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!dueItems?.length) {
      return new Response(JSON.stringify({ message: "No due items", processed: 0 }), { status: 200 });
    }

    let processed = 0;
    let errors = 0;

    for (const r of dueItems) {
      try {
        const couple = r.couples;
        if (!couple) continue;

        const total = Number(r.valor);
        const s1 = Number(r.split_user1) || total / 2;
        const s2 = Number(r.split_user2) || total / 2;

        // Verifica se já foi processada hoje (evita duplicados)
        const { data: existing } = await supabase
          .from("couple_expenses")
          .select("id")
          .eq("couple_id", r.couple_id)
          .eq("descricao", r.descricao)
          .eq("data", today)
          .eq("valor", total);

        if (existing && existing.length > 0) {
          // Já processada hoje, só avança a data
          const next = nextDate(r.frequencia, r.proxima_data);
          await supabase
            .from("couple_recurring_expenses")
            .update({ proxima_data: next })
            .eq("id", r.id);
          continue;
        }

        // Cria a despesa conjunta
        const { data: expense, error: expError } = await supabase
          .from("couple_expenses")
          .insert({
            couple_id: r.couple_id,
            created_by: couple.user1_id,
            descricao: r.descricao,
            valor: total,
            cat: r.cat,
            subcat: "",
            tipo: r.tipo,
            data: today,
            split_user1: s1,
            split_user2: s2,
            pago_por: couple.user1_id,
            liquidado: r.liquidado_auto,
          })
          .select()
          .single();

        if (expError) {
          console.error(`Error creating expense for recurring ${r.id}:`, expError);
          errors++;
          continue;
        }

        // Se liquidado_auto, sincroniza para contas pessoais
        if (r.liquidado_auto && expense && couple.user1_id && couple.user2_id) {
          const { error: syncError } = await supabase.rpc("insert_couple_expense", {
            p_user1_id: couple.user1_id,
            p_user2_id: couple.user2_id,
            p_descricao: r.descricao,
            p_valor1: s1,
            p_valor2: s2,
            p_cat: r.cat,
            p_data: today,
            p_tipo: r.tipo || "necessidade",
            p_couple_expense_id: expense.id,
          });

          if (syncError) {
            console.error(`Error syncing expense ${expense.id}:`, syncError);
          }
        }

        // Cria notificação para ambos os utilizadores
        const notifMsg = `🔄 ${r.descricao} (${r.liquidado_auto ? "liquidado automaticamente" : "aguarda liquidação"}) — ${new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(total)}`;

        await supabase.from("notifications").insert([
          { user_id: couple.user1_id, couple_id: r.couple_id, tipo: "recorrente_auto", mensagem: notifMsg, lida: false },
          ...(couple.user2_id ? [{ user_id: couple.user2_id, couple_id: r.couple_id, tipo: "recorrente_auto", mensagem: notifMsg, lida: false }] : []),
        ]);

        // Avança a proxima_data
        const next = nextDate(r.frequencia, r.proxima_data);
        await supabase
          .from("couple_recurring_expenses")
          .update({ proxima_data: next })
          .eq("id", r.id);

        processed++;
        console.log(`Processed recurring ${r.id}: ${r.descricao}`);

      } catch (itemErr) {
        console.error(`Error processing item ${r.id}:`, itemErr);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, errors }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
