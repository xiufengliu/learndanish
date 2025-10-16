import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from "@google/genai";

// --- Audio Helper Functions (as per guidelines) ---

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- React Component ---

type ChatMessage = {
  role: 'user' | 'model';
  text: string;
  translation?: string;
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
const CHAT_HISTORY_KEY = 'danishTutorHistory';

const DanishTutorApp = () => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    try {
      const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
      console.error("Failed to parse chat history from localStorage", error);
      localStorage.removeItem(CHAT_HISTORY_KEY); // Clear corrupted data
      return [];
    }
  });
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const sessionPromiseRef = useRef<any>(null); // Using 'any' for the promise that resolves to the session
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory]);
  
  useEffect(() => {
    // This effect runs whenever chatHistory changes, and saves it.
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
  }, [chatHistory]);

  const startSession = () => {
    // Fix: Cast window to `any` to access vendor-prefixed `webkitAudioContext` for older browsers.
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const outputNode = outputAudioContext.createGain();
    outputNode.connect(outputAudioContext.destination);
    
    let nextStartTime = 0;
    const sources = new Set<AudioBufferSourceNode>();
    
    sessionPromiseRef.current = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: async () => {
          console.log('Session opened.');
          setError(null);
          // Start with a greeting only if chat history is completely empty.
          if (chatHistory.length === 0) {
            setChatHistory([{ role: 'model', text: 'Hej! Hvordan går det?', translation: 'Hello! How are you?'}]);
          }
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.outputTranscription) {
            currentOutputTranscription.current += message.serverContent.outputTranscription.text;
          } else if (message.serverContent?.inputTranscription) {
            currentInputTranscription.current += message.serverContent.inputTranscription.text;
          }
  
          if (message.serverContent?.turnComplete) {
            const fullInput = currentInputTranscription.current.trim();
            const fullOutput = currentOutputTranscription.current.trim();
  
            if(fullInput) {
              setChatHistory(prev => [...prev, {role: 'user', text: fullInput}]);
            }
            if(fullOutput) {
              setChatHistory(prev => [...prev, {role: 'model', text: fullOutput}]);
            }
  
            currentInputTranscription.current = '';
            currentOutputTranscription.current = '';
          }
  
          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio) {
            nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
            const source = outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputNode);
            source.addEventListener('ended', () => sources.delete(source));
            source.start(nextStartTime);
            nextStartTime += audioBuffer.duration;
            sources.add(source);
          }
  
          if (message.serverContent?.interrupted) {
            for (const source of sources.values()) {
              source.stop();
              sources.delete(source);
            }
            nextStartTime = 0;
          }
        },
        onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setError('An error occurred with the connection. Please try refreshing.');
            stopRecording();
        },
        onclose: () => {
            console.log('Session closed.');
        },
      },
      config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Kore'
                  }
                }
              },
              systemInstruction: `
            You are a friendly, patient, and culturally aware Danish tutor guiding English-speaking learners through conversational practice.
            Your goal is to help users think and communicate in Danish naturally, while providing short, clear explanations in English when needed.

            Core Rules:
            1. Speak primarily in Danish (about 60–70% of the time), using simple, natural expressions suited to the learner’s level.
            2. When the user makes a mistake, asks about grammar, or a teachable moment appears, briefly switch to English to give a concise (1–3 sentence) explanation, then return to Danish.
            3. Be supportive, warm, and encouraging — like a native-speaking friend. Use natural feedback such as “Godt klaret!” or “Det er næsten rigtigt – prøv sådan her…”.
            4. Occasionally introduce new Danish words or idioms in context, giving a short English explanation if needed.
            5. End most responses with a Danish question or prompt to keep the conversation flowing.

            Goal:
            Maintain an immersive, confidence-building environment that balances Danish conversation with short, well-timed English grammar or vocabulary tips.
              `,
              inputAudioTranscription: {},
              outputAudioTranscription: {},
            },
    });
  };

  const startRecording = async () => {
    try {
        if (!sessionPromiseRef.current) {
            startSession();
        }

        // Fix: Cast window to `any` to access vendor-prefixed `webkitAudioContext` for older browsers.
        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        audioContextRef.current = inputAudioContext;

        await inputAudioContext.resume();
        
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamSourceRef.current = inputAudioContext.createMediaStreamSource(mediaStreamRef.current);
        
        scriptProcessorRef.current = inputAudioContext.createScriptProcessor(4096, 1, 1);
        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const pcmBlob: Blob = {
                data: encode(new Uint8Array(new Int16Array(inputData.map(d => d * 32768)).buffer)),
                mimeType: 'audio/pcm;rate=16000',
            };
            sessionPromiseRef.current.then((session: any) => {
                session.sendRealtimeInput({ media: pcmBlob });
            });
        };

        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
        scriptProcessorRef.current.connect(inputAudioContext.destination);
        setIsRecording(true);
    } catch (err) {
        console.error("Failed to start recording:", err);
        setError("Could not access microphone. Please check permissions and try again.");
    }
  };

  const stopRecording = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if(mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    setIsRecording(false);
  };
  
  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleMouseEnterTooltip = async (e: React.MouseEvent, index: number) => {
    const message = chatHistory[index];
    if (message.role !== 'model') return;
    const x = e.clientX + 15;
    const y = e.clientY + 15;
    if (message.translation) {
      setTooltip({ visible: true, text: message.translation, x, y });
    } else {
      setTooltip({ visible: true, text: 'Translating...', x, y });
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Translate the following Danish text to English. Provide only the translation, without any additional formatting or commentary. Danish: "${message.text}"`
        });
        const translation = response.text;
        setChatHistory(prev => {
          const newHistory = [...prev];
          if (newHistory[index]) newHistory[index].translation = translation;
          return newHistory;
        });
        setTooltip(current => ({ ...current, visible: current.visible, text: translation }));
      } catch (err) {
        console.error("Translation failed:", err);
        setTooltip(current => ({ ...current, visible: current.visible, text: 'Translation failed' }));
      }
    }
  };

  const handleMouseLeaveTooltip = () => setTooltip({ ...tooltip, visible: false });

  const handleMaximizeToggle = () => setIsMaximized(!isMaximized);

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear the entire chat history? This cannot be undone.')) {
      setChatHistory([]); // This triggers the useEffect to save the empty array.
    }
  };

  return (
    <div className={`container ${isMaximized ? 'maximized' : ''}`}>
      <div className="title-bar">
        <button
          className="clear-button"
          onClick={handleClearChat}
          aria-label="Clear chat history"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" aria-hidden="true"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/></svg>
        </button>
        <h1>Danish Tutor Chat</h1>
        <button
          className="maximize-button"
          onClick={handleMaximizeToggle}
          aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
        >
          {isMaximized ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" aria-hidden="true">
              <path d="M448 80v224c0 17.7-14.3 32-32 32h-64v64c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32V112c0-17.7 14.3-32 32-32h64V16c0-8.8 7.2-16 16-16h224c17.7 0 32 14.3 32 32v64h64c17.7 0 32 14.3 32 32zM320 32H128v64h192V32zm-32 128H32v256h256V160z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" aria-hidden="true">
              <path d="M32 32C14.3 32 0 46.3 0 64v384c0 17.7 14.3 32 32 32h384c17.7 0 32-14.3 32-32V64c0-17.7-14.3-32-32-32H32zM416 448H32V64h384v384z" />
            </svg>
          )}
        </button>
      </div>
      <div className="chat-history" ref={chatHistoryRef}>
        {chatHistory.map((msg, index) => (
          <div
            key={index}
            className={`chat-message ${msg.role}-message`}
            onMouseEnter={(e) => handleMouseEnterTooltip(e, index)}
            onMouseLeave={handleMouseLeaveTooltip}
          >
            {msg.text}
          </div>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      <div className="mic-button-container">
        <button
          className={`mic-button ${isRecording ? 'listening' : ''}`}
          onClick={handleMicClick}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" aria-hidden="true">
            <path d="M192 0C139 0 96 43 96 96V256c0 53 43 96 96 96s96-43 96-96V96c0-53-43-96-96-96zM64 216c0-21.9-16.1-39.7-36.7-41.6C11.6 172.1 0 189.6 0 208v48c0 35.3 28.7 64 64 64v80c0 17.7 14.3 32 32 32s32-14.3 32-32V320c61.9 0 112-50.1 112-112v-1.8c-20.6 1.9-36.7 19.7-36.7 41.6v48c0 13.3-10.7 24-24 24s-24-10.7-24-24v-48zm224 0v48c0 13.3-10.7 24-24 24s-24-10.7-24-24v-48c0-21.9-16.1-39.7-36.7-41.6V208c0 61.9 50.1 112 112 112v80c0 17.7 14.3 32 32 32s32-14.3 32-32V320c35.3 0 64-28.7 64-64v-48c0-18.4-11.6-35.9-27.3-37.7C336.1 176.3 320 194.1 320 216z"/>
          </svg>
        </button>
      </div>
      {tooltip.visible && (
        <div className="tooltip" style={{ top: `${tooltip.y}px`, left: `${tooltip.x}px` }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<React.StrictMode><DanishTutorApp /></React.StrictMode>);
}