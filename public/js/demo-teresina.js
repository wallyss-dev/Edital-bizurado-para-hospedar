/*
 * Edital Bizurado — Demonstração local
 * Edital fictício nº 007/2026 — Teresina/PI
 *
 * Dados preparados previamente para demonstração.
 * NÃO representa uma chamada em tempo real ao Gemini.
 */

(function () {
  "use strict";

  const cargos = [
    ["101", "Auxiliar de Serviços Gerais", "Ensino fundamental completo", 8, 1680, "40 horas semanais", 55,
      ["Ensino fundamental completo", "Idade mínima de 18 anos", "Aptidão física para as atividades"]],
    ["102", "Motorista de Transporte Escolar", "Ensino fundamental completo", 4, 2350, "40 horas semanais", 55,
      ["Ensino fundamental completo", "Idade mínima de 21 anos", "CNH categoria D ou superior", "Curso especializado para transporte de escolares"]],
    ["201", "Assistente Administrativo", "Ensino médio completo", 12, 2420, "40 horas semanais", 75,
      ["Ensino médio completo", "Conhecimentos básicos de informática"]],
    ["202", "Agente de Apoio Escolar", "Ensino médio completo", 10, 2180, "40 horas semanais", 75,
      ["Ensino médio completo", "Disponibilidade para atuar nos turnos escolares"]],
    ["203", "Técnico em Informática", "Ensino médio completo e curso técnico em Informática ou equivalente", 5, 3150, "40 horas semanais", 75,
      ["Formação técnica em Informática, Redes de Computadores, Manutenção e Suporte ou equivalente"]],
    ["204", "Técnico em Enfermagem", "Ensino médio completo e curso técnico em Enfermagem", 6, 3320, "36 horas semanais", 75,
      ["Curso técnico em Enfermagem", "Registro profissional ativo no Conselho Regional de Enfermagem"]],
    ["205", "Fiscal de Serviços Urbanos", "Ensino médio completo", 4, 2750, "40 horas semanais", 75,
      ["Ensino médio completo", "Disponibilidade para atividades externas"]],
    ["301", "Analista de Sistemas", "Ensino superior em Computação ou área correlata", 3, 5850, "40 horas semanais", 110,
      ["Diploma de graduação em Ciência da Computação, Sistemas de Informação, Engenharia de Software ou área correlata"]],
    ["302", "Nutricionista", "Ensino superior completo em Nutrição", 2, 4980, "30 horas semanais", 110,
      ["Graduação em Nutrição", "Registro profissional ativo no Conselho Regional de Nutricionistas"]],
    ["303", "Assistente Social", "Ensino superior completo em Serviço Social", 3, 4720, "30 horas semanais", 110,
      ["Graduação em Serviço Social", "Registro profissional ativo no Conselho Regional de Serviço Social"]],
    ["304", "Professor de Língua Portuguesa", "Licenciatura em Letras com habilitação em Língua Portuguesa", 6, 4380, "20 horas semanais", 110,
      ["Licenciatura em Letras com habilitação em Língua Portuguesa"]],
    ["305", "Professor de Matemática", "Licenciatura em Matemática", 5, 4380, "20 horas semanais", 110,
      ["Licenciatura plena em Matemática"]]
  ];

  const datas = [
    ["Publicação do edital fictício", "2026-11-23", null, "outro"],
    ["Impugnação do edital", "2026-11-24", "2026-11-26", "recurso"],
    ["Período de inscrições", "2026-12-01", "2026-12-20", "inscricao"],
    ["Solicitação de isenção", "2026-12-01", "2026-12-03", "isencao"],
    ["Resultado preliminar das isenções", "2026-12-07", null, "resultado"],
    ["Recursos contra indeferimento de isenção", "2026-12-08", "2026-12-09", "recurso"],
    ["Resultado definitivo das isenções", "2026-12-11", null, "resultado"],
    ["Último dia para pagamento", "2026-12-22", null, "pagamento"],
    ["Homologação preliminar das inscrições", "2026-12-29", null, "resultado"],
    ["Divulgação dos locais de prova", "2027-01-18", null, "outro"],
    ["Prova objetiva", "2027-01-24", null, "prova"],
    ["Prova prática de Motorista", "2027-01-31", null, "prova"],
    ["Resultado final e homologação", "2027-02-19", null, "resultado"]
  ];

  const nomes = Object.fromEntries(
    cargos.map(c => [c[0], c[1]])
  );

  function materia(nome, codigos, topicos, pagina) {
    return {
      disciplina: nome,
      cargos: codigos === "TODOS"
        ? ["TODOS"]
        : codigos.split(",").map(c => nomes[c.trim()]),
      topicos: topicos.split(";").map(t => t.trim()).filter(Boolean),
      pagina
    };
  }

  const conteudo = [
    materia(
      "Língua Portuguesa",
      "TODOS",
      "Compreensão e interpretação de textos; Tipologia e gêneros textuais; Ortografia oficial e acentuação gráfica; Classes gramaticais; Concordância verbal e nominal; Regência verbal e nominal; Emprego da crase; Pontuação; Coesão e coerência textual; Semântica, sinônimos e antônimos",
      10
    ),

    materia(
      "Matemática e Raciocínio Lógico",
      "101,102,201,202,203,205",
      "Operações com números naturais, inteiros e decimais; Frações e números racionais; Razões e proporções; Regra de três simples e composta; Porcentagem e juros simples; Equações do primeiro grau; Sequências numéricas; Problemas de lógica; Leitura e interpretação de gráficos; Medidas de tempo, comprimento e capacidade",
      10
    ),

    materia(
      "Informática Básica",
      "201,202,203,205,301,304,305",
      "Conceitos básicos de hardware e software; Sistemas operacionais Windows e Linux; Organização de arquivos e pastas; Editores de texto; Planilhas eletrônicas; Navegadores e mecanismos de busca; Correio eletrônico; Segurança da informação; Senhas e autenticação; Armazenamento em nuvem",
      10
    ),

    materia(
      "Legislação e Administração Pública",
      "201,202,205,301,302,303,304,305",
      "Princípios constitucionais da Administração Pública; Direitos e garantias fundamentais; Ética no serviço público; Atendimento ao cidadão; Transparência administrativa; Noções de Lei de Acesso à Informação; Noções da Lei Geral de Proteção de Dados; Responsabilidade funcional; Organização administrativa municipal; Direitos e deveres dos servidores públicos",
      11
    ),

    materia(
      "Conhecimentos Gerais do Piauí e de Teresina",
      "TODOS",
      "História do Estado do Piauí; Formação histórica da cidade de Teresina; Geografia do Piauí; Características dos rios Parnaíba e Poti; Aspectos econômicos e sociais de Teresina; Cultura, manifestações artísticas e tradições piauienses; Meio ambiente e desenvolvimento sustentável; Problemas urbanos e mobilidade; Organização político-administrativa dos municípios; Atualidades relacionadas à educação, saúde e cidadania",
      11
    ),

    materia(
      "Conhecimentos Específicos",
      "101",
      "Técnicas de limpeza de ambientes; Organização de materiais de trabalho; Conservação de equipamentos; Coleta seletiva de resíduos; Equipamentos de proteção individual; Prevenção de acidentes; Higienização de instalações sanitárias; Noções de segurança no trabalho",
      11
    ),

    materia(
      "Conhecimentos Específicos",
      "102",
      "Legislação brasileira de trânsito; Direção defensiva; Sinalização de trânsito; Transporte seguro de escolares; Primeiros socorros; Mecânica básica; Inspeção preventiva de veículos; Normas de embarque e desembarque; Documentação obrigatória do condutor e do veículo; Condução em condições adversas",
      12
    ),

    materia(
      "Conhecimentos Específicos",
      "201",
      "Rotinas administrativas; Protocolo e arquivamento; Redação oficial; Atendimento ao público; Gestão documental; Organização de reuniões; Controle de materiais; Elaboração de relatórios; Comunicação institucional; Noções de administração pública",
      12
    ),

    materia(
      "Conhecimentos Específicos",
      "202",
      "Organização do ambiente escolar; Relações interpessoais na escola; Proteção e segurança dos estudantes; Noções do Estatuto da Criança e do Adolescente; Educação inclusiva; Mediação de conflitos; Rotinas administrativas escolares; Primeiros socorros no ambiente escolar; Atendimento às famílias; Ética e sigilo profissional",
      12
    ),

    materia(
      "Conhecimentos Específicos",
      "203",
      "Arquitetura de computadores; Manutenção preventiva e corretiva; Sistemas operacionais; Redes TCP/IP; Configuração de roteadores e switches; Cabeamento estruturado; Diagnóstico de falhas; Backup e recuperação de dados; Segurança da informação; Suporte técnico e atendimento a usuários; Virtualização de sistemas; Noções de bancos de dados",
      13
    ),

    materia(
      "Conhecimentos Específicos",
      "204",
      "Fundamentos de enfermagem; Biossegurança; Administração de medicamentos; Verificação de sinais vitais; Higienização e prevenção de infecções; Ética profissional em enfermagem; Atendimento em situações de urgência; Saúde da criança e do adolescente; Saúde da mulher; Atenção primária à saúde; Vacinação e imunização; Registros e procedimentos de enfermagem",
      13
    ),

    materia(
      "Conhecimentos Específicos",
      "205",
      "Noções de fiscalização administrativa; Ocupação e conservação de espaços públicos; Limpeza urbana; Gestão de resíduos sólidos; Elaboração de autos e relatórios; Atendimento e orientação ao cidadão; Ética na fiscalização; Meio ambiente urbano; Acessibilidade em espaços públicos; Noções de poder de polícia administrativa",
      13
    ),

    materia(
      "Conhecimentos Específicos",
      "301",
      "Lógica de programação; Algoritmos e estruturas de dados; Programação orientada a objetos; JavaScript e Python; Banco de dados SQL; Modelagem de sistemas; Engenharia de software; Arquitetura de aplicações; APIs REST; Controle de versões com Git; Testes de software; Segurança de aplicações; Computação em nuvem; Metodologias ágeis",
      14
    ),

    materia(
      "Conhecimentos Específicos",
      "302",
      "Avaliação nutricional; Nutrição nas diferentes fases da vida; Alimentação escolar; Planejamento de cardápios; Segurança alimentar e nutricional; Boas práticas de manipulação de alimentos; Controle higiênico-sanitário; Educação alimentar e nutricional; Dietoterapia; Ética profissional; Vigilância nutricional; Programas de alimentação coletiva",
      14
    ),

    materia(
      "Conhecimentos Específicos",
      "303",
      "Fundamentos históricos do Serviço Social; Código de Ética profissional; Política Nacional de Assistência Social; Sistema Único de Assistência Social; Proteção social básica e especial; Atuação em CRAS e CREAS; Direitos da criança e do adolescente; Direitos da pessoa idosa; Elaboração de estudos e pareceres sociais; Trabalho interdisciplinar; Atendimento a famílias em vulnerabilidade; Direitos humanos e cidadania",
      14
    ),

    materia(
      "Conhecimentos Específicos",
      "304",
      "Linguística e ensino de língua materna; Fonética e fonologia; Morfologia; Sintaxe; Semântica e pragmática; Literatura brasileira; Literatura piauiense; Leitura e produção de textos; Gêneros discursivos; Avaliação da aprendizagem; Didática de Língua Portuguesa; Base Nacional Comum Curricular; Educação inclusiva; Planejamento pedagógico",
      15
    ),

    materia(
      "Conhecimentos Específicos",
      "305",
      "Conjuntos numéricos; Álgebra elementar; Funções e gráficos; Equações e inequações; Geometria plana; Geometria espacial; Trigonometria; Estatística; Probabilidade; Matemática financeira; Resolução de problemas; Didática da Matemática; Base Nacional Comum Curricular; Avaliação da aprendizagem",
      15
    )
  ];

  window.DEMO_TERESINA = {
    concurso: {
      nome: "Processo Seletivo Simplificado nº 007/2026 — Teresina (fictício)",
      orgao: "Secretaria Municipal Fictícia de Gestão e Serviços Públicos — Teresina/PI",
      banca: "Instituto Experimental de Seleção do Piauí (IESP-SIM)",
      tipo: "processo seletivo",
      edital: "007/2026",
      resumo: "Demonstração acadêmica baseada em edital fictício de Teresina. Não representa seleção pública real."
    },

    datas: datas.map(d => ({
      evento: d[0],
      data_inicio: d[1],
      data_fim: d[2],
      categoria: d[3],
      observacao: "",
      pagina: 9
    })),

    cargos: cargos.map(c => ({
      codigo: c[0],
      nome: c[1],
      escolaridade: c[2],
      vagas_imediatas: c[3],
      vagas_reserva: "CR",
      salario: c[4],
      carga_horaria: c[5],
      taxa: c[6],
      requisitos: c[7],
      lotacao: "Unidades municipais fictícias de Teresina/PI",
      atribuicoes: "",
      pagina: 2
    })),

    conteudo,

    alertas: [
      "DEMONSTRAÇÃO: os dados foram preparados previamente, sem análise em tempo real com Gemini.",
      "Este edital é fictício e não corresponde a um processo seletivo real da Prefeitura de Teresina."
    ]
  };

})();