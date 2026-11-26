# Edital Bizurado

Aplicação web desenvolvida na disciplina **Ferramentas de IA e Chatbots** (Tecnólogo em Inteligência Artificial) para extrair e organizar informações de editais de concursos públicos, vestibulares e processos seletivos.

## Funcionalidades

- Envio de edital em PDF (com texto selecionável) ou texto colado.
- Extração estruturada por Inteligência Artificial (Google Gemini) processada trecho a trecho.
- Painel com **Prazos** (com destaque de urgência), **Cargos e requisitos** e **Matérias** filtradas por cargo.
- Indicação da página do PDF de origem para conferência no edital oficial.
- Histórico salvo localmente no navegador (`localStorage`) e alternância entre tema claro e escuro.
- Edital fictício integrado para demonstração sem consumo de API.

## Tecnologias

- **Back-end:** Node.js, Express e `@google/genai` (API Gemini)
- **Front-end:** HTML, CSS, JavaScript e `pdf.js`
- **Hospedagem:** compatível com execução local e deploy na Vercel (Serverless Functions)

## Como executar localmente

1. Instale as dependências:
   ```bash
   npm install