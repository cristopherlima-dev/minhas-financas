# Roadmap – Minhas Finanças

PWA pessoal para registrar entradas e saídas e acompanhar o saldo do mês, no celular e no PC.

Legenda: ✅ concluído · 🔄 em andamento · ⬜ a fazer

---

## Fase 1 – Planejamento ✅

- ✅ Definição de escopo e princípios (simplicidade, PWA, mesma stack do Meus Remédios)
- ✅ Mockup das 4 telas: Login · Mês · Novo/Editar · Categorias
- ✅ Controle de **pago/recebido** por lançamento (caixa vem desmarcada por padrão)
- ✅ Saldo do mês considera só o que foi efetivado; mostra "a pagar", "a receber" e "previsto"
- ✅ Lista de categorias iniciais (13 de saída, 6 de entrada)

## Fase 2 – Ambiente ✅

- ✅ Pasta do projeto e `.gitignore`
- ✅ Repositório no GitHub
- ✅ Projeto Supabase renomeado para `meus-apps` (banco compartilhado entre os apps pessoais; prefixo `fin_` nas tabelas)

## Fase 3 – Banco de dados ✅

- ✅ `sql/supabase-financas.sql`: tabelas `fin_categorias` e `fin_lancamentos`
- ✅ Segurança (RLS): cada usuário só acessa os próprios dados
- ✅ Categorias iniciais inseridas

## Fase 4 – Aplicativo 🔄

- ✅ `config.js` – URL e publishable key do Supabase
- ✅ `index.html` – estrutura das telas
- ✅ `style.css` – visual
- ✅ `app.js` – lógica (login, mês, lançamentos, categorias)
- ⬜ `manifest.json` – instalação como app
- ⬜ `sw.js` – service worker (rede primeiro, cache versionado)
- ⬜ Ícones (`icons/`)
- ⬜ Testes locais (PC e celular)

## Fase 5 – Publicação ⬜

- ⬜ Ativar GitHub Pages
- ⬜ Instalar no celular (Android) e no PC
- ⬜ Teste de sincronização entre os aparelhos

## Fase 6 – Fechamento ⬜

- ⬜ README completo

---

## Ideias para depois (backlog)

- Resumo de gastos por categoria no mês
- Lançamentos recorrentes (ex.: aluguel todo mês)
- Compras parceladas
- Saldo acumulado entre meses
