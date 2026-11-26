/* services/guardrails.js
 * Travas determinísticas do Bizu (não dependem do modelo obedecer ao prompt):
 *  - sanitização de tudo que o cliente envia e entra no prompt (nome, cargo, área, urgência, histórico, edital);
 *  - triagem da mensagem ANTES de chamar a IA (tratamento/apelido, xingamento, troca de persona, vazamento de prompt);
 *  - validação da resposta DEPOIS da IA (palavrão/insulto, vazamento de instruções).
 *
 * A lista de termos ofensivos do front (public/js/chatbot.js) deve ser mantida em sincronia com esta.
 */

export const MENSAGENS = {
  tratamento:
    'Eu chamo você pelo nome que informou no início do atendimento e não altero o tratamento durante a conversa. ' +
    'Se quiser corrigir seu nome, use o botão "Reiniciar". Enquanto isso, posso ajudar com prazos, cargos, requisitos, taxas ou matérias do edital.',
  conduta:
    'Prefiro manter a conversa respeitosa. Reformule sua dúvida sem xingamentos e eu ajudo a encontrar a informação no edital.',
  persona:
    'Sou o Bizu e meu papel é fixo: tirar dúvidas sobre o edital analisado e sobre esta plataforma. ' +
    'Não assumo outros personagens nem divulgo minhas instruções internas. Quer consultar prazos, cargos, taxas ou matérias?',
  semResposta:
    'Não consegui formular uma resposta segura para essa pergunta. Tente reformulá-la com foco no edital ou em como usar a plataforma.'
};

export function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/* ---------- termos ofensivos (texto normalizado: minúsculo, sem acento) ----------
 * Só termos sem sentido legítimo em edital (evita "lixo", "besta", "anta", "deficiente"...).
 */
const TERMOS_OFENSIVOS = [
  'jument[oa]', 'burr[oa]', 'idiota', 'imbecil', 'babaca', 'otari[oa]', 'trouxa', 'cretin[oa]',
  'retardad[oa]', 'energumeno', 'estupid[oa]', 'vagabund[oa]', 'viado', 'merda', 'bosta',
  'porra', 'caralho', 'puta', 'putinha', 'fdp', 'pqp', 'vsf'
];
const REGEX_OFENSIVO = new RegExp(`\\b(?:${TERMOS_OFENSIVOS.join('|')})s?\\b`);

export function contemOfensa(texto) {
  return REGEX_OFENSIVO.test(normalizar(texto));
}

/* ---------- triagem da mensagem do usuário (antes da IA) ---------- */
const PADROES_TRIAGEM = [
  {
    tipo: 'sigilo',
    re: /\b(system prompt|prompt do sistema|instrucoes (do sistema|internas|iniciais|secretas|ocultas)|suas instrucoes|seu prompt|suas regras internas|revele (suas|as) regras|mostre (as |suas )?(regras|instrucoes)|repita (tudo|o texto|as instrucoes) (acima|anterior))\b/
  },
  {
    tipo: 'persona',
    re: /\b(ignore|ignora|ignorem|esqueca|esquece|desconsidere|desconsidera|descarte|desative)\b.{0,50}\b(instrucoes|regras|prompt|restricoes|filtros|diretrizes|anteriores|acima)\b/
  },
  {
    tipo: 'persona',
    re: /\b(finja|finge|fingir|aja como|atue como|haja como|faca de conta|imagine que voce|voce agora e (um|uma|o|a)|a partir de agora voce|modo desenvolvedor|developer mode|jailbreak|roleplay|role play|sem restricoes|sem filtros?)\b/
  },
  {
    tipo: 'tratamento',
    re: /\b(me\s+(chame|chama|chamar)\s+(de|como|por)|me\s+(trate|tratar)\s+(como|de|por)|me\s+(apelide|apelidar|xingue|xingar|insulte|insultar|ofenda|ofender)|(chame|chama)-me|quero\s+ser\s+(chamad[oa]|tratad[oa])|meu\s+(novo\s+)?(apelido|nome)\s+(e|eh|agora\s+e|passa\s+a\s+ser|sera)|(diga|fale|escreva|repita|confirme|admita)\s+(que\s+)?(eu\s+sou|sou)\s+(um|uma)\b)/
  }
];

/**
 * Retorna { tipo, resposta } quando a mensagem deve ser barrada sem chamar a IA; senão null.
 */
export function triagemMensagem(texto) {
  const txt = normalizar(texto);
  if (!txt.trim()) return null;

  for (const { tipo, re } of PADROES_TRIAGEM) {
    if (re.test(txt)) {
      return { tipo, resposta: tipo === 'tratamento' ? MENSAGENS.tratamento : MENSAGENS.persona };
    }
  }

  if (REGEX_OFENSIVO.test(txt)) {
    return { tipo: 'conduta', resposta: MENSAGENS.conduta };
  }

  return null;
}

/* ---------- validação da resposta da IA (depois da IA) ---------- */
const MARCADORES_VAZAMENTO =
  /(REGRAS INEGOCI[ÁA]VEIS|IDENTIDADE \(IMUT[ÁA]VEL\)|BASE DO EDITAL ANALISADO|BASE DE FAQ OFICIAL|systemInstruction|<edital_json>|<perfil_candidato>)/i;

export function validarResposta(texto) {
  const t = String(texto || '').trim();

  if (!t) return { ok: false, motivo: 'vazia', texto: MENSAGENS.semResposta };
  if (contemOfensa(t)) return { ok: false, motivo: 'ofensa', texto: MENSAGENS.conduta };
  if (MARCADORES_VAZAMENTO.test(t)) return { ok: false, motivo: 'vazamento', texto: MENSAGENS.persona };

  return { ok: true, motivo: null, texto: t };
}

/* ---------- sanitização do que o cliente envia ---------- */
export function sanitizarNome(valor) {
  const limpo = String(valor || '')
    .normalize('NFC')
    .replace(/[^\p{L}\s'’.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);

  if (limpo.length < 2 || limpo.split(' ').length > 3) return '';
  if (contemOfensa(limpo) || triagemMensagem(limpo)) return '';

  return limpo;
}

export function primeiroNome(valor) {
  return sanitizarNome(valor).split(' ')[0] || '';
}

const AREAS_VALIDAS = ['prazos', 'cargos', 'materias', 'pagamento', 'geral'];
const URGENCIAS_VALIDAS = ['normal', 'alta'];

/**
 * Só aceita nome de cargo que exista no edital carregado (devolve o nome oficial);
 * área e urgência só aceitam valores da lista. Nada de texto livre entra no prompt.
 */
export function sanitizarContexto(contexto = {}, dadosEdital = null) {
  const ctx = contexto && typeof contexto === 'object' ? contexto : {};
  const cargos = Array.isArray(dadosEdital?.cargos) ? dadosEdital.cargos : [];
  const alvo = normalizar(ctx.cargo).trim();

  const cargoOficial = alvo
    ? cargos.map(c => String(c?.nome || '')).find(n => n && normalizar(n).trim() === alvo)
    : '';

  const area = normalizar(ctx.area);
  const urgencia = normalizar(ctx.urgencia);

  return {
    nome: primeiroNome(ctx.nome),
    cargo: cargoOficial || '',
    area: AREAS_VALIDAS.includes(area) ? area : 'geral',
    urgencia: URGENCIAS_VALIDAS.includes(urgencia) ? urgencia : 'normal'
  };
}

/**
 * O histórico vem do navegador e pode ser forjado (inclusive turnos "model").
 * Mantém só pares user→model íntegros, sem triagem/ofensa/vazamento, no máximo 6 pares.
 */
export function sanitizarHistorico(historico) {
  if (!Array.isArray(historico)) return [];

  const lista = historico
    .slice(-12)
    .filter(m => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string' && m.text.trim());

  const pares = [];

  for (let i = 0; i < lista.length - 1; i++) {
    const a = lista[i];
    const b = lista[i + 1];

    if (a.role === 'user' && b.role === 'model') {
      const userOk = !triagemMensagem(a.text) && !contemOfensa(a.text);
      const modelOk = validarResposta(b.text).ok;

      if (userOk && modelOk) {
        pares.push(
          { role: 'user', parts: [{ text: a.text.trim().slice(0, 800) }] },
          { role: 'model', parts: [{ text: b.text.trim().slice(0, 1000) }] }
        );
      }
      i++;
    }
  }

  return pares.slice(-12);
}
