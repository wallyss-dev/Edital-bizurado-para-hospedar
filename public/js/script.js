/* Edital Bizurado — interface principal
 * Requisitos: window.EditalLogic (js/logica.js), window.EditalChatbot (js/chatbot.js) e pdf.js (index.html).
 */
(function () {
  'use strict';

  const L = window.EditalLogic;
  const app = document.getElementById('app');

  if (!app || !L) {
    console.error('Edital Bizurado: não foi possível carregar #app ou logica.js.');
    return;
  }

  const STORAGE_SAVED = 'edital_bizurado_salvos_v1';
  const STORAGE_ACTIVE = 'edital_bizurado_ativo_v1';
  const STORAGE_THEME = 'edital_bizurado_tema_v1';

  const state = {
    screen: 'home',
    mode: 'pdf',
    file: null,
    text: '',
    edital: null,
    demo: false,
    activeId: '',
    truncado: false,
    falhas: [],
    saved: [],
    tab: 'prazos',
    selectedJob: '',
    theme: '',
    error: '',
    info: '',
    busy: false,
    cancelled: false,
    progress: '',
    abort: null
  };

  const esc = value => String(value == null ? '' : value)
    .replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);

  const formatDate = value =>
    value ? (L.fmtDataBR(value) || 'Data não identificada') : 'Data não identificada';

  const formatMoney = value =>
    value == null ? 'Não informado' : L.fmtBRL(value);

  const today = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const textOr = (value, fallback = 'Não informado') =>
    value ? esc(value) : fallback;

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  function syncChatbot() {
    if (!window.EditalChatbot) return;
    const editalAtivo = state.screen === 'panel' ? state.edital : null;
    window.EditalChatbot.updateContext({
      edital: editalAtivo,
      selectedJob: editalAtivo ? state.selectedJob : '',
      demo: !!(editalAtivo && state.demo)
    });
  }

  /* ---------- tema e armazenamento local ---------- */
  function loadTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_THEME);
      if (saved === 'light' || saved === 'dark') {
        state.theme = saved;
        document.documentElement.setAttribute('data-theme', saved);
      }
    } catch (_) {
      // Sem acesso ao localStorage.
    }
  }

  function isDarkTheme() {
    if (state.theme === 'dark') return true;
    if (state.theme === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function toggleTheme() {
    state.theme = isDarkTheme() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    try {
      localStorage.setItem(STORAGE_THEME, state.theme);
    } catch (_) {
      // Ignora erro de gravação.
    }
  }

  function loadSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_SAVED);
      const list = raw ? JSON.parse(raw) : [];
      state.saved = Array.isArray(list) ? list : [];

      const activeRaw = localStorage.getItem(STORAGE_ACTIVE);
      if (activeRaw) {
        const active = JSON.parse(activeRaw);
        const found = state.saved.find(item => item.id === active.id);
        if (found && found.dados) {
          openResult(found.dados, false, {
            id: found.id,
            truncado: !!found.truncado,
            falhas: Array.isArray(found.falhas) ? found.falhas : [],
            tab: active.tab || 'prazos',
            selectedJob: active.selectedJob || ''
          });
        }
      }
    } catch (_) {
      state.saved = [];
    }
  }

  function persistSaved() {
    try {
      localStorage.setItem(STORAGE_SAVED, JSON.stringify(state.saved));
    } catch (_) {
      // Espaço esgotado ou navegação privada.
    }
  }

  function persistActive() {
    try {
      if (state.screen === 'panel' && !state.demo && state.activeId) {
        localStorage.setItem(STORAGE_ACTIVE, JSON.stringify({
          id: state.activeId,
          tab: state.tab,
          selectedJob: state.selectedJob
        }));
      } else {
        localStorage.removeItem(STORAGE_ACTIVE);
      }
    } catch (_) {
      // Ignora erro de gravação.
    }
  }

  function saveEdital(data, meta) {
    const id = String(Date.now());
    const entry = {
      id,
      salvoEm: new Date().toISOString(),
      dados: data,
      truncado: !!meta.truncado,
      falhas: Array.isArray(meta.falhas) ? meta.falhas : []
    };

    state.saved = [entry, ...state.saved].slice(0, 10);
    persistSaved();
    return id;
  }

  function deleteSaved(id) {
    state.saved = state.saved.filter(item => item.id !== id);
    if (state.activeId === id) {
      state.activeId = '';
      persistActive();
    }
    persistSaved();
  }

  function formatSavedDate(iso) {
    if (!iso) return '';
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(new Date(iso));
    } catch (_) {
      return '';
    }
  }

  /* ---------- interface ---------- */
  function header() {
    return `<header class="topo"><div class="wrap">
      <span class="marca">Edital <span class="grifo">Bizurado</span></span>
      <div class="topo-acoes">
        <a href="/planos.html" class="btn marker small">Planos</a>
        <button type="button" class="btn ghost small" data-action="theme">
          ${isDarkTheme() ? 'Tema claro' : 'Tema escuro'}
        </button>
        <button type="button" class="btn ghost small" data-action="home">Início</button>
      </div>
    </div></header>`;
  }

  function home() {
    return `<main>
      <section class="wrap hero">
        <div>
          <p class="kicker">Concursos públicos · vestibulares · processos seletivos</p>
          <h1>Seu edital, <span class="grifo">sem complicação.</span></h1>
          <p class="lead">Envie um edital para identificar datas, cargos, requisitos e matérias em um painel fácil de consultar.</p>

          <ol class="passos">
            <li><div>
              <strong>Envie seu edital</strong>
              <span>Selecione um PDF ou cole o texto.</span>
            </div></li>
            <li><div>
              <strong>Analise as informações</strong>
              <span>A IA organiza os dados do documento.</span>
            </div></li>
            <li><div>
              <strong>Consulte o painel</strong>
              <span>Veja prazos, cargos e matérias em um só lugar.</span>
            </div></li>
          </ol>

          <p class="nota" style="margin-top:24px">
            As informações geradas por IA podem conter erros.
            Confira sempre o edital oficial e suas retificações.
          </p>
        </div>

        <div><div class="painel-acao">
          <div class="seg" role="tablist" aria-label="Modo de entrada">
            <button type="button" role="tab"
              aria-selected="${state.mode === 'pdf'}"
              data-action="mode" data-value="pdf"
              ${state.busy ? 'disabled' : ''}>Enviar PDF</button>

            <button type="button" role="tab"
              aria-selected="${state.mode === 'text'}"
              data-action="mode" data-value="text"
              ${state.busy ? 'disabled' : ''}>Colar texto</button>
          </div>

          ${state.mode === 'pdf' ? uploadForm() : textForm()}

          ${state.error ? `<p class="aviso erro" role="alert">${esc(state.error)}</p>` : ''}
          ${state.info ? `<p class="aviso" role="status">${esc(state.info)}</p>` : ''}

          <div class="btn-linha">
            <button type="button" class="btn" data-action="analyze"
              ${state.busy ? 'disabled' : ''}>
              ${state.busy ? 'Processando…' : 'Analisar edital'}
            </button>

            ${state.busy
              ? `<button type="button" class="btn ghost" data-action="cancel">Cancelar</button>`
              : `<button type="button" class="btn ghost" data-action="example">Ver exemplo fictício</button>`}
          </div>

          ${state.busy ? `<p class="nota" id="progresso" role="status">${esc(state.progress || 'Preparando o edital…')}</p>` : ''}
        </div></div>
      </section>

      ${savedSection()}
    </main>`;
  }

  function savedSection() {
    if (!state.saved.length) return '';

    return `<section class="wrap salvos">
      <h2>Editais salvos neste navegador</h2>
      <div class="salvo-lista">
        ${state.saved.map(item => {
          const c = (item.dados && item.dados.concurso) || {};
          const counts = L.contagem(item.dados);
          return `<article class="salvo">
            <div>
              <h3>${textOr(c.nome || c.orgao, 'Edital analisado')}</h3>
              <p>${counts.datas} datas · ${counts.cargos} cargos · ${counts.disciplinas} disciplinas</p>
              ${item.salvoEm ? `<p>Salvo em ${esc(formatSavedDate(item.salvoEm))}</p>` : ''}
            </div>
            <div class="btn-linha">
              <button type="button" class="btn small" data-action="open-saved" data-id="${esc(item.id)}">Abrir</button>
              <button type="button" class="btn ghost small" data-action="delete-saved" data-id="${esc(item.id)}">Excluir</button>
            </div>
          </article>`;
        }).join('')}
      </div>
    </section>`;
  }

  function uploadForm() {
    return `<label class="drop" id="drop">
      <input id="arquivo" type="file"
        accept="application/pdf,.pdf"
        aria-label="Selecionar PDF do edital"
        ${state.busy ? 'disabled' : ''}>

      <svg viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.6" aria-hidden="true">
        <path d="M6 2.5h8l4 4v15H6z"/>
        <path d="M14 2.5v4h4M9 12h6M9 15.5h6M9 9h2"/>
      </svg>

      <strong>${state.file ? esc(state.file.name) : 'Selecione um PDF do edital'}</strong>

      <span>${state.file
        ? `${(state.file.size / 1048576).toFixed(2)} MB · clique para trocar`
        : 'Clique aqui ou arraste o arquivo'}</span>
    </label>`;
  }

  function textForm() {
    return `<label for="texto" class="sr">Texto do edital</label>
      <textarea id="texto" rows="10"
        placeholder="Cole aqui o conteúdo do edital…"
        ${state.busy ? 'disabled' : ''}>${esc(state.text)}</textarea>`;
  }

  function statusBox() {
    return `<p class="rodape-aviso">
      As informações são extraídas automaticamente por IA e ficam salvas apenas neste navegador.
      Confirme sempre datas, requisitos e retificações no edital oficial.
    </p>`;
  }

  function painel() {
    const data = state.edital;
    const c = data.concurso || {};
    const counts = L.contagem(data);

    return `<main>
      <div class="wrap cab">
        ${state.demo
          ? '<span class="selo-ex">Exemplo fictício — não é um concurso real</span>'
          : ''}

        <p class="kicker">Resultado da análise</p>
        <h1>${textOr(c.nome || c.orgao, 'Edital analisado')}</h1>

        <div class="cab-meta">
          <span>${textOr(c.orgao)}</span>
          ${c.banca ? `<span>Banca: ${esc(c.banca)}</span>` : ''}
          ${c.edital ? `<span>Edital: ${esc(c.edital)}</span>` : ''}
          <span>${counts.datas} datas · ${counts.cargos} cargos · ${counts.disciplinas} disciplinas</span>
        </div>

        ${c.resumo ? `<p class="nota">${esc(c.resumo)}</p>` : ''}

        ${state.truncado
          ? `<p class="aviso erro" role="alert">
              Este edital excedeu o limite de 20 trechos e foi analisado parcialmente.
              Confira o restante do conteúdo diretamente no PDF oficial.
            </p>`
          : ''}

        ${state.falhas && state.falhas.length
          ? `<div class="aviso erro" role="alert">
              <strong>Análise parcial:</strong> ${state.falhas.length} trecho(s) falharam durante a leitura
              (páginas ${state.falhas.map(f => f.ini === f.fim ? f.ini : `${f.ini}–${f.fim}`).join(', ')}).
              Os demais dados foram exibidos normalmente; confira essas páginas no edital oficial.
            </div>`
          : ''}

        ${data.alertas && data.alertas.length
          ? `<div class="alertas">
              <strong>Avisos identificados</strong>
              <ul>${data.alertas.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
            </div>`
          : ''}
      </div>

      <nav class="abas" aria-label="Informações do edital">
        <div class="wrap" role="tablist">
          ${[
            ['prazos', 'Prazos'],
            ['cargos', 'Cargos e requisitos'],
            ['materias', 'Matérias']
          ].map(([key, label]) => `
            <button type="button" role="tab" class="aba"
              aria-selected="${state.tab === key}"
              data-action="tab" data-value="${key}">
              ${label}
            </button>
          `).join('')}
        </div>
      </nav>

      <div class="wrap conteudo">
        ${state.tab === 'prazos'
          ? deadlines()
          : state.tab === 'cargos'
            ? jobs()
            : subjects()}

        ${statusBox()}

        <div class="btn-linha">
          <button type="button" class="btn ghost" data-action="home">
            Analisar outro edital
          </button>
        </div>
      </div>
    </main>`;
  }

  function deadlines() {
    const events = (state.edital.datas || [])
      .slice()
      .sort((a, b) =>
        (a.data_inicio || '9999').localeCompare(b.data_inicio || '9999')
      );

    if (!events.length) {
      return `<div class="vazio">
        Nenhuma data foi identificada. Confira o edital original.
      </div>`;
    }

    const next = L.proximoPrazo(events, today());

    return `
      ${next
        ? `<section class="proximo">
            <p class="kicker">Próximo prazo</p>
            <h2>${esc(next.evento)}</h2>
            <p>${formatDate(next.data_inicio)}
              ${next.data_fim ? ` até ${formatDate(next.data_fim)}` : ''}
            </p>
          </section>`
        : ''}

      <ol class="linha-tempo">
        ${events.map(event => {
          const dt = L.parseISO(event.data_inicio);
          const info = L.statusPrazo(event, today());
          const cat = L.CATEGORIAS[event.categoria] || L.CATEGORIAS.outro;
          const classes = [
            'prazo',
            info.tipo === 'passado' ? 'passado' : '',
            info.urgente ? 'urg' : ''
          ].filter(Boolean).join(' ');

          return `<li class="${classes}">
            <div class="dt">
              <span class="dt-d">
                ${dt ? String(dt.getDate()).padStart(2, '0') : '—'}
              </span>

              <span class="dt-m">
                ${dt ? `${L.MES_AB[dt.getMonth()]} ${dt.getFullYear()}` : 'Sem data'}
              </span>
            </div>

            <div>
              <div class="pz-tit">
                <span class="chip tom-${esc(cat.tom)}">${esc(cat.rotulo)}</span>
                <strong>${esc(event.evento)}</strong>
              </div>

              ${!dt && event.data_texto
                ? `<p class="pz-obs">Data informada no edital: ${esc(event.data_texto)}</p>`
                : ''}

              ${event.data_fim
                ? `<p class="pz-obs">Até ${formatDate(event.data_fim)}</p>`
                : ''}

              ${event.hora
                ? `<p class="pz-obs">Horário informado: ${esc(event.hora)}</p>`
                : ''}

              ${event.observacao
                ? `<p class="pz-obs">${esc(event.observacao)}</p>`
                : ''}

              ${event.pagina
                ? `<div class="fonte-linha">
                    <small class="fonte">
                      Fonte: página ${event.pagina} do PDF (confira no original)
                    </small>
                  </div>`
                : ''}
            </div>

            <div class="pz-lado">
              <span class="status">${esc(info.texto)}</span>
            </div>
          </li>`;
        }).join('')}
      </ol>`;
  }

  function jobs() {
    const list = state.edital.cargos || [];

    if (!list.length) {
      return `<div class="vazio">
        Nenhum cargo foi identificado neste edital.
      </div>`;
    }

    const selected = list.find(c => c.nome === state.selectedJob) || list[0];

    const fields = [
      selected.codigo ? ['Código', selected.codigo] : null,
      ['Salário', formatMoney(selected.salario)],
      ['Vagas imediatas', L.fmtVagas(selected.vagas_imediatas)],
      ['Cadastro de reserva', L.fmtVagas(selected.vagas_reserva)],
      selected.vagas_pcd != null ? ['Vagas PcD', L.fmtVagas(selected.vagas_pcd)] : null,
      selected.vagas_negros != null ? ['Vagas negros', L.fmtVagas(selected.vagas_negros)] : null,
      ['Escolaridade', selected.escolaridade || 'Não informado'],
      ['Carga horária', selected.carga_horaria || 'Não informada'],
      ['Taxa de inscrição', formatMoney(selected.taxa)]
    ].filter(Boolean);

    return `<div class="ficha">
      <div class="cargos-col">
        <div class="cargos" id="lista-cargos">
          ${list.map((c, index) => `
            <button type="button" class="cargo-item"
              data-action="job" data-index="${index}"
              ${selected === c ? 'aria-current="true"' : ''}>
              <b>${c.codigo ? `${esc(c.codigo)} · ` : ''}${esc(c.nome)}</b>
              <small>${textOr(c.escolaridade)} · ${formatMoney(c.salario)}</small>
            </button>
          `).join('')}
        </div>
      </div>

      <article class="detalhe">
        <div>
          <p class="kicker">Cargo / função${selected.codigo ? ` · Código ${esc(selected.codigo)}` : ''}</p>
          <h2>${esc(selected.nome)}</h2>
        </div>

        <div class="campos">
          ${fields.map(([label, value]) => `
            <div class="campo">
              <span class="kicker">${esc(label)}</span>
              <b class="peq">${esc(value)}</b>
            </div>
          `).join('')}
        </div>

        ${selected.lotacao
          ? `<section>
              <h3 class="sec-tit">Lotação</h3>
              <p>${esc(selected.lotacao)}</p>
            </section>`
          : ''}

        ${selected.atribuicoes
          ? `<section>
              <h3 class="sec-tit">Atribuições</h3>
              <p>${esc(selected.atribuicoes)}</p>
            </section>`
          : ''}

        <section>
          <h3 class="sec-tit">Requisitos identificados</h3>

          ${selected.requisitos && selected.requisitos.length
            ? `<ul>
                ${selected.requisitos.map(r => `<li>${esc(r)}</li>`).join('')}
              </ul>`
            : '<p>Não encontrados no trecho analisado.</p>'}
        </section>

        ${selected.pagina
          ? `<div class="fonte-linha">
              <small class="fonte">
                Fonte: página ${selected.pagina} do PDF (confira no original)
              </small>
            </div>`
          : ''}
      </article>
    </div>`;
  }

  function subjects() {
    const jobsList = state.edital.cargos || [];

    const selectedName = jobsList.length
      ? state.selectedJob || jobsList[0].nome
      : '';

    const result = L.conteudoParaCargo(state.edital, selectedName);

    if (!result.disciplinas.length) {
      return `<div class="vazio">
        Nenhum conteúdo programático foi identificado.
      </div>`;
    }

    return `
      ${jobsList.length
        ? `<div class="vt-topo">
            <label>Cargo
              <select id="subject-job">
                ${jobsList.map(c => `
                  <option value="${esc(c.nome)}"
                    ${c.nome === selectedName ? 'selected' : ''}>
                    ${esc(c.nome)}
                  </option>
                `).join('')}
              </select>
            </label>
          </div>`
        : ''}

      ${result.generico
        ? `<p class="nota">
            O conteúdo não foi separado claramente por cargo no edital;
            exibimos todas as matérias encontradas.
          </p>`
        : ''}

      <div>
        ${result.disciplinas.map((disc, i) => `
          <details class="disc" ${i === 0 ? 'open' : ''}>
            <summary>
              <strong>${esc(disc.nome)}</strong>
              <span class="mini">
                ${disc.topicos.length} tópico(s)${disc.pagina ? ` · pág. ${disc.pagina}` : ''}
              </span>
            </summary>

            <ul style="padding:12px 20px 16px 34px">
              ${disc.topicos.map(topic => `
                <li style="padding:4px 0">${esc(topic.texto)}</li>
              `).join('')}
            </ul>
          </details>
        `).join('')}
      </div>`;
  }

  function render() {
    app.innerHTML = header() +
      (state.screen === 'panel' && state.edital ? painel() : home());
    syncChatbot();
  }

  function cancelAnalysis() {
    state.cancelled = true;
    if (state.abort) {
      state.abort.abort();
      state.abort = null;
    }
  }

  async function readPdf(file) {
    if (!window.pdfjsLib) {
      throw new Error(
        'A biblioteca de PDF não carregou. Verifique sua conexão e recarregue a página.'
      );
    }

    const bytes = await file.arrayBuffer();

    const task = window.pdfjsLib.getDocument({
      data: new Uint8Array(bytes)
    });

    const pdf = await task.promise;
    const pages = [];

    for (let n = 1; n <= pdf.numPages; n++) {
      if (state.cancelled) {
        const err = new Error('Análise cancelada.');
        err.name = 'AbortError';
        throw err;
      }

      const page = await pdf.getPage(n);
      const content = await page.getTextContent();

      pages.push(
        content.items.map(item => item.str || '').join(' ')
      );

      state.progress = `Lendo página ${n} de ${pdf.numPages}…`;
      updateProgress();
    }

    if (!pages.some(s => s.trim())) {
      throw new Error(
        'O PDF não contém texto selecionável. Use um PDF com texto ou cole o conteúdo manualmente.'
      );
    }

    return pages;
  }

  function updateProgress() {
    const el = document.getElementById('progresso');

    if (state.busy && el) {
      el.textContent = state.progress;
    }
  }

  function limparResultado(raw) {
    if (Array.isArray(raw)) {
      const parciais = raw.map(item => {
        if (item && typeof item === 'object' && item.dados && item.ini && item.fim) {
          return L.restringirPaginas(L.limpar(item.dados), item.ini, item.fim);
        }
        return L.limpar(item);
      });
      return L.mesclar(parciais);
    }
    return L.limpar(raw);
  }

  async function analyze() {
    if (state.busy) return;

    if (state.mode === 'pdf' && !state.file) {
      state.error = 'Selecione um arquivo PDF.';
      render();
      return;
    }

    if (state.mode === 'text' && !state.text.trim()) {
      state.error = 'Cole o texto do edital antes de analisar.';
      render();
      return;
    }

    state.error = '';
    state.info = '';
    state.busy = true;
    state.cancelled = false;
    state.progress = 'Preparando o documento…';

    render();

    try {
      const pages = state.mode === 'pdf'
        ? await readPdf(state.file)
        : [state.text];

      if (state.cancelled) {
        const err = new Error('Análise cancelada.');
        err.name = 'AbortError';
        throw err;
      }

      const chunks = L.dividirEmTrechos(pages, 30000, 20);

      if (!chunks.trechos.length) {
        throw new Error('Não foi possível identificar texto para análise.');
      }

      const resultados = [];
      const falhas = [];
      let ultimoErro = '';

      // Envia 1 trecho por requisição para evitar timeout na Vercel e exibir progresso real.
      for (let i = 0; i < chunks.trechos.length; i++) {
        if (state.cancelled) {
          const err = new Error('Análise cancelada.');
          err.name = 'AbortError';
          throw err;
        }

        const trecho = chunks.trechos[i];
        const faixa = trecho.ini === trecho.fim
          ? `página ${trecho.ini}`
          : `páginas ${trecho.ini}–${trecho.fim}`;

        state.progress =
          `Analisando trecho ${i + 1} de ${chunks.trechos.length} (${faixa})…`;
        updateProgress();

        const controller = new AbortController();
        state.abort = controller;

        try {
          const response = await fetch('/api/analisar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              trecho,
              indice: i + 1,
              total: chunks.trechos.length
            }),
            signal: controller.signal
          });

          if (!response.ok) {
            if (response.status === 404) {
              throw new Error(
                'Rota /api/analisar não encontrada. Verifique se o servidor está ativo.'
              );
            }

            let detail = '';
            let fatal = false;

            try {
              const errBody = await response.json();
              detail = errBody.error || errBody.message || '';
              fatal = !!errBody.fatal;
            } catch (_) {
              // Servidor não retornou JSON (ex.: timeout 504).
            }

            const msg = detail || `Erro na análise (HTTP ${response.status}).`;

            if (fatal || response.status === 400 || response.status === 500) {
              throw new Error(msg);
            }

            ultimoErro = msg;
            falhas.push({ trecho: i + 1, ini: trecho.ini, fim: trecho.fim, motivo: msg });
            continue;
          }

          const body = await response.json();
          const raw = body.dados || body;

          if (Array.isArray(raw)) {
            resultados.push(...raw);
          } else {
            resultados.push({ ini: trecho.ini, fim: trecho.fim, dados: raw });
          }

        } catch (err) {
          if (err.name === 'AbortError') {
            throw err;
          }

          if (/Rota \/api\/analisar|GEMINI_API_KEY|GEMINI_MODEL|autenticar/i.test(err.message || '')) {
            throw err;
          }

          ultimoErro = err.message || 'Falha ao processar trecho.';
          falhas.push({ trecho: i + 1, ini: trecho.ini, fim: trecho.fim, motivo: ultimoErro });
        }

        if (i < chunks.trechos.length - 1 && !state.cancelled) {
          await wait(350);
        }
      }

      if (!resultados.length) {
        throw new Error(ultimoErro || 'Não foi possível analisar o edital.');
      }

      const data = limparResultado(resultados);

      if (!L.temConteudo(data)) {
        throw new Error(
          'A análise não identificou prazos, cargos ou matérias.'
        );
      }

      const id = saveEdital(data, { truncado: chunks.truncado, falhas });
      openResult(data, false, { id, truncado: chunks.truncado, falhas });

    } catch (e) {
      state.error = e.name === 'AbortError'
        ? 'Análise cancelada.'
        : (e.message || 'Não foi possível analisar o edital.');

      state.screen = 'home';

    } finally {
      state.busy = false;
      state.cancelled = false;
      state.abort = null;
      state.progress = '';

      render();
    }
  }

  function openResult(data, demo, meta = {}) {
    state.edital = data;
    state.demo = demo;
    state.activeId = meta.id || '';
    state.truncado = !!meta.truncado;
    state.falhas = Array.isArray(meta.falhas) ? meta.falhas : [];
    state.screen = 'panel';
    state.tab = meta.tab || 'prazos';
    state.selectedJob = meta.selectedJob || (data.cargos[0] && data.cargos[0].nome) || '';
    persistActive();
  }

  app.addEventListener('click', e => {
    const button = e.target.closest('[data-action]');

    if (!button) return;

    const action = button.dataset.action;

    if (action === 'theme') {
      toggleTheme();
      render();
    }

    if (action === 'home') {
      if (state.busy) cancelAnalysis();
      state.screen = 'home';
      state.activeId = '';
      state.error = '';
      persistActive();
      render();
    }

    if (action === 'cancel') {
      cancelAnalysis();
    }

    if (action === 'mode') {
      state.mode = button.dataset.value;
      state.error = '';
      render();
    }

    
    if (action === 'example') {
      if (!window.DEMO_TERESINA) {
        state.error = 'Os dados da demonstração não foram carregados.';
        render();
        return;
      }

      const dadosDemo = L.limpar(window.DEMO_TERESINA);
      openResult(dadosDemo, true);
      render();
    }


    if (action === 'analyze') {
      analyze();
    }

    if (action === 'tab') {
      state.tab = button.dataset.value;
      persistActive();
      render();
    }

    if (action === 'job') {
      state.selectedJob =
        state.edital.cargos[Number(button.dataset.index)].nome;
      persistActive();
      render();
    }

    if (action === 'open-saved') {
      const found = state.saved.find(item => item.id === button.dataset.id);
      if (found) {
        openResult(found.dados, false, {
          id: found.id,
          truncado: found.truncado,
          falhas: found.falhas
        });
        render();
      }
    }

    if (action === 'delete-saved') {
      deleteSaved(button.dataset.id);
      render();
    }
  });

  app.addEventListener('change', e => {
    if (e.target.id === 'arquivo') {
      const file = e.target.files && e.target.files[0];

      if (
        file &&
        file.type !== 'application/pdf' &&
        !/\.pdf$/i.test(file.name)
      ) {
        state.file = null;
        state.error = 'O arquivo selecionado não é PDF.';
      } else {
        state.file = file || null;
        state.error = '';
      }

      render();
    }

    if (e.target.id === 'subject-job') {
      state.selectedJob = e.target.value;
      persistActive();
      render();
    }
  });

  app.addEventListener('input', e => {
    if (e.target.id === 'texto') {
      state.text = e.target.value;
    }
  });

  app.addEventListener('dragenter', e => {
    const drop = e.target.closest('#drop');
    if (drop) {
      e.preventDefault();
      drop.classList.add('over');
    }
  });

  app.addEventListener('dragover', e => {
    const drop = e.target.closest('#drop');
    if (drop) {
      e.preventDefault();
      drop.classList.add('over');
    }
  });

  app.addEventListener('dragleave', e => {
    const drop = e.target.closest('#drop');
    if (drop && !drop.contains(e.relatedTarget)) {
      drop.classList.remove('over');
    }
  });

  app.addEventListener('drop', e => {
    const drop = e.target.closest('#drop');
    if (!drop) return;

    e.preventDefault();
    drop.classList.remove('over');

    const file = e.dataTransfer &&
      e.dataTransfer.files &&
      e.dataTransfer.files[0];

    if (!file) return;

    if (
      !/\.pdf$/i.test(file.name) &&
      file.type !== 'application/pdf'
    ) {
      state.error = 'O arquivo selecionado não é PDF.';
    } else {
      state.file = file;
      state.error = '';
    }

    render();
  });

  try {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  } catch (_) {
    // Biblioteca não disponível.
  }

  loadTheme();
  loadSaved();

  if (window.EditalChatbot) {
    window.EditalChatbot.init({
      getEdital: () => (state.screen === 'panel' ? state.edital : null),
      getSelectedJob: () => (state.screen === 'panel' ? state.selectedJob : ''),
      isDemo: () => !!(state.screen === 'panel' && state.demo)
    });
  }

  render();
})();