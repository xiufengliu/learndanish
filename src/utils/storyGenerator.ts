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
  // Map app levels to PD test levels
  const levelToPD = {
    beginner: 'PD1',
    intermediate: 'PD2',
    advanced: 'PD3'
  } as const;

  // PD-aligned guidance for reading passages
  const difficultyDescriptions = {
    beginner: `PD1 (Prøve i Dansk 1). Very simple, concrete everyday Danish with short main clauses, mostly present tense, and high-frequency words. Avoid idioms.`,
    intermediate: `PD2 (Prøve i Dansk 2, ~CEFR B1). Connected everyday Danish covering work, society, and practical tasks. Allow past/future tenses, a few subordinate clauses, and modal verbs.`,
    advanced: `PD3 (upper B2). Longer, exam-style reading text suitable for test preparation with some abstraction, cause–effect reasoning, and varied sentence structures. Include 1–2 short quotes or reported speech when natural.`
  } as const;

  const lengthGuidance = {
    beginner: 'Length target: about 80–120 words (7–10 short sentences).',
    intermediate: 'Length target: about 150–220 words (10–14 sentences).',
    advanced: 'Length target: about 250–350 words (12–18 sentences).'
  } as const;

  const domainGuidance = {
    beginner: 'Contexts: shopping, public transport, simple appointments, family, housing, school messages.',
    intermediate: 'Contexts: community services, workplace situations, municipal information, volunteering, daily coordination.',
    advanced: 'Contexts: civic topics, culture, education, sustainability, work practices, societal debates.'
  } as const;

  const translationLanguage = audienceLanguage === 'chinese' ? 'Simplified Chinese (简体中文)' : 'English';
  const translationField = audienceLanguage === 'chinese' ? 'chineseTranslation' : 'englishTranslation';

  // Use “reading passage” and explicitly reference PD levels
  const prompt = `You are a Danish language teacher preparing an exam-style reading passage and follow-up questions.

Create ONE Danish reading passage that matches ${levelToPD[difficultyLevel]} level and test style:
- Level guidance: ${difficultyDescriptions[difficultyLevel]}
- ${lengthGuidance[difficultyLevel]}
- Typical domains: ${domainGuidance[difficultyLevel]}
- Tone: neutral, informative, realistic, and suitable for test preparation (no slang, no humor-only pieces).
- Provide a complete, sentence-aligned translation in ${translationLanguage} after the Danish text.

Then create TEN multiple-choice questions aligned with PD reading tasks:
- Include at least 5 "comprehension" questions (main idea, detail, inference, sequence, cause/effect).
- The remaining may be "translation", "cloze", or "preposition".
- Each question must have exactly 4 options with a single correct answer.
- Provide brief feedback explanations for each option.
- For "translation" questions, use ${translationLanguage} for prompt/options/explanations.
- For other types, keep prompt/options/explanations in Danish.
- Always set "danishContext" to the exact Danish sentence/excerpt from the passage that the question references.
- For cloze, provide the gapped sentence in "body" using "_____".
- Assign a numeric difficulty 1–5.

Return ONLY a JSON object with this exact structure:
{
  "danishText": "...\\n...",
  "${translationField}": "...\\n...",
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
