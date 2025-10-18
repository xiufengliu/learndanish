// Generate example sentences for vocabulary words

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export async function generateExampleSentences(
  danishWord: string,
  englishTranslation: string,
  partOfSpeech?: string
): Promise<string[]> {
  try {
    const prompt = `
Generate 4-5 diverse example sentences using the Danish word "${danishWord}" (${englishTranslation}).
${partOfSpeech ? `Part of speech: ${partOfSpeech}` : ''}

Requirements:
- Use different contexts (formal, informal, questions, statements)
- Show different tenses if it's a verb
- Vary sentence complexity (simple to intermediate)
- Make them practical and useful for learners
- Include the English translation after each Danish sentence

Return a JSON object:
{
  "sentences": [
    {
      "danish": "Danish sentence here",
      "english": "English translation here"
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    const text = response.text.trim();
    
    // Extract JSON from response
    let jsonText = text;
    if (text.includes('```json')) {
      jsonText = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      jsonText = text.split('```')[1].split('```')[0].trim();
    }

    const parsed = JSON.parse(jsonText);
    const sentences = parsed.sentences || [];
    
    // Format as "Danish sentence - English translation"
    return sentences.map((s: any) => `${s.danish} - ${s.english}`);
  } catch (error) {
    console.error('Failed to generate example sentences:', error);
    return [];
  }
}

export async function generateCulturalNote(
  danishWord: string,
  englishTranslation: string
): Promise<string | null> {
  try {
    const prompt = `
Analyze if the Danish word/phrase "${danishWord}" (${englishTranslation}) has any interesting cultural context, idioms, or usage notes that would help an English speaker understand Danish culture better.

Consider:
- Is this word culturally significant in Denmark?
- Are there idioms or expressions using this word?
- Does it have nuances that don't translate directly?
- Are there customs or social contexts related to this word?
- Does it reflect something unique about Danish culture?

If there IS interesting cultural context, return a JSON object:
{
  "hasCulturalNote": true,
  "note": "2-3 sentences explaining the cultural context"
}

If there is NO significant cultural context (just a regular everyday word), return:
{
  "hasCulturalNote": false
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    const text = response.text.trim();
    
    // Extract JSON from response
    let jsonText = text;
    if (text.includes('```json')) {
      jsonText = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      jsonText = text.split('```')[1].split('```')[0].trim();
    }

    const parsed = JSON.parse(jsonText);
    
    if (parsed.hasCulturalNote && parsed.note) {
      return parsed.note;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to generate cultural note:', error);
    return null;
  }
}

export async function generateGrammaticalForms(
  danishWord: string,
  englishTranslation: string,
  partOfSpeech?: string
): Promise<any | null> {
  try {
    const prompt = `
Analyze the Danish word "${danishWord}" (${englishTranslation}) and provide its grammatical forms.
${partOfSpeech ? `Part of speech: ${partOfSpeech}` : ''}

Based on the word type, provide the appropriate forms:

FOR VERBS, return:
{
  "hasGrammaticalForms": true,
  "forms": {
    "infinitive": "at [verb]",
    "present": "present tense form",
    "past": "past tense form",
    "presentPerfect": "har/er + past participle",
    "imperative": "imperative form"
  }
}

FOR NOUNS, return:
{
  "hasGrammaticalForms": true,
  "forms": {
    "singular": "indefinite singular (without article)",
    "plural": "indefinite plural",
    "definite": "definite singular (with -en/-et)",
    "definitePlural": "definite plural",
    "gender": "common" or "neuter"
  }
}

FOR ADJECTIVES, return:
{
  "hasGrammaticalForms": true,
  "forms": {
    "positive": "base form",
    "comparative": "comparative form (-ere)",
    "superlative": "superlative form (-est)"
  }
}

FOR OTHER WORD TYPES (adverbs, prepositions, etc.), return:
{
  "hasGrammaticalForms": false
}

Only provide actual forms that exist. Be accurate with Danish grammar rules.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    const text = response.text.trim();
    
    // Extract JSON from response
    let jsonText = text;
    if (text.includes('```json')) {
      jsonText = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      jsonText = text.split('```')[1].split('```')[0].trim();
    }

    const parsed = JSON.parse(jsonText);
    
    if (parsed.hasGrammaticalForms && parsed.forms) {
      return parsed.forms;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to generate grammatical forms:', error);
    return null;
  }
}
