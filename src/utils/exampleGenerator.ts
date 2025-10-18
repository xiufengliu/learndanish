// Generate example sentences for vocabulary words

import { withGenAIClient } from './genAIClient';

export async function generateExampleSentences(
  danishWord: string,
  englishTranslation: string,
  partOfSpeech?: string,
  audienceLanguage: 'english' | 'chinese' = 'english'
): Promise<string[]> {
  const targetLanguage = audienceLanguage === 'chinese' ? 'Simplified Chinese (简体中文)' : 'English';
  
  try {
    const prompt = `
Generate 4-5 diverse example sentences using the Danish word "${danishWord}" (${englishTranslation}).
${partOfSpeech ? `Part of speech: ${partOfSpeech}` : ''}

Requirements:
- Use different contexts (formal, informal, questions, statements)
- Show different tenses if it's a verb
- Vary sentence complexity (simple to intermediate)
- Make them practical and useful for learners
- Include the ${targetLanguage} translation after each Danish sentence

Return a JSON object:
{
  "sentences": [
    {
      "danish": "Danish sentence here",
      "${audienceLanguage === 'chinese' ? 'chinese' : 'english'}": "${targetLanguage} translation here"
    }
  ]
}
`;

    const response = await withGenAIClient(client =>
      client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      })
    );

    const text = response.text.trim();
    console.log('Example sentences response:', text);
    
    // Extract JSON from response
    let jsonText = text;
    if (text.includes('```json')) {
      jsonText = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      jsonText = text.split('```')[1].split('```')[0].trim();
    }

    console.log('Parsed JSON text:', jsonText);
    const parsed = JSON.parse(jsonText);
    console.log('Parsed sentences:', parsed);
    const sentences = parsed.sentences || [];
    
    // Format as "Danish sentence - translation"
    const translationKey = audienceLanguage === 'chinese' ? 'chinese' : 'english';
    console.log('Using translation key:', translationKey);
    const result = sentences.map((s: any) => {
      console.log('Sentence object:', s);
      return `${s.danish} - ${s[translationKey]}`;
    });
    console.log('Final result:', result);
    return result;
  } catch (error) {
    console.error('Failed to generate example sentences:', error);
    return [];
  }
}

export async function generateCulturalNote(
  danishWord: string,
  englishTranslation: string,
  audienceLanguage: 'english' | 'chinese' = 'english'
): Promise<string | null> {
  const targetLanguage = audienceLanguage === 'chinese' ? 'Simplified Chinese (简体中文)' : 'English';
  
  try {
    const prompt = `
Analyze if the Danish word/phrase "${danishWord}" (${englishTranslation}) has any interesting cultural context, idioms, or usage notes that would help a ${targetLanguage} speaker understand Danish culture better.

Consider:
- Is this word culturally significant in Denmark?
- Are there idioms or expressions using this word?
- Does it have nuances that don't translate directly?
- Are there customs or social contexts related to this word?
- Does it reflect something unique about Danish culture?

Provide your response in ${targetLanguage}.

If there IS interesting cultural context, return a JSON object:
{
  "hasCulturalNote": true,
  "note": "2-3 sentences in ${targetLanguage} explaining the cultural context"
}

If there is NO significant cultural context (just a regular everyday word), return:
{
  "hasCulturalNote": false
}
`;

    const response = await withGenAIClient(client =>
      client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      })
    );

    const text = response.text.trim();
    console.log('Cultural note response:', text);
    
    // Extract JSON from response
    let jsonText = text;
    if (text.includes('```json')) {
      jsonText = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      jsonText = text.split('```')[1].split('```')[0].trim();
    }

    console.log('Parsed JSON text:', jsonText);
    const parsed = JSON.parse(jsonText);
    console.log('Parsed cultural note:', parsed);
    
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
  partOfSpeech?: string,
  audienceLanguage: 'english' | 'chinese' = 'english'
): Promise<any | null> {
  const targetLanguage = audienceLanguage === 'chinese' ? 'Simplified Chinese (简体中文)' : 'English';
  
  try {
    const prompt = `
Analyze the Danish word "${danishWord}" (${englishTranslation}) and provide its grammatical forms.
${partOfSpeech ? `Part of speech: ${partOfSpeech}` : ''}
Provide explanations in ${targetLanguage}.

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

    const response = await withGenAIClient(client =>
      client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      })
    );

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
