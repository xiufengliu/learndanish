// Grammar analysis using AI

import { GoogleGenAI } from "@google/genai";
import { GrammarAnalysis, GrammarCorrection } from '../types/grammar';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export async function analyzeGrammar(userText: string): Promise<GrammarAnalysis> {
  try {
    const prompt = `
Analyze the following Danish text for grammar mistakes. If there are errors, provide corrections with detailed explanations.

Return a JSON object with this structure:
{
  "hasErrors": true/false,
  "corrections": [
    {
      "originalText": "the incorrect phrase",
      "correctedText": "the correct phrase",
      "explanation": "Clear explanation of what was wrong and why",
      "rule": "The grammar rule being violated",
      "examples": ["Example 1 showing correct usage", "Example 2 showing correct usage"],
      "category": "verb|noun|adjective|word-order|preposition|article|other"
    }
  ]
}

Only include actual grammar mistakes. If the text is grammatically correct, return hasErrors: false and empty corrections array.

Danish text to analyze: "${userText}"

Provide explanations in English so the learner understands the mistake clearly.
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
    
    return {
      hasErrors: parsed.hasErrors || false,
      corrections: (parsed.corrections || []).map((c: any) => ({
        id: `correction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        originalText: c.originalText,
        correctedText: c.correctedText,
        explanation: c.explanation,
        rule: c.rule,
        examples: c.examples || [],
        timestamp: new Date(),
        category: c.category || 'other'
      }))
    };
  } catch (error) {
    console.error('Failed to analyze grammar:', error);
    return {
      hasErrors: false,
      corrections: []
    };
  }
}
