// Deepgram Text-to-Speech utility

const DEEPGRAM_API_KEY = 'dc0c0bd2fa925fa7cb5d25f27b399984313ff51e';
const DEEPGRAM_TTS_URL = 'https://api.deepgram.com/v1/speak';

interface TTSOptions {
  model?: string; // Default: 'aura-asteria-en'
  encoding?: string; // Default: 'linear16'
  container?: string; // Default: 'wav'
  sample_rate?: number; // Default: 48000
}

export async function speakTextWithDeepgram(
  text: string,
  language: string = 'da', // Danish
  options: TTSOptions = {}
): Promise<void> {
  try {
    const {
      model = 'aura-asteria-en', // Deepgram will handle Danish with this model
      encoding = 'linear16',
      container = 'wav',
      sample_rate = 48000
    } = options;

    const url = `${DEEPGRAM_TTS_URL}?model=${model}&encoding=${encoding}&container=${container}&sample_rate=${sample_rate}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text
      })
    });

    if (!response.ok) {
      throw new Error(`Deepgram TTS failed: ${response.status} ${response.statusText}`);
    }

    // Get audio blob
    const audioBlob = await response.blob();
    
    // Create audio URL and play
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    // Play audio
    await audio.play();
    
    // Clean up URL after playing
    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(audioUrl);
    });

  } catch (error) {
    console.error('Deepgram TTS error:', error);
    // Fallback to browser TTS
    fallbackToBrowserTTS(text, language);
  }
}

// Fallback to browser's built-in speech synthesis
function fallbackToBrowserTTS(text: string, lang: string = 'da-DK'): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}
