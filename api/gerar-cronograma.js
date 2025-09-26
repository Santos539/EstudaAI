// api/gerar-cronograma.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  const { concurso, materiaDificil, prioridade, disponibilidade } = req.body;

  // Preenche o prompt com os dados do usuário
  const blocosJson = JSON.stringify(disponibilidade);
  const prompt = `
Você é uma IA especialista em vestibulares (ENEM, UERJ e Fuvest). Sua tarefa: 
GERAR UM CRONOGRAMA DE ESTUDOS DETALHADO em JSON, mapeando cada BLOCO DISPONÍVEL para:
- "materia" (ex: "História", "Matemática"),
- "tema" (ex: "Era Vargas", "Equações do 2º grau"),
- "tipo" (uma entre: "teoria", "exercício", "revisão", "redação").

===== INFORMAÇÕES DO ALUNO =====
Concurso: ${concurso}
Matéria de maior dificuldade: ${materiaDificil} (prioridade ${prioridade}%)
Blocos disponíveis (JSON): ${blocosJson}
===============================

REGRAS OBRIGATÓRIAS:
1) Responda APENAS com JSON válido e NADA mais, no formato:
{
  "cronograma": [
    { "dia":"Segunda", "horario":"13:00 - 14:00", "materia":"História", "tema":"Era Vargas", "tipo":"teoria" },
    ...
  ]
}
2) Para cada bloco disponível, preencha um item do array "cronograma". Não deixe blocos sem conteúdo.
3) Priorize a matéria marcada como ${materiaDificil} proporcionalmente (${prioridade}%) na distribuição semanal,
   mas cubra também os demais tópicos do concurso escolhido.
4) Intercale teoria/exercício/revisão/redação conforme apropriado (ex: depois de 2 blocos de teoria, colocar um de exercício).
5) Divida blocos longos em sub-blocos de 50min e adote 10min de intervalo, com status de "descanso" (foi feito no frontend) — use os horários recebidos. 
6) Ao gerar o "tema", use termos específicos (ex: "Fotossíntese", "Revolução Francesa", "Equações do 2º grau").
7) O campo "materia" deve ser o nome da disciplina (ex: "Biologia"), e "tema" um tópico específico dessa disciplina.
8) Não inclua explicações, notas ou texto fora do JSON. SOMENTE o JSON.

===== BASE DE TEMAS POR CONCURSO =====
Se {CONCURSO} for "enem", use preferencialmente os temas abaixo (cubra todos/maioria possível):
-- ENEM (temas por disciplina) --
Linguagens/Português: interpretação de texto, gêneros textuais, coesão/coesão, crase, regência, concordância, variações linguísticas, análise discursiva.
Redação: estrutura dissertativa, proposta de intervenção, temas sociais (meio ambiente, educação, saúde, etc).
Matemática: aritmética, porcentagem, juros, razão e proporção, equações 1º/2º grau, funções (afim, quadrática, exponencial), progressões, probabilidade e estatística, geometria plana/espacial, trigonometria.
História: Brasil Colônia, Brasil Império, República Velha, Era Vargas, Ditadura Militar, temas mundiais (Revolução Francesa, Revolução Industrial, Guerras Mundiais, Guerra Fria).
Geografia: climas, biomas, urbanização, demografia, cartografia, produção agrícola/industrial, meio ambiente e sustentabilidade, geopolítica.
Biologia: citologia, genética, evolução, fisiologia (sistemas), ecologia, fotossíntese, ciclos biogeoquímicos, biomas.
Química: estrutura atômica, tabela periódica, ligações, reações químicas, estequiometria, ácidos e bases, termoquímica, orgânica básica.
Física: cinemática, leis de Newton, energia, trabalho, termodinâmica, óptica, eletricidade, ondulatória.
Filosofia/Sociologia: principais filósofos, teorias sociais, cultura, cidadania, desigualdade.

Se {CONCURSO} for "uerj", foque nos temas e abordagens típicas da UERJ (mais leitura, interpretação e contextualização histórica e social):
-- UERJ (temas por disciplina) --
Português/Linguagens: interpretação avançada, coesão/coerência textual, análise argumentativa, gramática contextualizada.
Literatura: movimentos literários (Romantismo, Realismo, Modernismo), análise de obras tradicionais.
História: Brasil República, Era Vargas, movimentos sociais do século XX, história contemporânea, conjuntura política brasileira.
Geografia: espacialidade urbana, problemas ambientais locais, economia regional, indicadores sociais.
Matemática/Física/Química/Biologia: tópicos clássicos cobrados em provas de vestibular (álgebra, geometria, física mecânica/eletricidade, química inorgânica/orgânica básica, genética/biologia celular).
Redação/UERJ: produção textual com argumentação sólida e referências contextuais.

Se {CONCURSO} for "fuvest", considere o perfil da Fuvest (também exige leitura de obras literárias e temas disciplinares aprofundados):
-- FUVEST (temas por disciplina) --
Literatura: obras frequentemente exigidas (exemplos importantes a considerar: "Memórias Póstumas de Brás Cubas", "Dom Casmurro", "Iracema", "Capitães da Areia", "Vidas Secas", "O Cortiço" e outros clássicos) — faça relação entre obra e época literária.
História: períodos fundamentais e interpretação de textos históricos, Brasil e Mundo moderno/contemporâneo.
Geografia: questões econômicas e ambientais, ocupação territorial, urbanismo.
Matemática, Física, Química, Biologia: tópicos clássicos aprofundados (álgebra, cálculo básico/analítico quando necessário, mecânica, eletromagnetismo, química orgânica e reações, genética).
Redação/Fuvest: coerência, argumentação, domínio do repertório sociocultural.

OBS: as listas acima são amplas e devem ser utilizadas como fonte para gerar temas específicos; adapte a distribuição ao tempo disponível e à prioridade do aluno.

Fim das instruções. Gere agora o JSON solicitado.
`;

  try {
    // Chama a Hugging Face
    const response = await fetch("https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 1000,
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Erro da API:", error);
      return res.status(500).json({ error: "Falha ao gerar cronograma" });
    }

    const data = await response.json();
    // Garante que output seja string
    const output = typeof data === "string"
      ? data
      : data.generated_text || data[0]?.generated_text || "";

    // Tenta extrair JSON válido do output
    let cronogramaJson = null;
    try {
      const jsonStart = output.indexOf('{');
      const jsonEnd = output.lastIndexOf('}') + 1;
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const jsonString = output.slice(jsonStart, jsonEnd);
        cronogramaJson = JSON.parse(jsonString);
      }
    } catch (parseError) {
      console.error("Erro ao fazer parse do JSON:", parseError, "Output:", output);
      return res.status(500).json({ error: "Falha ao interpretar resposta da IA" });
    }

    if (!cronogramaJson) {
      console.error("Resposta inesperada da IA:", output);
      return res.status(500).json({ error: "Resposta da IA não contém JSON válido" });
    }

    return res.status(200).json(cronogramaJson);
  } catch (error) {
    console.error("Erro ao chamar IA:", error);
    return res.status(500).json({ error: "Erro ao processar requisição" });
  }
}
