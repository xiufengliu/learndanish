import { withGenAIClient } from './genAIClient';
import type { Story, StoryExplanation } from '../types/story';
import type { ExerciseQuestion, ExerciseQuestionType } from '../types/exercise';

const EXERCISE_TYPES: ExerciseQuestionType[] = ['translation', 'cloze', 'preposition', 'comprehension'];

function sentenceTokens(sentence: string | undefined): string[] {
  if (!sentence) {
    return [];
  }
  return sentence.split(/\s+/).filter(Boolean);
}

function extractJsonPayload(text: string): any {
  let jsonText = text.trim();
  if (jsonText.includes('```json')) {
    jsonText = jsonText.split('```json')[1].split('```')[0].trim();
  } else if (jsonText.includes('```')) {
    jsonText = jsonText.split('```')[1].split('```')[0].trim();
  }
  return JSON.parse(jsonText);
}

function normalizeExercises(rawExercises: unknown, audienceLanguage: 'english' | 'chinese'): ExerciseQuestion[] {
  if (!Array.isArray(rawExercises)) {
    return [];
  }

  return rawExercises
    .map((item, index) => {
      const exercise = item as Record<string, unknown>;

      const prompt = typeof exercise.prompt === 'string' ? exercise.prompt.trim() : '';
      const options = Array.isArray(exercise.options) ? exercise.options : [];
      const type = exercise.type as ExerciseQuestionType;

      if (!prompt || !options || options.length !== 4 || !EXERCISE_TYPES.includes(type)) {
        return null;
      }

      const normalizedOptions = options
        .map((option, optionIndex) => {
          const optionRecord = option as Record<string, unknown>;
          const label = typeof optionRecord.label === 'string' ? optionRecord.label.trim() : '';
          const explanation = typeof optionRecord.explanation === 'string' ? optionRecord.explanation.trim() : '';
          const isCorrect = Boolean(optionRecord.isCorrect);

          if (!label || !explanation) {
            return null;
          }

          return {
            label,
            explanation,
            isCorrect,
            id: `${exercise.id ?? `ai-${index + 1}`}-opt-${optionIndex + 1}`
          };
        })
        .filter((option): option is { label: string; explanation: string; isCorrect: boolean; id: string } => option !== null);

      const correctCount = normalizedOptions.filter(option => option.isCorrect).length;
      if (normalizedOptions.length !== 4 || correctCount !== 1) {
        return null;
      }

      const danishSentence = typeof exercise.danishContext === 'string'
        ? exercise.danishContext.trim()
        : typeof exercise.danishSentence === 'string'
        ? (exercise.danishSentence as string).trim()
        : '';

      const body = typeof exercise.body === 'string' ? exercise.body.trim() : undefined;
      const difficultyScore = typeof exercise.difficulty === 'number'
        ? exercise.difficulty
        : Math.max(1, sentenceTokens(danishSentence).length);

      return {
        id: typeof exercise.id === 'string' ? exercise.id : `ai-${index + 1}`,
        type,
        prompt,
        body,
        danishSentence,
        options: normalizedOptions.map(({ id, ...rest }) => rest),
        difficultyScore
      } satisfies ExerciseQuestion;
    })
    .filter((exercise): exercise is ExerciseQuestion => exercise !== null);
}

export async function generateStory(
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced',
  audienceLanguage: 'english' | 'chinese' = 'english'
): Promise<Story> {
  const difficultyDescriptions = {
    beginner: `Align with the goals of PD1 (Prøve i Dansk 1). Use simple present-tense sentences, signage-level vocabulary, and everyday routines such as shopping, transportation, family life, or appointments. Assume the reader is new to Latin script and highlight clear, concrete actions and observable details.`,
    intermediate: `Match PD2 (Prøve i Dansk 2, CEFR B1). Use connected discourse about community life, work, civic participation, or practical problem-solving. Include a mix of past and future tenses, modal verbs, short subordinate clauses, and realistic communication tasks (e.g., writing a short email, arranging services).`,
    advanced: `Aim for PD3 / Studieprøven level (upper B2 to C1). Deliver a longer narrative or analytical piece that could appear in a feature article, academic preparation text, or professional briefing. Incorporate abstract reflections, cause-and-effect reasoning, nuanced vocabulary (including idioms), and at least one short quote or reported speech segment.`
  } as const;

  const difficultyTopics = {
    beginner: 'Pick a setting such as grocery shopping, visiting a doctor, taking the bus, or meeting a neighbour. Keep the tone friendly and supportive.',
    intermediate: 'Choose a scenario like volunteering in the community, navigating municipal services, balancing work and family, or handling a complex customer-service situation.',
    advanced: 'Select a theme suited to academic or professional discussion—for example sustainability policy, cultural debates, healthcare innovation, workplace leadership, or university life.'
  } as const;

  const translationLanguage = audienceLanguage === 'chinese' ? 'Simplified Chinese (简体中文)' : 'English';
  const translationField = audienceLanguage === 'chinese' ? 'chineseTranslation' : 'englishTranslation';

  const prompt = `You are an expert Danish language teacher. Create a short Danish story and ten follow-up exercises. Follow these requirements:

Story requirements:
- Difficulty guidance: ${difficultyDescriptions[difficultyLevel]}
- Scenario inspiration: ${difficultyTopics[difficultyLevel]}
- Length: 7-10 sentences.
- Include engaging content and, when natural, a cultural touch.
- Provide the full translation in ${translationLanguage}, aligning sentence-by-sentence with the Danish text.

Exercise requirements:
- Produce exactly 10 multiple-choice questions.
- At least 5 questions must be of type "comprehension" that test story understanding (sequence of events, cause/effect, inference, main idea, etc.).
- Remaining questions may be "translation", "cloze", or "preposition". Do not invent other types.
- Every question must have exactly 4 answer options with one correct choice.
- Provide a short explanation for each option to give feedback (in the same language used for that option).
- For "translation" questions, write the prompt, answer choices, and explanations in ${translationLanguage} so the learner can choose the correct translation.
- For "comprehension", "cloze", and "preposition" questions, keep the prompt, answer choices, and explanations entirely in Danish.
- Always populate "danishContext" with the exact Danish sentence or excerpt from the story that the question is based on.
- For cloze questions, output the gapped sentence in the "body" field using "_____".
- Assign a difficulty between 1 and 5 (higher = harder).

Return ONLY a JSON object with this exact structure:
{
  "danishText": "...\n...",
  "${translationField}": "...\n...",
  "exercises": [
    {
      "id": "q1",
      "type": "translation" | "cloze" | "preposition" | "comprehension",
      "prompt": "Question text",
      "body": "Optional extra text",
      "danishContext": "Relevant Danish sentence",
      "options": [
        { "label": "option A", "isCorrect": true|false, "explanation": "feedback" },
        { "label": "option B", "isCorrect": true|false, "explanation": "feedback" },
        { "label": "option C", "isCorrect": true|false, "explanation": "feedback" },
        { "label": "option D", "isCorrect": true|false, "explanation": "feedback" }
      ],
      "difficulty": 1
    }
  ]
}`;

  try {
    const response = await withGenAIClient(client =>
      client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      })
    );

    const parsedResponse = extractJsonPayload(response.text ?? '');
    const danishText = parsedResponse.danishText;
    const translation = parsedResponse[translationField];
    const exercises = normalizeExercises(parsedResponse.exercises, audienceLanguage);

    if (typeof danishText !== 'string' || typeof translation !== 'string') {
      throw new Error('Gemini response missing story text or translation.');
    }

    return {
      id: `story-${Date.now()}`,
      danishText,
      englishTranslation: translation,
      difficultyLevel,
      timestamp: new Date(),
      exercises
    };
  } catch (error) {
    console.error('Error generating story:', error);
    // Re-throw with original error details
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to generate story: ${String(error)}`);
  }
}

export async function generateStoryExplanation(
  danishText: string,
  audienceLanguage: 'english' | 'chinese' = 'english'
): Promise<StoryExplanation[]> {
  const translationLanguage = audienceLanguage === 'chinese' ? 'Simplified Chinese (简体中文)' : 'English';
  
  const prompt = `Analyze this Danish text sentence by sentence and provide detailed grammar explanations in ${translationLanguage}.

Danish text:
${danishText}

For each sentence, provide:
1. The Danish sentence
2. ${translationLanguage} translation
3. Grammar points explaining in ${translationLanguage}:
   - Verb usage (tense, form, conjugation)
   - Noun usage (gender, definiteness, plural)
   - Sentence structure and word order
   - Important grammar rules applied
   - Any other relevant grammatical features

Format your response as a JSON array with this structure:
[
  {
    "sentence": "Danish sentence",
    "translation": "${translationLanguage} translation",
    "grammarPoints": [
      {
        "type": "verb|noun|tense|word-order|article|other",
        "description": "Detailed explanation in ${translationLanguage}",
        "example": "Optional example"
      }
    ]
  }
]

Important: Return ONLY the JSON array, no other text. All explanations and translations must be in ${translationLanguage}.`;

  try {
    const response = await withGenAIClient(client =>
      client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      })
    );

    const parsedResponse = extractJsonPayload(response.text ?? '');
    return parsedResponse;
  } catch (error) {
    console.error('Error generating explanation:', error);
    // Re-throw with original error details
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to generate explanation: ${String(error)}`);
  }
}
