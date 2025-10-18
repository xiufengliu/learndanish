import { withGenAIClient } from './genAIClient';
import type { Story, StoryExplanation } from '../types/story';

export async function generateStory(difficultyLevel: 'beginner' | 'intermediate' | 'advanced'): Promise<Story> {
  const difficultyDescriptions = {
    beginner: 'very simple vocabulary and basic sentence structures (present tense, simple past)',
    intermediate: 'moderate vocabulary with some compound sentences and various tenses',
    advanced: 'complex vocabulary with sophisticated grammar structures and idiomatic expressions'
  };

  const prompt = `Generate a short Danish story (5-7 sentences) at ${difficultyLevel} level.

Requirements:
- Use ${difficultyDescriptions[difficultyLevel]}
- Make it interesting and engaging
- Include cultural elements when appropriate
- Provide an English translation

Format your response as a JSON object with this structure:
{
  "danishText": "The complete Danish story with each sentence on a new line",
  "englishTranslation": "The complete English translation with each sentence on a new line"
}

Important: Return ONLY the JSON object, no other text.`;

  try {
    const response = await withGenAIClient(client =>
      client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      })
    );

    const text = response.text.trim();
    console.log('Received response from Gemini:', text);
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text;
    if (text.includes('```json')) {
      jsonText = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      jsonText = text.split('```')[1].split('```')[0].trim();
    }
    
    const parsedResponse = JSON.parse(jsonText);
    console.log('Parsed response:', parsedResponse);
    
    return {
      id: `story-${Date.now()}`,
      danishText: parsedResponse.danishText,
      englishTranslation: parsedResponse.englishTranslation,
      difficultyLevel,
      timestamp: new Date()
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

export async function generateStoryExplanation(danishText: string): Promise<StoryExplanation[]> {
  const prompt = `Analyze this Danish text sentence by sentence and provide detailed grammar explanations.

Danish text:
${danishText}

For each sentence, provide:
1. The Danish sentence
2. English translation
3. Grammar points explaining:
   - Verb usage (tense, form, conjugation)
   - Noun usage (gender, definiteness, plural)
   - Sentence structure and word order
   - Important grammar rules applied
   - Any other relevant grammatical features

Format your response as a JSON array with this structure:
[
  {
    "sentence": "Danish sentence",
    "translation": "English translation",
    "grammarPoints": [
      {
        "type": "verb|noun|tense|word-order|article|other",
        "description": "Detailed explanation",
        "example": "Optional example"
      }
    ]
  }
]

Important: Return ONLY the JSON array, no other text.`;

  try {
    const response = await withGenAIClient(client =>
      client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      })
    );

    const text = response.text.trim();
    console.log('Received explanation response from Gemini:', text);
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text;
    if (text.includes('```json')) {
      jsonText = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      jsonText = text.split('```')[1].split('```')[0].trim();
    }
    
    const parsedResponse = JSON.parse(jsonText);
    console.log('Parsed explanation:', parsedResponse);
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
