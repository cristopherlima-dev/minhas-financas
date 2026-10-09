-- =====================================================================
-- Minhas Finanças – estrutura do banco (Supabase, projeto meus-apps)
-- Rodar UMA vez no SQL Editor do Supabase.
-- Prefixo fin_ = tabelas deste app.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. CATEGORIAS
-- ---------------------------------------------------------------------
create table public.fin_categorias (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid()
             references auth.users (id) on delete cascade,
  tipo       text not null check (tipo in ('entrada', 'saida')),
  nome       text not null check (length(nome) between 1 and 40),
  emoji      text not null default '📦',
  ativa      boolean not null default true,
  criado_em  timestamptz not null default now(),
  unique (user_id, tipo, nome)          -- não deixa repetir o nome no mesmo tipo
);


-- ---------------------------------------------------------------------
-- 2. LANÇAMENTOS
-- ---------------------------------------------------------------------
create table public.fin_lancamentos (
  id            bigint generated always as identity primary key,
  user_id       uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  tipo          text not null check (tipo in ('entrada', 'saida')),
  valor         numeric(12,2) not null check (valor > 0),
  data          date not null default current_date,
  descricao     text not null check (length(descricao) between 1 and 80),
  categoria_id  bigint references public.fin_categorias (id) on delete restrict,
  efetivado     boolean not null default false,   -- pago / recebido
  criado_em     timestamptz not null default now()
);

-- Deixa rápida a busca "lançamentos do usuário no mês"
create index fin_lancamentos_user_data_idx
  on public.fin_lancamentos (user_id, data);


-- ---------------------------------------------------------------------
-- 3. SEGURANÇA (RLS) – cada usuário só vê e mexe nos próprios dados
-- ---------------------------------------------------------------------
alter table public.fin_categorias  enable row level security;
alter table public.fin_lancamentos enable row level security;

create policy "fin_categorias: só o dono"
  on public.fin_categorias for all
  to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "fin_lancamentos: só o dono"
  on public.fin_lancamentos for all
  to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));


-- ---------------------------------------------------------------------
-- 4. CATEGORIAS INICIAIS
--    >>> TROQUE o e-mail abaixo pelo e-mail que você usa no login <<<
-- ---------------------------------------------------------------------
insert into public.fin_categorias (user_id, tipo, emoji, nome)
select u.id, c.tipo, c.emoji, c.nome
from auth.users u
cross join (values
  ('saida',   '🍔', 'Alimentação'),
  ('saida',   '🛒', 'Mercado'),
  ('saida',   '🏠', 'Moradia'),
  ('saida',   '💡', 'Contas da casa'),
  ('saida',   '⛽', 'Transporte'),
  ('saida',   '💊', 'Saúde'),
  ('saida',   '📚', 'Educação'),
  ('saida',   '🎉', 'Lazer'),
  ('saida',   '👕', 'Vestuário'),
  ('saida',   '📺', 'Assinaturas'),
  ('saida',   '🏦', 'Investimentos'),
  ('saida',   '🤝', 'Doações'),
  ('saida',   '📦', 'Outros'),
  ('entrada', '💼', 'Salário'),
  ('entrada', '💻', 'Renda extra'),
  ('entrada', '📈', 'Rendimentos'),
  ('entrada', '↩️', 'Reembolso'),
  ('entrada', '🧾', 'Restituição Imposto de Renda'),
  ('entrada', '📦', 'Outros')
) as c (tipo, emoji, nome)
where u.email = 'SEU_EMAIL_AQUI';


-- Conferência: deve mostrar 19 linhas (13 saídas + 6 entradas)
select tipo, emoji, nome from public.fin_categorias order by tipo desc, id;
