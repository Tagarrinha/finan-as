// ============================================================
// supabase/functions/personal-recurring-auto/index.ts
// Cron job: todos os dias às 8h15 (15 min depois do casal)
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function nextDate(freq: string, from: string, diasCustom: number | null): string {
  const d = new Date(from + "T12:00:00");
  if (freq === "mensal")  d.setMonth(d.getMonth() + 1);
  if (freq === "semanal") d.setDate(d.getDate() + 7);
  if (freq === "custom" && diasCustom) d.setDate(d.getDate() + diasCustom);
  return d.toISOString().slice(0, 10);
}

serve(async (req) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Busca todas as recorrentes pessoais vencidas e ativas
    const { data: dueItems, error } = await supabase
      .from("recurring_expenses")
      .select("*")
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
        // Verifica se já foi processada hoje (evita duplicados)
        const { data: existing } = await supabase
          .from("expenses")
          .select("id")
          .eq("user_id", r.user_id)
          .eq("descricao", r.descricao)
          .eq("data", today)
          .eq("valor", r.valor)
          .eq("world", r.world);

        if (existing && existing.length > 0) {
          // Já processada hoje, só avança a data
          const next = nextDate(r.frequencia, r.proxima_data, r.dias_custom);
          await supabase
            .from("recurring_expenses")
            .update({ proxima_data: next })
            .eq("id", r.id);
          continue;
        }

        // Cria a despesa pessoal
        const { error: expError } = await supabase
          .from("expenses")
          .insert({
            user_id: r.user_id,
            descricao: r.descricao,
            valor: r.valor,
            cat: r.cat,
            subcat: r.subcat || "",
            tipo: r.tipo,
            data: today,
            world: r.world,
          });

        if (expError) {
          console.error(`Error creating expense for recurring ${r.id}:`, expError);
          errors++;
          continue;
        }

        // Avança a proxima_data
        const next = nextDate(r.frequencia, r.proxima_data, r.dias_custom);
        await supabase
          .from("recurring_expenses")
          .update({ proxima_data: next })
          .eq("id", r.id);

        processed++;
        console.log(`Processed personal recurring ${r.id}: ${r.descricao} for user ${r.user_id}`);

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
