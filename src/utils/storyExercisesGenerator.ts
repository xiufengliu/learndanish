import { withGenAIClient } from './genAIClient';

export type AIStoryExerciseType = 'translation' | 'cloze' | 'preposition' | 'comprehension';

export interface AIStoryExerciseOption {
  label: string;
  isCorrect: boolean;
  explanation: string;
}

export interface AIStoryExercise {
  id?: string;
  type: AIStoryExerciseType;
  prompt: string;
  body?: string;
  danishContext?: string;
  difficulty?: number;
  options: AIStoryExerciseOption[];
}

function formatSentenceList(sentences: string[]): string {
  return sentences
    .map((sentence, index) => `${index + 1}. ${sentence}`)
    .join('\n');
}

export async function generateAIStoryExercises(
  danishSentences: string[],
  englishSentences: string[],
  audienceLanguage: 'english' | 'chinese'
): Promise<AIStoryExercise[]> {
  const translationLanguage = audienceLanguage === 'chinese' ? 'Simplified Chinese (简体中文)' : 'English';

  const prompt = `
You are an experienced Danish language instructor. Design 10 multiple-choice practice questions based on the following story.

Story (Danish):
${formatSentenceList(danishSentences)}

Story (${translationLanguage} translation):
${formatSentenceList(englishSentences)}

Requirements:
- Produce exactly 10 questions.
- At least 5 questions must have "type": "comprehension" and should check reading comprehension, event order, inference, or interpretation.
- The remaining questions may be "translation", "cloze", or "preposition". Do not invent other types.
- Each question must have exactly 4 answer options. Only one option is correct.
- Provide a short explanation for every option to give immediate feedback.
- All question prompts, option texts, and explanations must be written in ${translationLanguage}.
- Include a relevant Danish sentence or excerpt in "danishContext" to anchor the question. Use Danish there.
- When type is "cloze", place the gap in the "body" field using "_____" and keep the prompt concise.
- Use boolean true/false (not strings) for "isCorrect".
- Make IDs unique (q1, q2, ...).

Output strictly as a JSON array that matches this schema:
[
  {
    "id": "q1",
    "type": "comprehension" | "translation" | "cloze" | "preposition",
    "prompt": "Question in ${translationLanguage}",
    "body": "Optional extra text such as a sentence with a blank",
    "danishContext": "Relevant Danish text",
    "options": [
      {
        "label": "Answer choice in ${translationLanguage}",
        "isCorrect": true | false,
        "explanation": "Feedback in ${translationLanguage}"
      },
      ...
    ],
    "difficulty": 1 | 2 | 3 | 4 | 5
  }
]

Return only the JSON array, without markdown fences.
`.trim();

  const response = await withGenAIClient(client =>
    client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    })
  );

  const text = response.text.trim();

  let jsonText = text;
  if (text.includes('```json')) {
    jsonText = text.split('```json')[1].split('```')[0].trim();
  } else if (text.includes('```')) {
    jsonText = text.split('```')[1].split('```')[0].trim();
  }

  const parsed = JSON.parse(jsonText) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('Gemini response is not an array');
  }

  const validTypes: AIStoryExerciseType[] = ['translation', 'cloze', 'preposition', 'comprehension'];

  const normalized: AIStoryExercise[] = parsed
    .map((item, index) => {
      const question = item as Partial<AIStoryExercise>;

      if (!question.prompt || !question.options || !Array.isArray(question.options)) {
        return null;
      }

      const type = (question.type as AIStoryExerciseType) ?? 'comprehension';
      if (!validTypes.includes(type)) {
        return null;
      }

      const options = question.options
        .map(option => ({
          label: option.label ?? '',
          isCorrect: Boolean(option.isCorrect),
          explanation: option.explanation ?? ''
        }))
        .filter(option => option.label && option.explanation);

      const correctCount = options.filter(option => option.isCorrect).length;
      if (options.length !== 4 || correctCount !== 1) {
        return null;
      }

      return {
        id: question.id ?? `ai-q${index + 1}`,
        type,
        prompt: question.prompt,
        body: question.body,
        danishContext: question.danishContext,
        options,
        difficulty: question.difficulty
      };
    })
    .filter((question): question is AIStoryExercise => question !== null);

  return normalized;
}
