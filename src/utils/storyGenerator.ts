import { withGenAIClient } from './genAIClient';
import type { Story, StoryExplanation } from '../types/story';

export async function generateStory(
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced',
  audienceLanguage: 'english' | 'chinese' = 'english'
): Promise<Story> {
  const difficultyDescriptions = {
    beginner: 'very simple vocabulary and basic sentence structures (present tense, simple past)',
    intermediate: 'moderate vocabulary with some compound sentences and various tenses',
    advanced: 'complex vocabulary with sophisticated grammar structures and idiomatic expressions'
  };

  const translationLanguage = audienceLanguage === 'chinese' ? 'Simplified Chinese (简体中文)' : 'English';

  const prompt = `Generate a short Danish story (5-7 sentences) at ${difficultyLevel} level.

Requirements:
- Use ${difficultyDescriptions[difficultyLevel]}
- Make it interesting and engaging
- Include cultural elements when appropriate
- Provide translation in ${translationLanguage}

Format your response as a JSON object with this structure:
{
  "danishText": "The complete Danish story with each sentence on a new line",
  "${audienceLanguage === 'chinese' ? 'chineseTranslation' : 'englishTranslation'}": "The complete ${translationLanguage} translation with each sentence on a new line"
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
    
    // Get translation from the appropriate field
    const translation = audienceLanguage === 'chinese' 
      ? parsedResponse.chineseTranslation 
      : parsedResponse.englishTranslation;
    
    return {
      id: `story-${Date.now()}`,
      danishText: parsedResponse.danishText,
      englishTranslation: translation, // Using englishTranslation field for both languages for consistency
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
