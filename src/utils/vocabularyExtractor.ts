// Vocabulary extraction from conversations using AI

import { GoogleGenAI } from "@google/genai";
import { VocabularyWord } from '../types/vocabulary';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

interface ExtractedWord {
  danishWord: string;
  englishTranslation: string;
  partOfSpeech?: string;
}

export async function extractVocabularyFromMessage(
  message: string,
  context: string
): Promise<Omit<VocabularyWord, 'id' | 'firstEncountered' | 'lastPracticed' | 'practiceCount' | 'proficiencyLevel' | 'srsData'>[]> {
  try {
    const prompt = `
Extract key Danish vocabulary words from the following message. 
Return a JSON array of objects with this structure:
{
  "words": [
    {
      "danishWord": "word in Danish",
      "englishTranslation": "English translation",
      "partOfSpeech": "noun|verb|adjective|adverb|etc"
    }
  ]
}

Only extract important vocabulary words (nouns, verbs, adjectives, adverbs).
Skip common words like "og", "er", "det", "en", "at", etc.
Limit to 5 most important words.

Message: "${message}"
Context: "${context}"
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    const text = response.text.trim();
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text;
    if (text.includes('```json')) {
      jsonText = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      jsonText = text.split('```')[1].split('```')[0].trim();
    }

    const parsed = JSON.parse(jsonText);
    const words = parsed.words || [];

    return words.map((word: ExtractedWord) => ({
      danishWord: word.danishWord,
      englishTranslation: word.englishTranslation,
      context: message,
      partOfSpeech: word.partOfSpeech
    }));
  } catch (error) {
    console.error('Failed to extract vocabulary:', error);
    return [];
  }
}

export function generateVocabularyId(danishWord: string): string {
  return `vocab_${danishWord.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
}
