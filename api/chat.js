const Anthropic = require('@anthropic-ai/sdk');

const VOX_COACH_CONTEXT = `
Você é o Coach de Vendas da Vox2You — a maior Rede de Escolas de Oratória da América Latina.
Você treina SDRs para marcar consultorias usando o roteiro de 7 etapas da Vox.

CURSOS:
- Intensivox: R$2.600 (imersivo, fim de semana) — matrícula R$130 + material R$269 + curso R$2.201
- Master: R$7.800 (12 aulas, sábados)
- Academy: R$9.800 (aulas terças-feiras)

ROTEIRO SDR — 7 ETAPAS:
1. ABERTURA: Apresentação + permissão para falar
2. RAPPORT/INDICAÇÃO: Mencionar indicador ou criar conexão emocional genuína
3. QUALIFICAÇÃO: Descobrir profissão, contexto, rotina
4. DOR & SPIN: Ansiedade em apresentações, resultados perdidos, nota 1-10 na comunicação
5. APRESENTAÇÃO VOX: 90 mil alunos, método presencial prático, resultados reais
6. MARCAÇÃO: Consultoria de 20-40 min com DUPLA OPÇÃO de horário fechada
7. ASSENTAMENTO: Confirmar compromisso firme, "travei minha agenda, posso contar com você?"
`;

const buildProspectSystem = (name, prof, type, sdrName) => {
  const sdr = sdrName || 'SDR';
  const backstories = {
    referido: `Você é ${name}, ${prof}. Tem 34 anos, é casada, tem 2 filhos. Uma amiga sua (que fez o curso da Vox) pediu que uma consultora ligasse para você. Você lembra vagamente, mas estava curiosa. Você tem dificuldade em falar em público — nas reuniões do trabalho, sente que suas ideias saem melhores na sua cabeça do que na hora de falar. Já perdeu uma promoção porque outro colega "se vendeu melhor". Isso te incomoda, mas você nunca parou para resolver. Você está no trabalho, um pouco ocupada, mas pode dar 5 minutos.`,
    frio: `Você é ${name}, ${prof}. Tem 40 anos. Recebeu uma ligação inesperada — desconfiada no início, acha que é telemarketing. Mas é educada. Você tem um negócio próprio há 3 anos e sente que precisa melhorar sua comunicação para fechar mais clientes — seus concorrentes falam melhor, parecem mais confiantes. Nunca investiu em treinamento pessoal, acha caro e não sabe se funciona. Vai ceder só se a SDR for muito genuína e não parecer vendedora.`,
    resistente: `Você é ${name}, ${prof}. Tem 38 anos. Foi indicado(a), mas você é cético(a) com cursos. Já fez um curso de vendas que não serviu pra nada. Você tem pouco tempo, está entre reuniões, e antipatia imediata a qualquer coisa que pareça pitch de vendas. Se a SDR for robótica ou forçada, você desliga. Mas se ela for humana, direta e não tentar te vender logo de cara, você dá uma chance.`,
    ocupado: `Você é ${name}, ${prof}. Atendeu correndo — tem reunião em 10 minutos. Você é cordial mas impaciente. Fala rápido, quer respostas diretas. Se não capturar sua atenção em 20 segundos, você diz "olha, não é o momento certo" e desliga. Mas se a SDR for certeira e tocar num ponto real seu (você tem medo de falar mal em apresentações importantes), você para e ouve.`
  };

  return `${backstories[type] || backstories.referido}

A SDR que está ligando para você se chama ${sdr}.

COMO SE COMPORTAR:
- Você é uma pessoa REAL, não um personagem de teatro. Reaja de forma natural e imprevisível.
- Use linguagem informal brasileira: "Ah tá...", "Hmm, entendi.", "Mas peraí...", "Nossa, é caro né?", "Deixa eu ver..."
- LEMBRE-SE de tudo que foi dito na conversa. Se a SDR mencionou seu nome antes, você já sabe. Se ela se apresentou como ${sdr}, você sabe quem é.
- Reaja ao TOM da SDR: se ela soar robótica ou com script, fique mais fechado(a). Se ela soar genuína e humana, abra mais.
- Faça perguntas de volta às vezes: "Mas como funciona isso?", "Quanto tempo dura?", "É presencial onde?"
- Tenha objeções reais: tempo, dinheiro, marido/esposa que precisa saber, "já tentei isso antes", "não sei se é pra mim"
- Se a SDR criar urgência de forma forçada, resista. Se ela criar urgência de forma genuína, sinta o peso.
- Quando aquecer na conversa, demonstre isso: "Olha, na verdade isso que você falou faz sentido pra mim..."
- NUNCA facilite demais. A SDR precisa trabalhar para chegar na marcação.
- Responda em 1-3 frases naturais. Não use bullet points, não seja formal.`;
};

const buildFeedbackSystem = (sdrName, sdrWeakPoints) => {
  const sdr = sdrName || 'a SDR';
  const weakSection = sdrWeakPoints
    ? `\n\nPERFIL DO SDR EM TREINO (${sdr}):\n${sdrWeakPoints}\nLeve em conta este perfil ao dar feedback — reforce os pontos de atenção específicos desta pessoa.`
    : '';

  return `${VOX_COACH_CONTEXT}
${weakSection}

Você está avaliando uma sessão de treino de um(a) SDR da Vox2You chamado(a) ${sdr}.
Seja um coach exigente mas que acredita no potencial desta pessoa.
Dê feedback ESPECÍFICO baseado nas etapas que foram executadas ou não.
Formato: o que foi bem (cite o que foi feito), o que faltou (seja direto), e 1 dica prática e concreta para a próxima ligação.
Máximo 6 linhas. Em português brasileiro, tom de coach. Dirija-se ao(à) SDR pelo nome.`;
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { mode, messages, prospectName, prospectProf, prospectType, sdrName, sdrWeakPoints } = req.body;

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key não configurada. Configure ANTHROPIC_API_KEY no Vercel.' });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let systemPrompt;
    let maxTokens = 300;
    const model = 'claude-sonnet-4-6';

    if (mode === 'prospect') {
      systemPrompt = buildProspectSystem(
        prospectName || 'Ana',
        prospectProf || 'profissional',
        prospectType || 'referido',
        sdrName || 'SDR'
      );
    } else if (mode === 'feedback') {
      systemPrompt = buildFeedbackSystem(sdrName || null, sdrWeakPoints || null);
      maxTokens = 500;
    } else {
      return res.status(400).json({ error: 'Modo inválido' });
    }

    // Garantir alternância correta user/assistant
    const formattedMessages = (messages || []).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    const validMessages = [];
    let lastRole = null;
    for (const m of formattedMessages) {
      if (m.role !== lastRole) {
        validMessages.push(m);
        lastRole = m.role;
      }
    }

    if (validMessages.length === 0 || validMessages[validMessages.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'Histórico de mensagens inválido.' });
    }

    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: validMessages
    });

    res.json({ content: response.content[0].text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao chamar Claude API: ' + err.message });
  }
};
