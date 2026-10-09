-- =====================================================================
-- Minhas Finanças – 002: categorias padrão
-- Rodar UMA vez no SQL Editor, depois do supabase-financas.sql.
--
-- Categorias padrão (as 19 iniciais) só podem ser ativadas/desativadas.
-- Nunca excluídas. As criadas pelo usuário continuam podendo ser excluídas.
-- =====================================================================


-- 1. Nova coluna: marca se a categoria é padrão (novas nascem como "false")
alter table public.fin_categorias
  add column padrao boolean not null default false;


-- 2. Marca as 19 categorias iniciais como padrão
--    (pelo nome + tipo, para não pegar categorias de teste criadas depois)
update public.fin_categorias c
set padrao = true
from (values
  ('saida', 'Alimentação'),   ('saida', 'Mercado'),     ('saida', 'Moradia'),
  ('saida', 'Contas da casa'),('saida', 'Transporte'),  ('saida', 'Saúde'),
  ('saida', 'Educação'),      ('saida', 'Lazer'),       ('saida', 'Vestuário'),
  ('saida', 'Assinaturas'),   ('saida', 'Investimentos'),('saida', 'Doações'),
  ('saida', 'Outros'),
  ('entrada', 'Salário'),     ('entrada', 'Renda extra'), ('entrada', 'Rendimentos'),
  ('entrada', 'Reembolso'),   ('entrada', 'Restituição Imposto de Renda'),
  ('entrada', 'Outros')
) as p (tipo, nome)
where c.tipo = p.tipo
  and c.nome = p.nome;


-- 3. Trava no próprio banco: categoria padrão não pode ser excluída.
--    Policy "restrictive" = regra EXTRA que precisa ser cumprida além das
--    outras. Mesmo que o app tente apagar, o banco recusa.
create policy "fin_categorias: padrão não exclui"
  on public.fin_categorias
  as restrictive
  for delete
  to authenticated
  using (not padrao);


-- Conferência: deve mostrar 19 linhas com padrao = true
select tipo, emoji, nome, padrao, ativa
from public.fin_categorias
order by padrao desc, tipo desc, nome;
