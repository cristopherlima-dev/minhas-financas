// =====================================================================
// Minhas Finanças – lógica do app
// Blocos: 1 Conexão · 2 Estado · 3 Utilitários · 4 Login · 5 Navegação
//         6 Mês · 7 Formulário de lançamento · 8 Categorias · 9 Início
// =====================================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';


// ---------------------------------------------------------------------
// 1. CONEXÃO COM O SUPABASE
// ---------------------------------------------------------------------
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// Atalho: $('saldo') em vez de document.getElementById('saldo')
const $ = (id) => document.getElementById(id);


// ---------------------------------------------------------------------
// 2. ESTADO – o que o app "sabe" neste momento
// ---------------------------------------------------------------------
const hoje = new Date();

const estado = {
  ano: hoje.getFullYear(),
  mes: hoje.getMonth(),        // 0 = janeiro ... 11 = dezembro
  categorias: [],              // todas, ativas e inativas
  lancamentos: [],             // só os do mês exibido
  catSelecionada: null,        // categoria escolhida no formulário
};


// ---------------------------------------------------------------------
// 3. UTILITÁRIOS
// ---------------------------------------------------------------------
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
               'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

const formatoReal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const moeda = (n) => formatoReal.format(n);

// Escapa o texto digitado antes de colocá-lo no HTML
// (evita que um "<" na descrição quebre a tela ou vire código)
function esc(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Data de hoje no formato do banco (AAAA-MM-DD), no fuso do aparelho.
// Não usar toISOString(): ela converte para UTC e, à noite, já seria "amanhã".
function hojeISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// "1.234,56" / "R$ 50" / "12.5" -> número. Retorna NaN se não for válido.
function lerValor(texto) {
  let t = String(texto).replace(/R\$|\s/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

// 1234.5 -> "R$ 1.234,50" (para preencher o campo ao editar)
const valorParaCampo = (n) => moeda(Number(n));

// Janela de confirmação própria. Uso: if (await confirmar('Excluir?')) { ... }
// Devolve uma Promise: true = confirmou, false = cancelou.
function confirmar(mensagem, { ok = 'Confirmar', perigo = false } = {}) {
  return new Promise((resolve) => {
    const modal = $('modal');
    const botaoOk = $('modal-ok');

    $('modal-msg').textContent = mensagem;
    botaoOk.textContent = ok;
    botaoOk.className = 'btn ' + (perigo ? 'btn-perigo-cheio' : 'btn-primario');
    modal.hidden = false;

    function fechar(resposta) {
      modal.hidden = true;
      botaoOk.onclick = null;
      $('modal-cancelar').onclick = null;
      modal.onclick = null;
      resolve(resposta);
    }

    botaoOk.onclick = () => fechar(true);
    $('modal-cancelar').onclick = () => fechar(false);
    // Tocar no fundo escuro também cancela
    modal.onclick = (e) => { if (e.target === modal) fechar(false); };
  });
}

// Mensagem rápida no rodapé
let timerAviso;
function aviso(msg) {
  const el = $('aviso');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => { el.hidden = true; }, 2500);
}

// Mostra um erro do Supabase de forma amigável
function falha(contexto, error) {
  console.error(contexto, error);
  aviso(`Erro ao ${contexto}. Tente de novo.`);
}

const categoriaPorId = (id) => estado.categorias.find((c) => c.id === id);

// Marca qual opção de um grupo de "radio" está escolhida
function marcarRadio(nome, valor) {
  document.querySelectorAll(`input[name="${nome}"]`)
    .forEach((r) => { r.checked = (r.value === valor); });
}
const radioEscolhido = (nome) =>
  document.querySelector(`input[name="${nome}"]:checked`)?.value;


// ---------------------------------------------------------------------
// 4. LOGIN
// ---------------------------------------------------------------------
function mostrarLogin() {
  $('app').hidden = true;
  $('tela-login').hidden = false;
  $('login-senha').value = '';
}

async function entrar() {
  $('tela-login').hidden = true;
  $('app').hidden = false;
  await carregarCategorias();
  irPara('mes');
  await carregarMes();
}

$('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const botao = e.submitter;
  botao.disabled = true;
  $('login-erro').hidden = true;

  const { error } = await sb.auth.signInWithPassword({
    email: $('login-email').value.trim(),
    password: $('login-senha').value,
  });

  botao.disabled = false;
  if (error) {
    $('login-erro').textContent = 'E-mail ou senha incorretos.';
    $('login-erro').hidden = false;
    return;
  }
  entrar();
});

$('btn-sair').addEventListener('click', async () => {
  await sb.auth.signOut();
  mostrarLogin();
});


// ---------------------------------------------------------------------
// 5. NAVEGAÇÃO ENTRE TELAS
// ---------------------------------------------------------------------
const TITULOS = { mes: 'Minhas Finanças', categorias: 'Categorias' };

function irPara(tela, titulo) {
  document.querySelectorAll('.tela').forEach((s) => { s.hidden = true; });
  $(`tela-${tela}`).hidden = false;

  document.querySelectorAll('.menu button').forEach((b) => {
    b.classList.toggle('ativo', b.dataset.tela === tela);
  });

  $('topo-titulo').textContent = titulo || TITULOS[tela];
  window.scrollTo(0, 0);
}

document.querySelector('.menu').addEventListener('click', (e) => {
  const botao = e.target.closest('button');
  if (!botao) return;

  const tela = botao.dataset.tela;
  if (tela === 'form') abrirFormulario(null);          // "Novo"
  else if (tela === 'categorias') { limparFormCat(); renderCategorias(); irPara('categorias'); }
  else { irPara('mes'); carregarMes(); }
});


// ---------------------------------------------------------------------
// 6. TELA MÊS
// ---------------------------------------------------------------------
async function carregarMes() {
  const { ano, mes } = estado;
  const inicio = `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
  const prox = new Date(ano, mes + 1, 1);
  const fim = `${prox.getFullYear()}-${String(prox.getMonth() + 1).padStart(2, '0')}-01`;

  $('mes-titulo').textContent = `${MESES[mes]} ${ano}`;

  const { data, error } = await sb
    .from('fin_lancamentos')
    .select('*')
    .gte('data', inicio)
    .lt('data', fim)
    .order('data', { ascending: false })
    .order('id', { ascending: false });

  if (error) return falha('carregar o mês', error);
  estado.lancamentos = data;
  renderMes();
}

function renderMes() {
  // --- Totais ---
  let recebido = 0, aReceber = 0, pago = 0, aPagar = 0;

  for (const l of estado.lancamentos) {
    const v = Number(l.valor);
    if (l.tipo === 'entrada') l.efetivado ? (recebido += v) : (aReceber += v);
    else                      l.efetivado ? (pago += v)     : (aPagar += v);
  }

  const saldo = recebido - pago;
  const previsto = saldo + aReceber - aPagar;

  $('saldo').textContent = moeda(saldo);
  $('saldo').className = 'saldo-valor ' + (saldo < 0 ? 'neg' : 'pos');
  $('tot-recebido').textContent = moeda(recebido);
  $('tot-a-receber').textContent = moeda(aReceber);
  $('tot-pago').textContent = moeda(pago);
  $('tot-a-pagar').textContent = moeda(aPagar);
  $('previsto').textContent = moeda(previsto);

  // --- Lista agrupada por dia ---
  $('lista-vazia').hidden = estado.lancamentos.length > 0;

  let html = '';
  let diaAtual = '';

  for (const l of estado.lancamentos) {
    if (l.data !== diaAtual) {
      diaAtual = l.data;
      const [a, m, d] = l.data.split('-').map(Number);
      const semana = DIAS_SEMANA[new Date(a, m - 1, d).getDay()];
      html += `<div class="dia">${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')} · ${semana}</div>`;
    }

    const cat = categoriaPorId(l.categoria_id);
    const entrada = l.tipo === 'entrada';
    const etiqueta = l.efetivado ? '' : `<span class="tag">${entrada ? 'a receber' : 'a pagar'}</span>`;

    html += `
      <div class="item ${l.efetivado ? '' : 'pendente'}" data-id="${l.id}">
        <button type="button" class="item-check ${l.efetivado ? 'ok' : ''}" data-acao="check"
                aria-label="${l.efetivado ? 'Desmarcar' : 'Marcar como ' + (entrada ? 'recebido' : 'pago')}">
          ${l.efetivado ? '✓' : ''}
        </button>
        <div class="item-ic">${esc(cat?.emoji || '📦')}</div>
        <div class="item-tx">
          <b>${esc(l.descricao)}</b>
          <small>${esc(cat?.nome || 'Sem categoria')}${etiqueta}</small>
        </div>
        <div class="item-val ${entrada ? 'pos' : 'neg'}">${entrada ? '+' : '−'} ${moeda(Number(l.valor))}</div>
      </div>`;
  }

  $('lista-lancamentos').innerHTML = html;
}

// Um único "ouvinte" para a lista inteira (delegação de eventos):
// bolinha = marca/desmarca; resto do item = abre a edição.
$('lista-lancamentos').addEventListener('click', async (e) => {
  const item = e.target.closest('.item');
  if (!item) return;
  const lanc = estado.lancamentos.find((l) => l.id === Number(item.dataset.id));
  if (!lanc) return;

  if (e.target.closest('[data-acao="check"]')) {
    const novo = !lanc.efetivado;
    const { error } = await sb.from('fin_lancamentos').update({ efetivado: novo }).eq('id', lanc.id);
    if (error) return falha('atualizar', error);
    lanc.efetivado = novo;
    renderMes();
    aviso(novo ? (lanc.tipo === 'entrada' ? 'Recebido ✓' : 'Pago ✓') : 'Marcado como pendente');
  } else {
    abrirFormulario(lanc);
  }
});

function trocarMes(delta) {
  const d = new Date(estado.ano, estado.mes + delta, 1);
  estado.ano = d.getFullYear();
  estado.mes = d.getMonth();
  carregarMes();
}
$('mes-ant').addEventListener('click', () => trocarMes(-1));
$('mes-prox').addEventListener('click', () => trocarMes(+1));


// ---------------------------------------------------------------------
// 7. FORMULÁRIO DE LANÇAMENTO (novo e editar)
// ---------------------------------------------------------------------
function abrirFormulario(lanc) {
  $('lanc-erro').hidden = true;

  if (lanc) {
    $('lanc-id').value = lanc.id;
    marcarRadio('lanc-tipo', lanc.tipo);
    $('lanc-valor').value = valorParaCampo(lanc.valor);
    $('lanc-data').value = lanc.data;
    $('lanc-descricao').value = lanc.descricao;
    $('lanc-efetivado').checked = lanc.efetivado;
    estado.catSelecionada = lanc.categoria_id;
    $('btn-excluir').hidden = false;
  } else {
    $('lanc-id').value = '';
    marcarRadio('lanc-tipo', 'saida');
    $('lanc-valor').value = '';
    $('lanc-data').value = hojeISO();
    $('lanc-descricao').value = '';
    $('lanc-efetivado').checked = false;     // decisão: vem desmarcada
    estado.catSelecionada = null;
    $('btn-excluir').hidden = true;
  }

  atualizarTipoForm();
  irPara('form', lanc ? 'Editar lançamento' : 'Novo lançamento');
}

// Ao trocar Entrada/Saída: muda as categorias e o texto da caixa
function atualizarTipoForm() {
  const tipo = radioEscolhido('lanc-tipo');
  $('lanc-efetivado-txt').textContent = tipo === 'entrada' ? 'Já recebida' : 'Já paga';

  // Se a categoria escolhida é do outro tipo, desmarca
  const sel = categoriaPorId(estado.catSelecionada);
  if (sel && sel.tipo !== tipo) estado.catSelecionada = null;

  // Mostra as ativas do tipo + a já escolhida (mesmo que inativa)
  const lista = estado.categorias.filter(
    (c) => c.tipo === tipo && (c.ativa || c.id === estado.catSelecionada)
  );

  $('lanc-categorias').innerHTML = lista.map((c) => `
    <button type="button" class="chip ${c.id === estado.catSelecionada ? 'sel' : ''}" data-id="${c.id}">
      ${esc(c.emoji)} ${esc(c.nome)}
    </button>`).join('');
}

document.querySelectorAll('input[name="lanc-tipo"]')
  .forEach((r) => r.addEventListener('change', atualizarTipoForm));

// Tocar numa categoria escolhe; tocar de novo na mesma desmarca
$('lanc-categorias').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  const id = Number(chip.dataset.id);
  estado.catSelecionada = (estado.catSelecionada === id) ? null : id;
  atualizarTipoForm();
});

// Máscara do valor: o usuário digita só números e o app trata como centavos.
// Ex.: 5 → R$ 0,05 · 50 → R$ 0,50 · 5000 → R$ 50,00 · 500000 → R$ 5.000,00
$('lanc-valor').addEventListener('input', (e) => {
  const digitos = e.target.value
    .replace(/\D/g, '')     // tira tudo que não é número
    .replace(/^0+/, '')     // tira zeros à esquerda
    .slice(0, 12);          // limite do banco: numeric(12,2)
  e.target.value = digitos ? moeda(Number(digitos) / 100) : '';
});

function erroLanc(msg) {
  $('lanc-erro').textContent = msg;
  $('lanc-erro').hidden = false;
}

$('form-lanc').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('lanc-erro').hidden = true;

  const valor = lerValor($('lanc-valor').value);
  const descricao = $('lanc-descricao').value.trim();
  const data = $('lanc-data').value;

  if (!(valor > 0))  return erroLanc('Informe um valor maior que zero.');
  if (!data)         return erroLanc('Informe a data.');
  if (!descricao)    return erroLanc('Informe a descrição.');

  const registro = {
    tipo: radioEscolhido('lanc-tipo'),
    valor,
    data,
    descricao,
    categoria_id: estado.catSelecionada,
    efetivado: $('lanc-efetivado').checked,
  };

  const botao = e.submitter;
  botao.disabled = true;

  const id = $('lanc-id').value;
  const { error } = id
    ? await sb.from('fin_lancamentos').update(registro).eq('id', id)
    : await sb.from('fin_lancamentos').insert(registro);

  botao.disabled = false;
  if (error) return falha('salvar', error);

  // Vai para o mês do lançamento salvo (útil quando a data é de outro mês)
  const [a, m] = data.split('-').map(Number);
  estado.ano = a;
  estado.mes = m - 1;

  aviso('Salvo!');
  irPara('mes');
  carregarMes();
});

$('btn-excluir').addEventListener('click', async () => {
  if (!await confirmar('Excluir este lançamento?', { ok: 'Excluir', perigo: true })) return;

  const { error } = await sb.from('fin_lancamentos').delete().eq('id', $('lanc-id').value);
  if (error) return falha('excluir', error);

  aviso('Excluído');
  irPara('mes');
  carregarMes();
});

$('btn-cancelar').addEventListener('click', () => irPara('mes'));


// ---------------------------------------------------------------------
// 8. CATEGORIAS
// ---------------------------------------------------------------------
async function carregarCategorias() {
  const { data, error } = await sb.from('fin_categorias').select('*');
  if (error) return falha('carregar as categorias', error);
  estado.categorias = data;
}

// Ordem: ativas antes das inativas; alfabética; "Outros" sempre no fim
function ordenar(a, b) {
  if (a.ativa !== b.ativa) return a.ativa ? -1 : 1;
  if (a.nome === 'Outros') return 1;
  if (b.nome === 'Outros') return -1;
  return a.nome.localeCompare(b.nome, 'pt-BR');
}

function renderCategorias() {
  for (const tipo of ['saida', 'entrada']) {
    const lista = estado.categorias.filter((c) => c.tipo === tipo).sort(ordenar);
    $(`lista-cat-${tipo}`).innerHTML = lista.map((c) => `
      <div class="cat-linha ${c.ativa ? '' : 'inativa'}" data-id="${c.id}">
        <span>${esc(c.emoji)}</span>
        <span class="cat-nome">${esc(c.nome)}</span>
        <span class="cat-editar">✎</span>
      </div>`).join('');
  }
}

function limparFormCat() {
  $('cat-form-titulo').textContent = 'Nova categoria';
  $('cat-id').value = '';
  $('cat-emoji').value = '';
  $('cat-nome').value = '';
  $('cat-emoji').disabled = false;
  $('cat-nome').disabled = false;
  $('cat-erro').hidden = true;
  marcarRadio('cat-tipo', 'saida');
  document.querySelectorAll('input[name="cat-tipo"]').forEach((r) => { r.disabled = false; });
  $('btn-cat-salvar').hidden = false;
  $('btn-cat-excluir').hidden = true;
  $('btn-cat-cancelar').hidden = true;
}

// Regras:
// - Categoria PADRÃO (as 19 iniciais): só ativa/desativa. Nome e emoji travados.
// - Categoria CRIADA pelo usuário: edita nome/emoji; "Excluir" apaga ou,
//   se já tiver lançamentos, desativa. Se estiver inativa, vira "Reativar".
function editarCategoria(cat) {
  const padrao = cat.padrao;

  $('cat-form-titulo').textContent = padrao ? 'Categoria padrão' : 'Editar categoria';
  $('cat-id').value = cat.id;
  $('cat-emoji').value = cat.emoji;
  $('cat-nome').value = cat.nome;
  $('cat-emoji').disabled = padrao;
  $('cat-nome').disabled = padrao;
  $('cat-erro').hidden = true;
  marcarRadio('cat-tipo', cat.tipo);
  // O tipo não muda na edição: lançamentos antigos ficariam com a categoria "errada"
  document.querySelectorAll('input[name="cat-tipo"]').forEach((r) => { r.disabled = true; });

  $('btn-cat-salvar').hidden = padrao;
  $('btn-cat-excluir').textContent = padrao
    ? (cat.ativa ? 'Desativar' : 'Ativar')
    : (cat.ativa ? 'Excluir' : 'Reativar');
  $('btn-cat-excluir').hidden = false;
  $('btn-cat-cancelar').hidden = false;
  window.scrollTo(0, 0);
}

$('lista-cat-saida').addEventListener('click', clicarCategoria);
$('lista-cat-entrada').addEventListener('click', clicarCategoria);

function clicarCategoria(e) {
  const linha = e.target.closest('.cat-linha');
  if (!linha) return;
  editarCategoria(categoriaPorId(Number(linha.dataset.id)));
}

function erroCat(msg) {
  $('cat-erro').textContent = msg;
  $('cat-erro').hidden = false;
}

async function recarregarCategorias(msg) {
  await carregarCategorias();
  renderCategorias();
  limparFormCat();
  if (msg) aviso(msg);
}

$('form-cat').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('cat-erro').hidden = true;

  const nome = $('cat-nome').value.trim();
  const emoji = $('cat-emoji').value.trim() || '📦';
  if (!nome) return erroCat('Informe o nome.');

  const id = $('cat-id').value;
  const { error } = id
    ? await sb.from('fin_categorias').update({ nome, emoji }).eq('id', id)
    : await sb.from('fin_categorias').insert({ tipo: radioEscolhido('cat-tipo'), nome, emoji });

  if (error) {
    // 23505 = violou o "unique" do banco (nome repetido no mesmo tipo)
    if (error.code === '23505') return erroCat('Já existe uma categoria com esse nome.');
    return falha('salvar a categoria', error);
  }
  recarregarCategorias('Salvo!');
});

// Botão de ação da categoria: Ativar/Desativar (padrão) · Reativar · Excluir
$('btn-cat-excluir').addEventListener('click', async () => {
  const cat = categoriaPorId(Number($('cat-id').value));
  if (!cat) return;

  // Padrão (qualquer estado) ou criada que está inativa: só liga/desliga
  if (cat.padrao || !cat.ativa) {
    const novo = !cat.ativa;
    const { error } = await sb.from('fin_categorias').update({ ativa: novo }).eq('id', cat.id);
    if (error) return falha(novo ? 'ativar' : 'desativar', error);
    return recarregarCategorias(novo ? 'Categoria ativada' : 'Categoria desativada');
  }

  const ok = await confirmar(`Excluir a categoria "${cat.nome}"?`, { ok: 'Excluir', perigo: true });
  if (!ok) return;

  const { error } = await sb.from('fin_categorias').delete().eq('id', cat.id);

  // 23503 = o banco barrou porque há lançamentos usando a categoria
  // (regra "on delete restrict"). Nesse caso, desativa em vez de apagar.
  if (error?.code === '23503') {
    const { error: e2 } = await sb.from('fin_categorias').update({ ativa: false }).eq('id', cat.id);
    if (e2) return falha('desativar', e2);
    return recarregarCategorias('Categoria em uso: foi desativada');
  }
  if (error) return falha('excluir', error);
  recarregarCategorias('Categoria excluída');
});

$('btn-cat-cancelar').addEventListener('click', limparFormCat);


// ---------------------------------------------------------------------
// 9. INÍCIO
// ---------------------------------------------------------------------
async function iniciar() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) entrar();
  else mostrarLogin();
}

iniciar();

// Service worker (arquivo sw.js vem numa próxima etapa; até lá, só ignora o erro)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
