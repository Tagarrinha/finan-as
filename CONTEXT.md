# MyOwnFintrack — Context

## Stack
- React/TSX, single-file components
- Supabase (auth + DB)
- Netlify (deploy automático via GitHub push)
- Sora font, dark theme

## URLs
- Site: myownfintrack.netlify.app
- GitHub: github.com/Tagarrinha/finan-as
- Supabase: aiifzqmwnnfnrwmacyxq.supabase.co

## Credenciais
- SUPA_KEY: sb_publishable_GaZqBKcZGXJagV9mLnM1Zw_3Dq3wm6g
- Resend: re_CDJr9QBs_CMnD4n7aNtXJLVdyypxKJSSD

## Ficheiros src/
- App.tsx (871L) — app principal
- CoupleMode.tsx (549L) — modo casal
- CoupleRecurring.tsx (259L) — recorrentes casal
- RecurringExpenses.tsx (254L) — recorrentes pessoal
- SavingsGoals.tsx (240L) — objetivos poupança
- MonthComparison.tsx — comparação mensal
- WorldEditor.tsx — editor mundos
- ExportData.tsx — export PDF/Excel

## Edge Functions (Supabase)
- couple-expense-sync — sync despesa casal → pessoal
- welcome-email — email boas-vindas

## Tabelas Supabase
expenses, incomes, accounts, transfers, recurring_expenses,
savings_goals, monthly_revenue, user_settings, profiles,
couples, couple_expenses, couple_account, couple_settlements,
couple_recurring_expenses

## Design
- Background: #05101e
- Accent: #f97316 (laranja)
- Temas: Original/Aurora/Ocean/Nebula
- Limite por ficheiro: ~2200 linhas

## Features implementadas
- 2 mundos (Pessoal + Clínica)
- Despesas/rendimentos + edição ✏️
- Recorrentes pessoais + edição
- Objetivos poupança + edição
- Contas bancárias + transferências
- Net Worth
- Comparação mensal
- Modo casal (convite, liquidado/por liquidar, sync pessoal)
- Recorrentes casal
- Export PDF + Excel
- PWA
- Tour onboarding
- 4 temas

## Roadmap pendente
- [ ] Edição rendimentos (✏️ no tab Rendimentos)
- [ ] PT/EN toggle (i18n.ts já criado)
- [ ] Stripe pagamentos
- [ ] Email relatório mensal
- [ ] Domínio próprio (porkbun.com)

## Deploy
cd ~/Desktop/finan-as
git add . && git commit -m "msg" && git push
