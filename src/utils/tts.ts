import { withGenAIClient } from './genAIClient';

const MODEL_ID = 'gemini-2.5-pro-preview-tts';
const VOICE_NAME = 'Kore'; // Danish voice
const FALLBACK_SAMPLE_RATE = 24000;

type CachedSpeech = {
  base64: string;
  mimeType?: string;
};

const speechCache = new Map<string, Promise<CachedSpeech>>();

let sharedAudioContext: AudioContext | null = null;

function ensureAudioContext(): AudioContext {
  if (sharedAudioContext) {
    return sharedAudioContext;
  }

  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  sharedAudioContext = new AudioContextCtor();
  return sharedAudioContext;
}

function base64ToArrayBuffer(base64Data: string): ArrayBuffer {
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const arrayBuffer = new ArrayBuffer(len);
  const view = new Uint8Array(arrayBuffer);

  for (let i = 0; i < len; i += 1) {
    view[i] = binaryString.charCodeAt(i);
  }

  return arrayBuffer;
}

function decodePCM16ToAudioBuffer(
  audioContext: AudioContext,
  arrayBuffer: ArrayBuffer,
  sampleRate: number = FALLBACK_SAMPLE_RATE
): AudioBuffer {
  const int16View = new Int16Array(arrayBuffer);
  const float32 = new Float32Array(int16View.length);
  for (let i = 0; i < int16View.length; i += 1) {
    float32[i] = int16View[i] / 32768;
  }

  const buffer = audioContext.createBuffer(1, float32.length, sampleRate);
  buffer.getChannelData(0).set(float32);
  return buffer;
}

async function requestSpeechFromGemini(text: string): Promise<CachedSpeech> {
  if (!text.trim()) {
    throw new Error('Cannot synthesize empty text');
  }

  const result = await withGenAIClient(client =>
    client.models.generateContent({
      model: MODEL_ID,
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: VOICE_NAME }
          }
        }
      }
    })
  );

  const part = result.candidates?.[0]?.content?.parts?.find(p => (p as any).inlineData) as
    | { inlineData?: { data?: string } }
    | undefined;

  const base64Audio = part?.inlineData?.data;

  if (!base64Audio) {
    throw new Error('Gemini did not return audio data.');
  }

  const mimeType = part?.inlineData?.mimeType;

  return {
    base64: base64Audio,
    mimeType
  };
}

async function getSpeechAudio(text: string): Promise<CachedSpeech> {
  let cached = speechCache.get(text);
  if (!cached) {
    cached = requestSpeechFromGemini(text);
    speechCache.set(text, cached);
  }

  try {
    return await cached;
  } catch (error) {
    speechCache.delete(text);
    throw error;
  }
}

export async function playDanishText(text: string): Promise<void> {
  if (!text.trim()) {
    return;
  }

  try {
    const { base64, mimeType } = await getSpeechAudio(text);
    const audioContext = ensureAudioContext();

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const arrayBuffer = base64ToArrayBuffer(base64);
    let audioBuffer: AudioBuffer;

    try {
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    } catch (decodeError) {
      if (mimeType && !mimeType.includes('pcm')) {
        throw decodeError;
      }
      audioBuffer = decodePCM16ToAudioBuffer(audioContext, arrayBuffer);
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
  } catch (error) {
    console.error('Failed to play Danish text using Gemini TTS:', error);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'da-DK';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }
}
