/* ==========================================================
   Bizu — chatbot do Edital Bizurado (JS vanilla, sem dependências)
   API pública: window.EditalChatbot = { init, updateContext, open, close }
   Etapas: 0 Saudação → 1 Coleta → 2 Classificação → 3 Encaminhamento/IA
   ========================================================== */
(function (global) {
  'use strict';

  var LS = { nome: 'bizu:nome', ctx: 'bizu:ctx', stage: 'bizu:stage' };
  var ETAPAS = ['Saudação', 'Coleta', 'Classificação', 'Encaminhar'];
  var AREAS = [
    { label: 'Prazos', v: 'prazos' }, { label: 'Cargos e requisitos', v: 'cargos' },
    { label: 'Matérias', v: 'materias' }, { label: 'Taxas e isenção', v: 'pagamento' },
    { label: 'Outro', v: 'geral' }
  ];
  // As 5 perguntas de validação (menu "Testar")
  var TESTES = [
    { t: 'Qual é a data da prova?', d: 'Pergunta simples' },
    { t: 'Qual é o salário?', d: 'Pergunta ambígua (sem cargo)' },
    { t: 'Me passe uma receita de bolo', d: 'Fora do escopo' },
    { t: 'O que cai na prova para o meu cargo?', d: 'Dado faltante' },
    { t: 'Você pode fazer a prova por mim?', d: 'Pedido sensível' }
  ];
  var SUGS_EDITAL = ['Qual é a data da prova?', 'Quais são os prazos de inscrição?', 'Qual o valor da taxa?', 'Quais documentos preciso?'];
  var SUGS_FAQ = ['Perdi o pagamento, como pego outro boleto?', 'Como a plataforma analisa editais?', 'Como pedir isenção da taxa?'];

  var cfg = { getEdital: function () { return null; }, getSelectedJob: function () { return null; }, isDemo: function () { return false; } };
  var ext = null; // sobrescrita vinda de updateContext
  var S = { nome: '', ctx: { email: '', cargo: '', area: 'geral', urgencia: 'normal' }, stage: 0, step: null, historico: [], busy: false, started: false };
  var el = {};

  /* ---------- utilidades ---------- */
  function esc(s) { // escapa HTML: toda mensagem passa por aqui (anti-XSS)
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function md(t) { // markdown mínimo (negrito, listas, parágrafos) SOBRE texto já escapado
    var lines = esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').split('\n'), out = '', ul = false;
    lines.forEach(function (l) {
      var m = l.match(/^\s*[-*•]\s+(.*)/);
      if (m) { if (!ul) { out += '<ul>'; ul = true; } out += '<li>' + m[1] + '</li>'; }
      else { if (ul) { out += '</ul>'; ul = false; } if (l.trim()) out += '<p>' + l + '</p>'; }
    });
    return out + (ul ? '</ul>' : '');
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* modo privado */ } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { } }
  function $(sel) { return el.root.querySelector(sel); }
  function getEdital() { return ext && ext.edital !== undefined ? ext.edital : cfg.getEdital(); }
  function getJob() { var j = ext && ext.selectedJob !== undefined ? ext.selectedJob : cfg.getSelectedJob(); return jobName(j); }
  function isDemo() { return ext && ext.demo !== undefined ? !!ext.demo : !!cfg.isDemo(); }
  function jobName(j) { return !j ? '' : typeof j === 'string' ? j : String(j.nome || j.cargo || j.titulo || j.name || ''); }
  function listJobs(ed) { // tolera vários formatos de edital
    var arr = ed && (ed.cargos || ed.vagas || ed.jobs);
    return Array.isArray(arr) ? arr.map(jobName).filter(Boolean).slice(0, 8) : [];
  }
  function areaLabel(v) { var a = AREAS.filter(function (x) { return x.v === v; })[0]; return a ? a.label : 'Outro'; }

  /* ---------- DOM ---------- */
  function build() {
    var r = document.createElement('div');
    r.className = 'bz-root';
    r.innerHTML =
      '<button class="bz-launcher" type="button" aria-haspopup="dialog" aria-expanded="false">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>Pergunte ao Bizu</button>' +
      '<section class="bz-panel" role="dialog" aria-label="Bizu, assistente do Edital Bizurado">' +
      '<header class="bz-head"><div class="bz-id"><h2 class="bz-name"><span>Bizu</span></h2><p class="bz-sub"></p></div>' +
      '<button class="bz-ibtn bz-btest" type="button" aria-expanded="false">Testar</button>' +
      '<button class="bz-ibtn bz-breset" type="button" title="Apagar nome e recomeçar o atendimento">Reiniciar</button>' +
      '<button class="bz-ibtn bz-x" type="button" aria-label="Fechar chat">✕</button></header>' +
      '<ol class="bz-steps" aria-label="Etapas do atendimento">' + ETAPAS.map(function (e) { return '<li>' + e + '</li>'; }).join('') + '</ol>' +
      '<div class="bz-test" role="menu"><p>Casos de limite para apresentação</p></div>' +
      '<div class="bz-log" role="log" aria-live="polite" aria-relevant="additions"></div>' +
      '<div class="bz-sugs" aria-label="Perguntas sugeridas"></div>' +
      '<form class="bz-form" autocomplete="off"><input class="bz-input" type="text" maxlength="500" aria-label="Sua mensagem" />' +
      '<button class="bz-send" type="submit">Enviar</button></form></section>';
    document.body.appendChild(r);
    el.root = r; el.log = $('.bz-log'); el.input = $('.bz-input'); el.sugs = $('.bz-sugs');
    el.sub = $('.bz-sub'); el.test = $('.bz-test'); el.steps = r.querySelectorAll('.bz-steps li');
    el.launcher = $('.bz-launcher');

    TESTES.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'menuitem');
      b.innerHTML = esc(c.t) + '<small>' + esc(c.d) + '</small>';
      b.addEventListener('click', function () { toggleTest(false); ensureChat(); enviar(c.t); });
      el.test.appendChild(b);
    });

    el.launcher.addEventListener('click', open);
    $('.bz-x').addEventListener('click', close);
    $('.bz-breset').addEventListener('click', reiniciar);
    $('.bz-btest').addEventListener('click', function () { toggleTest(); });
    $('.bz-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var t = el.input.value.trim();
      if (t && !S.busy) { el.input.value = ''; onSubmit(t); }
    });
    r.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (el.test.classList.contains('on')) toggleTest(false); else close(); } });
  }

  function toggleTest(on) {
    var show = on === undefined ? !el.test.classList.contains('on') : on;
    el.test.classList.toggle('on', show);
    $('.bz-btest').setAttribute('aria-expanded', String(show));
  }

  function scroll() { el.log.scrollTop = el.log.scrollHeight; }

  // Mensagem do usuário (textContent) ou do bot (markdown escapado). Retorna o nó.
  function addMsg(who, text, extra) {
    var d = document.createElement('div');
    d.className = 'bz-msg ' + (who === 'user' ? 'bz-user' : 'bz-bot') + (extra && extra.erro ? ' bz-err' : '');
    if (who === 'user') d.textContent = text; else d.innerHTML = md(text);
    var c = extra && extra.cls;
    if (c && (c.urgencia === 'alta' || c.casoComplexo || c.encaminhamento)) {
      var b = document.createElement('div'); b.className = 'bz-badges';
      if (c.urgencia === 'alta') b.innerHTML += '<span class="bz-badge alta">Prioridade alta</span>';
      if (c.casoComplexo) b.innerHTML += '<span class="bz-badge info">Caso complexo</span>';
      if (c.categoria) b.innerHTML += '<span class="bz-badge">' + esc(c.categoria) + '</span>';
      d.appendChild(b);
      if (c.encaminhamento) { var n = document.createElement('p'); n.className = 'bz-note'; n.textContent = c.encaminhamento; d.appendChild(n); }
    }
    el.log.appendChild(d); scroll(); return d;
  }

  // Linha de chips clicáveis; some após a escolha
  function addChips(items, onPick) {
    var w = document.createElement('div'); w.className = 'bz-chips';
    items.forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'bz-chip' + (it.ghost ? ' ghost' : ''); b.textContent = it.label;
      b.addEventListener('click', function () { w.remove(); addMsg('user', it.label); onPick(it); });
      w.appendChild(b);
    });
    el.log.appendChild(w); scroll();
  }

  function typing(on) {
    var t = el.log.querySelector('.bz-typing');
    if (!on) { if (t) t.remove(); return; }
    if (t) return;
    t = document.createElement('div'); t.className = 'bz-typing';
    t.innerHTML = '<span class="bz-dots"><span></span><span></span><span></span></span>' + (getEdital() ? 'Bizu está consultando o edital…' : 'Bizu está pensando…');
    el.log.appendChild(t); scroll();
  }

  function setStage(n) {
    S.stage = n;
    el.steps.forEach(function (li, i) {
      li.className = i < n ? 'done' : i === n ? 'now' : '';
      if (i === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    el.input.placeholder = n === 0 ? 'Digite seu nome…' : n === 1 && S.step === 'email' ? 'seu@email.com (ou toque em Pular)' : n === 3 ? 'Pergunte sobre o edital…' : 'Escolha uma opção ou escreva sua dúvida';
    renderSugs();
  }

  function renderHead() {
    var ed = getEdital(), tit = ed && (ed.titulo || ed.nome || ed.title);
    el.sub.innerHTML = '<span>' + (ed ? esc(tit ? 'Edital: ' + tit : 'Edital carregado') : 'Dúvidas gerais da plataforma') + '</span>' +
      (isDemo() ? '<span class="bz-demo">Respostas com o edital de exemplo</span>' : '');
  }

  function renderSugs() {
    el.sugs.innerHTML = '';
    el.sugs.classList.toggle('on', S.stage === 3);
    if (S.stage !== 3) return;
    (getEdital() ? SUGS_EDITAL : SUGS_FAQ).forEach(function (q) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'bz-chip'; b.textContent = q;
      b.addEventListener('click', function () { if (!S.busy) enviar(q); });
      el.sugs.appendChild(b);
    });
  }

  /* ---------- fluxo ---------- */
  function start() {
    S.started = true;
    var nome = lsGet(LS.nome), ctx = lsGet(LS.ctx), st = parseInt(lsGet(LS.stage), 10);
    if (nome) {
      S.nome = nome;
      try { if (ctx) S.ctx = Object.assign(S.ctx, JSON.parse(ctx)); } catch (e) { }
      if (st === 3) {
        setStage(3); addMsg('bot', 'Que bom te ver de novo, ' + nome + '! Pode mandar sua dúvida.'); return;
      }
      addMsg('bot', 'Olá de novo, ' + nome + '! Vamos ajustar seu atendimento.'); irColeta(); return;
    }
    setStage(0); addMsg('bot', 'Olá! Qual é o seu nome?');
  }

  function onSubmit(t) {
    if (S.stage === 0) return salvarNome(t);
    if (S.stage === 1 && S.step === 'email') return tratarEmail(t);
    if (S.stage < 3) { addMsg('user', t); ensureChat(); return enviar(t, true); } // escreveu a dúvida: pula a coleta
    enviar(t);
  }

  function salvarNome(t) {
    var nome = t.replace(/\s+/g, ' ').slice(0, 40);
    S.nome = nome; lsSet(LS.nome, nome);
    addMsg('user', nome);
    addMsg('bot', 'Prazer, ' + nome + '! Sou o Bizu, assistente do Edital Bizurado.');
    irColeta();
  }

  function irColeta() {
    setStage(1); S.step = 'inicio';
    addMsg('bot', 'Quer responder 4 perguntas rápidas para eu te ajudar melhor, ou prefere perguntar direto?');
    addChips([{ label: 'Responder rápido', k: 'go' }, { label: 'Perguntar direto', k: 'skip', ghost: true }], function (it) {
      if (it.k === 'skip') { ensureChat(); addMsg('bot', 'Fechado! Qual é a sua dúvida?'); } else passoEmail();
    });
  }

  function passoEmail() {
    S.step = 'email'; setStage(1);
    addMsg('bot', 'Qual é o seu e-mail? É opcional, serve só para registrar seu retorno.');
    addChips([{ label: 'Pular', ghost: true }], function () { S.ctx.email = ''; passoCargo(); });
    el.input.focus();
  }

  function tratarEmail(t) {
    addMsg('user', t);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) {
      addMsg('bot', 'Esse e-mail parece incompleto. Tente no formato nome@exemplo.com ou toque em Pular.', { erro: true }); return;
    }
    el.log.querySelectorAll('.bz-chips').forEach(function (c) { c.remove(); });
    S.ctx.email = t; passoCargo();
  }

  function passoCargo() {
    S.step = 'cargo'; setStage(1);
    var jobs = listJobs(getEdital()), sel = getJob();
    if (sel && jobs.indexOf(sel) < 0) jobs.unshift(sel);
    if (!jobs.length) { S.ctx.cargo = ''; return passoArea(); }
    addMsg('bot', 'Qual cargo te interessa?');
    var items = jobs.map(function (j) { return { label: j }; }); items.push({ label: 'Ainda não sei', ghost: true, none: true });
    addChips(items, function (it) { S.ctx.cargo = it.none ? '' : it.label; passoArea(); });
  }

  function passoArea() {
    S.step = 'area'; addMsg('bot', 'Sobre o que é a sua dúvida?');
    addChips(AREAS.map(function (a) { return { label: a.label, v: a.v }; }), function (it) { S.ctx.area = it.v; passoUrgencia(); });
  }

  function passoUrgencia() {
    S.step = 'urgencia'; addMsg('bot', 'Qual a urgência?');
    addChips([{ label: 'Normal', v: 'normal' }, { label: 'Alta: prazo perto ou problema urgente', v: 'alta' }], function (it) {
      S.ctx.urgencia = it.v; classificar();
    });
  }

  // Etapa 2: card de classificação e próxima ação (regra local, a IA refina depois)
  function classificar() {
    setStage(2); S.step = null;
    var alta = S.ctx.urgencia === 'alta';
    var acao = alta
      ? 'Confira agora o texto oficial do edital e, se preciso, fale com a banca organizadora. Eu ajudo a achar a informação.'
      : 'Vou responder com base no edital carregado. Pode perguntar.';
    var card = document.createElement('div'); card.className = 'bz-card' + (alta ? ' alta' : '');
    card.innerHTML = '<h3>Classificação e próxima ação</h3><dl>' +
      '<dt>Nome</dt><dd>' + esc(S.nome) + '</dd>' +
      '<dt>Cargo</dt><dd>' + esc(S.ctx.cargo || 'Não definido') + '</dd>' +
      '<dt>Área</dt><dd>' + esc(areaLabel(S.ctx.area)) + '</dd>' +
      '<dt>Urgência</dt><dd><span class="bz-badge' + (alta ? ' alta' : '') + '">' + (alta ? 'Prioridade alta' : 'Prioridade normal') + '</span></dd></dl>' +
      '<p>' + esc(acao) + '</p><button type="button" class="bz-go">Começar a conversar</button>';
    card.querySelector('.bz-go').addEventListener('click', function () { card.querySelector('.bz-go').remove(); ensureChat(); addMsg('bot', 'Pronto! Qual é a sua dúvida?'); el.input.focus(); });
    el.log.appendChild(card); scroll();
  }

  // Entra no modo conversa livre (etapa 3) e persiste o perfil
  function ensureChat() {
    if (S.stage === 3) return;
    if (!S.nome) S.nome = 'Visitante';
    if (!S.ctx.cargo && getJob()) S.ctx.cargo = getJob();
    el.log.querySelectorAll('.bz-chips').forEach(function (c) { c.remove(); });
    S.step = null; setStage(3);
    lsSet(LS.nome, S.nome === 'Visitante' && !lsGet(LS.nome) ? '' : S.nome);
    if (!lsGet(LS.nome)) lsDel(LS.nome);
    lsSet(LS.ctx, JSON.stringify(S.ctx)); lsSet(LS.stage, '3');
  }

  // Etapa 3/4: chamada à IA. `semEco` evita repetir a bolha do usuário.
  function enviar(pergunta, semEco) {
    if (S.busy) return;
    if (!semEco) addMsg('user', pergunta);
    S.busy = true; el.input.disabled = true; typing(true);
    var ctl = new AbortController(), to = setTimeout(function () { ctl.abort(); }, 30000);
    fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
      body: JSON.stringify({
        dadosEdital: getEdital() || {}, pergunta: pergunta, historico: S.historico.slice(-12),
        contextoUsuario: { nome: S.nome, email: S.ctx.email, cargo: S.ctx.cargo || getJob(), area: S.ctx.area, urgencia: S.ctx.urgencia }
      })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok || !d.sucesso) throw new Error(d.erro || 'http ' + r.status);
        return d;
      });
    }).then(function (d) {
      S.historico.push({ role: 'user', text: pergunta }, { role: 'model', text: d.resposta });
      typing(false); addMsg('bot', d.resposta, { cls: d.classificacao });
    }).catch(function (e) {
      typing(false);
      addMsg('bot', e.name === 'AbortError'
        ? 'A resposta demorou demais. Tente de novo em instantes.'
        : 'Não consegui falar com o servidor agora. Verifique sua conexão e tente de novo.', { erro: true });
      addChips([{ label: 'Tentar de novo' }], function () { enviar(pergunta, true); });
    }).then(function () { // finally
      clearTimeout(to); S.busy = false; el.input.disabled = false; el.input.focus();
    });
  }

  function reiniciar() {
    if (S.busy) return;
    [LS.nome, LS.ctx, LS.stage].forEach(lsDel);
    S.nome = ''; S.ctx = { email: '', cargo: '', area: 'geral', urgencia: 'normal' }; S.historico = []; S.step = null;
    el.log.innerHTML = ''; toggleTest(false); start();
  }

  /* ---------- API pública ---------- */
  function open() {
    if (!el.root) return;
    el.root.classList.add('is-open'); el.launcher.setAttribute('aria-expanded', 'true');
    if (!S.started) start();
    setTimeout(function () { el.input.focus(); }, 50);
  }
  function close() {
    if (!el.root) return;
    toggleTest(false); el.root.classList.remove('is-open'); el.launcher.setAttribute('aria-expanded', 'false'); el.launcher.focus();
  }
  function updateContext(o) {
    o = o || {}; ext = ext || {};
    ['edital', 'selectedJob', 'demo'].forEach(function (k) { if (k in o) ext[k] = o[k]; });
    if (!el.root) return;
    if (!S.ctx.cargo && getJob()) S.ctx.cargo = getJob();
    renderHead(); renderSugs();
  }
  function init(opts) {
    opts = opts || {};
    ['getEdital', 'getSelectedJob', 'isDemo'].forEach(function (k) { if (typeof opts[k] === 'function') cfg[k] = opts[k]; });
    if (el.root) return;
    build(); renderHead(); setStage(0);
  }

  global.EditalChatbot = { init: init, updateContext: updateContext, open: open, close: close };
})(window);
