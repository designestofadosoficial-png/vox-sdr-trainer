const Anthropic = require('@anthropic-ai/sdk');
const bp = (name, prof, type) => {
  const s = {
    referido: name+', '+prof+'. Indicada por amiga que fez Vox. Dificuldade em falar em publico, perdeu promocao por isso. No trabalho, pode dar 5 min.',
        frio: name+', '+prof+'. Ligacao inesperada, desconfiada. Tem negocio proprio, quer melhorar comunicacao.',
        resistente: name+', '+prof+'. Cetica com cursos. Ja fez um que nao serviu. So abre se SDR for muito humana.',
        ocupado: name+', '+prof+'. Reuniao em 10min. Impaciente, quer respostas diretas.'
    };
  return (s[type]||s.referido)+'\n\nVoce e uma pessoa REAL. Use linguagem informal brasileira.\nLEMBRE-SE de tudo que foi dito.\nSe SDR soar robotica, fique fechada. Se genuina, abra.\nFaca perguntas: Como funciona? Quanto custa? E presencial?\nTenha objecoes: tempo, dinheiro, conjuge.\nAo aquecer: Isso que voce falou faz sentido...\nNUNCA facilite. Responda 1-3 frases naturais.';
};
const FB = 'Voce e coach de vendas da Vox2You avaliando treino da SDR Marina. Cite o que foi bem, o que faltou e 1 dica pratica. Max 6 linhas. Portugues informal.';
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  if(req.method!=='POST') return res.status(405).json({error:'not allowed'});
  const {mode,messages,prospectName,prospectProf,prospectType}=req.body;
  if(!process.env.ANTHROPIC_API_KEY) return res.status(500).json({error:'API key missing'});
  try {
    const client=new Anthropic({apiKey:process.env.ANTHROPIC_API_KEY});
    const sys=mode==='prospect'?bp(prospectName||'Ana',prospectProf||'profissional',prospectType||'referido'):mode==='feedback'?FB:null;
    if(!sys) return res.status(400).json({error:'invalid mode'});
    const fmt=(messages||[]).map(m=>({role:m.role==='assistant'?'assistant':'user',content:m.content}));
    const valid=[];let last=null;
    for(const m of fmt){if(m.role!==last){valid.push(m);last=m.role;}}
        if(!valid.length||valid[valid.length-1].role!=='user') return res.status(400).json({error:'invalid history'});
    const r=await client.messages.create({model:'claude-sonnet-4-6',max_tokens:mode==='feedback'?500:300,system:sys,messages:valid});
    res.json({content:r.content[0].text});
} catch(e){res.status(500).json({error:e.message});}
};
