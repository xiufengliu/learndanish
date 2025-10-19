import { withGenAIClient } from './genAIClient';

const MODEL_ID = 'gemini-2.5-pro-preview-tts';
const SAMPLE_RATE = 24000;
const VOICE_NAME = 'Kore'; // Danish voice

type CachedSpeech = {
  audio: Float32Array;
  sampleRate: number;
};

const speechCache = new Map<string, Promise<CachedSpeech>>();

let sharedAudioContext: AudioContext | null = null;

function ensureAudioContext(sampleRate: number): AudioContext {
  if (sharedAudioContext && sharedAudioContext.sampleRate !== sampleRate) {
    try {
      sharedAudioContext.close();
    } catch (error) {
      console.warn('Failed to close existing AudioContext', error);
    }
    sharedAudioContext = null;
  }

  if (!sharedAudioContext) {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioContext = new AudioContextCtor({ sampleRate });
  }

  return sharedAudioContext;
}

function decodeBase64ToFloat32(base64Data: string): Float32Array {
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const buffer = new ArrayBuffer(len);
  const view = new Uint8Array(buffer);

  for (let i = 0; i < len; i += 1) {
    view[i] = binaryString.charCodeAt(i);
  }

  const int16View = new Int16Array(buffer);
  const float32 = new Float32Array(int16View.length);
  for (let i = 0; i < int16View.length; i += 1) {
    float32[i] = int16View[i] / 32768;
  }

  return float32;
}

async function requestSpeechFromGemini(text: string): Promise<CachedSpeech> {
  if (!text.trim()) {
    throw new Error('Cannot synthesize empty text');
  }

  const result = await withGenAIClient(client =>
    client.models.generateContent({
      model: MODEL_ID,
      contents: [{ parts: [{ text }] }],
      config: {
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

  const audio = decodeBase64ToFloat32(base64Audio);
  return {
    audio,
    sampleRate: SAMPLE_RATE
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
    const { audio, sampleRate } = await getSpeechAudio(text);
    const audioContext = ensureAudioContext(sampleRate);

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const buffer = audioContext.createBuffer(1, audio.length, sampleRate);
    buffer.getChannelData(0).set(audio);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
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
