import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { analisarEdital, analisarTrecho, responderChat } from './services/gemini.service.js';
import { montarPayloadChat } from './services/persona.js';
import { validarResposta } from './services/guardrails.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

const app = express();
const PORT = process.env.PORT || 3000;

// Limite abaixo dos 4.5 MB suportados em funções Serverless da Vercel.
app.use(express.json({ limit: '4mb' }));

// Disponibiliza HTML, CSS e JavaScript do projeto (uso local).
app.use(express.static(publicDir));

function trechoValido(t) {
  return (
    t &&
    typeof t.texto === 'string' &&
    t.texto.trim().length > 0 &&
    t.texto.length <= 30000 &&
    Number.isInteger(t.ini) &&
    Number.isInteger(t.fim) &&
    t.ini >= 1 &&
    t.fim >= t.ini
  );
}

// Verificação simples de saúde da API (útil após deploy na Vercel).
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Rota responsável pela análise real do edital (aceita 1 trecho por vez ou lote).
app.post('/api/analisar', async (req, res) => {
  try {
    const { trecho, indice, total, trechos } = req.body || {};

    if (trecho) {
      if (!trechoValido(trecho)) {
        return res.status(400).json({
          error: 'O trecho enviado é inválido ou excede o limite de 30.000 caracteres.'
        });
      }

      const idx = Number.isInteger(indice) && indice >= 1 ? indice : 1;
      const tot = Number.isInteger(total) && total >= idx ? total : idx;

      const resultado = await analisarTrecho(trecho, idx, tot);

      return res.json({
        sucesso: true,
        dados: [resultado],
        falhas: []
      });
    }

    if (
      !Array.isArray(trechos) ||
      trechos.length === 0 ||
      trechos.length > 20 ||
      !trechos.every(trechoValido)
    ) {
      return res.status(400).json({
        error: 'O texto enviado é inválido ou excede o limite permitido.'
      });
    }

    console.log(`Nova análise recebida: ${trechos.length} trecho(s).`);

    const { resultados, falhas } = await analisarEdital(trechos);

    return res.json({
      sucesso: true,
      dados: resultados,
      falhas
    });

  } catch (erro) {
    console.error('Erro na análise:', erro.message);

    const mensagem = String(erro.message || '');

    if (/GEMINI_API_KEY/i.test(mensagem)) {
      return res.status(500).json({
        error: 'Chave GEMINI_API_KEY não configurada no servidor.',
        fatal: true
      });
    }

    if (
      erro.status === 429 ||
      /quota|rate.limit|resource.exhausted/i.test(mensagem)
    ) {
      return res.status(429).json({
        error: 'Limite de uso do Gemini atingido. Tente novamente em instantes.'
      });
    }

    if (
      erro.status === 401 ||
      erro.status === 403 ||
      /api.key.not.valid|api key not valid/i.test(mensagem)
    ) {
      return res.status(502).json({
        error: 'Não foi possível autenticar na API Gemini. Verifique a GEMINI_API_KEY.',
        fatal: true
      });
    }

    if (
      erro.status === 404 ||
      /model.*not found|not_found/i.test(mensagem)
    ) {
      return res.status(502).json({
        error: 'Modelo Gemini configurado não foi encontrado. Verifique GEMINI_MODEL.',
        fatal: true
      });
    }

    return res.status(502).json({
      error: 'Falha ao analisar o edital com Gemini. Tente novamente.'
    });
  }
});

// Rota do chatbot Bizu (FAQ + dúvidas sobre o edital analisado).
app.post('/api/chat', async (req, res) => {
  try {
    const { dadosEdital, pergunta, historico, contextoUsuario } = req.body || {};

    if (typeof pergunta !== 'string' || !pergunta.trim()) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Digite uma pergunta antes de enviar.'
      });
    }

    const { bloqueio, systemInstruction, contents, classificacao } = montarPayloadChat({
      dadosEdital: dadosEdital && typeof dadosEdital === 'object' ? dadosEdital : null,
      pergunta,
      historico,
      contextoUsuario
    });

    // Trava determinística: tratamento/apelido, xingamento, troca de persona, vazamento de prompt.
    if (bloqueio) {
      console.log(`Chat barrado antes da IA (${bloqueio.tipo}).`);
      return res.json({ sucesso: true, resposta: bloqueio.resposta, classificacao });
    }

    const bruta = await responderChat({ systemInstruction, contents });

    // Validação de saída: nunca entrega insulto/palavrão nem trecho das instruções internas.
    const validada = validarResposta(bruta);
    if (!validada.ok) console.warn(`Resposta da IA substituída (${validada.motivo}).`);

    return res.json({
      sucesso: true,
      resposta: validada.texto,
      classificacao
    });

  } catch (erro) {
    console.error('Erro no chat:', erro.message);

    const mensagem = String(erro.message || '');

    if (erro.status === 429 || /quota|rate.limit|resource.exhausted/i.test(mensagem)) {
      return res.status(429).json({
        sucesso: false,
        erro: 'Limite de uso do Gemini atingido. Tente novamente em instantes.'
      });
    }

    return res.status(502).json({
      sucesso: false,
      erro: 'Não foi possível consultar a IA agora. Tente novamente.'
    });
  }
});

// Só abre a porta localmente; na Vercel o app é executado como Serverless Function.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`✅ Edital Bizurado no ar: http://localhost:${PORT}`);
  });
}

export default app;
