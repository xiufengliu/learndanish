import { GoogleGenAI } from "@google/genai";

const rawKeys =
  process.env.GEMINI_API_KEYS ||
  process.env.GEMINI_API_KEY ||
  process.env.API_KEY ||
  '';

const apiKeys = rawKeys
  .split(',')
  .map(key => key.trim())
  .filter(Boolean);

const clients = new Map<string, GoogleGenAI>();
let currentIndex = 0;

function getClientForIndex(index: number): GoogleGenAI {
  const key = apiKeys[index];
  let client = clients.get(key);
  if (!client) {
    client = new GoogleGenAI({ apiKey: key });
    clients.set(key, client);
  }
  return client;
}

function isQuotaError(error: unknown): boolean {
  const status =
    (error as any)?.status ??
    (error as any)?.error?.status ??
    (error as any)?.response?.status;

  if (status === 429 || status === 403) {
    return true;
  }

  const message = (
    (error as any)?.message ||
    (error as any)?.error?.message ||
    ''
  )
    .toString()
    .toLowerCase();

  return (
    message.includes('quota') ||
    message.includes('rate limit') ||
    message.includes('limit exceeded') ||
    message.includes('exceeded')
  );
}

export function getConfiguredApiKeys(): string[] {
  return [...apiKeys];
}

export async function withGenAIClient<T>(
  executor: (client: GoogleGenAI, apiKey: string) => Promise<T>
): Promise<T> {
  if (apiKeys.length === 0) {
    throw new Error('No Gemini API keys configured. Please set GEMINI_API_KEYS.');
  }

  const totalKeys = apiKeys.length;
  let lastError: unknown;

  for (let offset = 0; offset < totalKeys; offset++) {
    const index = (currentIndex + offset) % totalKeys;
    const key = apiKeys[index];
    const client = getClientForIndex(index);

    try {
      const result = await executor(client, key);
      currentIndex = index;
      return result;
    } catch (error) {
      lastError = error;
      if (isQuotaError(error)) {
        continue;
      }
      throw error;
    }
  }

  if (totalKeys > 1) {
    currentIndex = (currentIndex + 1) % totalKeys;
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to execute Gemini request.');
}
