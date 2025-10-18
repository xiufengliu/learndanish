import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { LiveServerMessage, Modality, Blob } from "@google/genai";
import ErrorBoundary from './src/components/ErrorBoundary';
import SettingsPanel from './src/components/SettingsPanel';
import VocabularyList from './src/components/VocabularyList';
import FlashcardView from './src/components/FlashcardView';
import GrammarPanel from './src/components/GrammarPanel';
import { retryWithBackoff } from './src/utils/retryLogic';
import { withGenAIClient } from './src/utils/genAIClient';
import { useTheme } from './src/hooks/useTheme';
import { useSettings } from './src/hooks/useSettings';
import { useVocabularyTracker } from './src/hooks/useVocabularyTracker';
import { useSpacedRepetition } from './src/hooks/useSpacedRepetition';
import { useKeyboardShortcuts, ShortcutHandler } from './src/hooks/useKeyboardShortcuts';
import { useGrammarTracking } from './src/hooks/useGrammarTracking';
import { generateSystemInstruction } from './src/utils/systemPrompt';
import { analyzeGrammar } from './src/utils/grammarAnalyzer';
import { useWakeLock } from './src/hooks/useWakeLock';

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

const CHAT_HISTORY_KEY = 'danishTutorHistory';

const DanishTutorApp = () => {
  const { theme, toggleTheme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const { vocabulary, extractAndAddVocabulary, deleteWord, updateWord } = useVocabularyTracker();
  const { getDueWords } = useSpacedRepetition();
  const { grammarHistory, addCorrections, clearHistory } = useGrammarTracking();
  const { isSupported: wakeLockSupported, requestWakeLock, releaseWakeLock } = useWakeLock();
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
  const [showSettings, setShowSettings] = useState(false);
  const [showVocabulary, setShowVocabulary] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [showGrammar, setShowGrammar] = useState(false);
  
  const dueWords = getDueWords(vocabulary);
  
  // Get all non-mastered words for flashcard fallback
  const nonMasteredWords = vocabulary.filter(word => word.proficiencyLevel !== 'mastered');

  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const sessionPromiseRef = useRef<any>(null); // Using 'any' for the promise that resolves to the session
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });
  const [isDraggingTooltip, setIsDraggingTooltip] = useState(false);
  const tooltipDragOffsetRef = useRef({ x: 0, y: 0 });

  // Keyboard shortcuts
  const shortcuts: ShortcutHandler[] = [
    {
      key: ' ',
      handler: () => handleMicClick(),
      description: 'Toggle recording'
    },
    {
      key: 'Escape',
      handler: () => { if (isRecording) stopRecording(); },
      description: 'Stop recording'
    },
    {
      key: 'k',
      ctrl: true,
      handler: () => setShowSettings(true),
      description: 'Open settings'
    },
    {
      key: 'd',
      ctrl: true,
      handler: () => toggleTheme(),
      description: 'Toggle dark mode'
    },
    {
      key: 'v',
      ctrl: true,
      handler: () => setShowVocabulary(true),
      description: 'Open vocabulary'
    },
    {
      key: 'f',
      ctrl: true,
      handler: () => setShowFlashcards(true),
      description: 'Open flashcards'
    },
    {
      key: 'g',
      ctrl: true,
      handler: () => setShowGrammar(true),
      description: 'Open grammar corrections'
    }
  ];

  useKeyboardShortcuts(shortcuts, settings.keyboardShortcuts);

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory]);
  
  useEffect(() => {
    // This effect runs whenever chatHistory changes, and saves it.
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    if (!wakeLockSupported) {
      return;
    }

    const shouldHoldWakeLock = settings.preventScreenLock || isRecording;
    if (shouldHoldWakeLock) {
      void requestWakeLock();
    } else {
      void releaseWakeLock();
    }
  }, [
    settings.preventScreenLock,
    isRecording,
    wakeLockSupported,
    requestWakeLock,
    releaseWakeLock
  ]);

  const startSession = () => {
    // Fix: Cast window to `any` to access vendor-prefixed `webkitAudioContext` for older browsers.
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const outputNode = outputAudioContext.createGain();
    outputNode.connect(outputAudioContext.destination);
    
    let nextStartTime = 0;
    const sources = new Set<AudioBufferSourceNode>();
    
    sessionPromiseRef.current = withGenAIClient(async (client) =>
      client.live.connect({
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
                
                // Analyze grammar if corrections are enabled
                if (settings.grammarCorrections && fullInput.length > 5) {
                  analyzeGrammar(fullInput).then(analysis => {
                    if (analysis.hasErrors && analysis.corrections.length > 0) {
                      addCorrections(analysis.corrections);
                    }
                  }).catch(err => 
                    console.error('Failed to analyze grammar:', err)
                  );
                }
              }
              if(fullOutput) {
                setChatHistory(prev => [...prev, {role: 'model', text: fullOutput}]);
                
                // Extract vocabulary from model response if enabled
                if (settings.vocabularyTracking) {
                  extractAndAddVocabulary(fullOutput, fullInput).catch(err => 
                    console.error('Failed to extract vocabulary:', err)
                  );
                }
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
                      voiceName: 'Kore' // Default Danish voice
                    }
                  }
                },
                systemInstruction: generateSystemInstruction(settings),
                inputAudioTranscription: {},
                outputAudioTranscription: {},
              },
      })
    ).catch(err => {
      console.error('Failed to start Gemini live session:', err);
      setError('Unable to connect to the tutor right now. Please try again shortly.');
      throw err;
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
        const translation = await retryWithBackoff(async () => {
          const response = await withGenAIClient(client =>
            client.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Translate the following Danish text to English. Provide only the translation, without any additional formatting or commentary. Danish: "${message.text}"`
            })
          );
          return response.text;
        });
        
        setChatHistory(prev => {
          const newHistory = [...prev];
          if (newHistory[index]) newHistory[index].translation = translation;
          return newHistory;
        });
        setTooltip(current => ({ ...current, visible: current.visible, text: translation }));
      } catch (err) {
        console.error("Translation failed:", err);
        setTooltip(current => ({ ...current, visible: current.visible, text: 'Translation failed. Click to retry.' }));
      }
    }
  };

  const handleMouseLeaveTooltip = () => {
    // Don't hide tooltip while dragging
    if (!isDraggingTooltip) {
      setTooltip({ ...tooltip, visible: false });
    }
  };

  const handleTooltipMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't start dragging if clicking on the close button
    const target = e.target as HTMLElement;
    if (target.classList.contains('tooltip-close') || target.closest('.tooltip-close')) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsDraggingTooltip(true);
    tooltipDragOffsetRef.current = {
      x: e.clientX - tooltip.x,
      y: e.clientY - tooltip.y
    };
  };

  const handleTooltipTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // Don't start dragging if touching the close button
    const target = e.target as HTMLElement;
    if (target.classList.contains('tooltip-close') || target.closest('.tooltip-close')) {
      return;
    }
    
    e.stopPropagation();
    
    const touch = e.touches[0];
    setIsDraggingTooltip(true);
    tooltipDragOffsetRef.current = {
      x: touch.clientX - tooltip.x,
      y: touch.clientY - tooltip.y
    };
  };

  const handleTooltipClose = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setTooltip({ visible: false, text: '', x: 0, y: 0 });
    setIsDraggingTooltip(false);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setTooltip(current => ({
        ...current,
        x: e.clientX - tooltipDragOffsetRef.current.x,
        y: e.clientY - tooltipDragOffsetRef.current.y
      }));
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      setTooltip(current => ({
        ...current,
        x: touch.clientX - tooltipDragOffsetRef.current.x,
        y: touch.clientY - tooltipDragOffsetRef.current.y
      }));
    };

    const handleEnd = () => {
      setIsDraggingTooltip(false);
    };

    if (isDraggingTooltip) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
      document.addEventListener('touchcancel', handleEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleEnd);
        document.removeEventListener('touchcancel', handleEnd);
      };
    }
  }, [isDraggingTooltip]);

  const handleMaximizeToggle = () => setIsMaximized(!isMaximized);

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear the entire chat history? This cannot be undone.')) {
      setChatHistory([]); // This triggers the useEffect to save the empty array.
    }
  };

  return (
    <div className={`container ${isMaximized ? 'maximized' : ''}`}>
      <div className="title-bar">
        <div className="title-bar-left">
          <button
            className="clear-button"
            onClick={handleClearChat}
            aria-label="Clear chat history"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" aria-hidden="true"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/></svg>
          </button>
          <button
            className="theme-button"
            onClick={toggleTheme}
            aria-label={`Current theme: ${theme}. Click to toggle`}
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true"><path d="M361.5 1.2c5 2.1 8.6 6.6 9.6 11.9L391 121l107.9 19.8c5.3 1 9.8 4.6 11.9 9.6s1.5 10.7-1.6 15.2L446.9 256l62.3 90.3c3.1 4.5 3.7 10.2 1.6 15.2s-6.6 8.6-11.9 9.6L391 391 371.1 498.9c-1 5.3-4.6 9.8-9.6 11.9s-10.7 1.5-15.2-1.6L256 446.9l-90.3 62.3c-4.5 3.1-10.2 3.7-15.2 1.6s-8.6-6.6-9.6-11.9L121 391 13.1 371.1c-5.3-1-9.8-4.6-11.9-9.6s-1.5-10.7 1.6-15.2L65.1 256 2.8 165.7c-3.1-4.5-3.7-10.2-1.6-15.2s6.6-8.6 11.9-9.6L121 121 140.9 13.1c1-5.3 4.6-9.8 9.6-11.9s10.7-1.5 15.2 1.6L256 65.1 346.3 2.8c4.5-3.1 10.2-3.7 15.2-1.6zM160 256a96 96 0 1 1 192 0 96 96 0 1 1 -192 0zm224 0a128 128 0 1 0 -256 0 128 128 0 1 0 256 0z"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" aria-hidden="true"><path d="M223.5 32C100 32 0 132.3 0 256S100 480 223.5 480c60.6 0 115.5-24.2 155.8-63.4c5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6c-96.9 0-175.5-78.8-175.5-176c0-65.8 36-123.1 89.3-153.3c6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z"/></svg>
            )}
          </button>
          <button
            className="grammar-button"
            onClick={() => setShowGrammar(true)}
            aria-label="Open grammar corrections"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true"><path d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2C-1.5 489.7 .8 498.8 7 505s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z"/></svg>
            {grammarHistory.length > 0 && (
              <span className="vocab-badge">{grammarHistory.length}</span>
            )}
          </button>
          <button
            className="vocabulary-button"
            onClick={() => setShowVocabulary(true)}
            aria-label="Open vocabulary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" aria-hidden="true"><path d="M96 0C43 0 0 43 0 96V416c0 53 43 96 96 96H384h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V384c17.7 0 32-14.3 32-32V32c0-17.7-14.3-32-32-32H384 96zm0 384H352v64H96c-17.7 0-32-14.3-32-32s14.3-32 32-32zm32-240c0-8.8 7.2-16 16-16H336c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16zm16 48H336c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16s7.2-16 16-16z"/></svg>
            {vocabulary.length > 0 && (
              <span className="vocab-badge">{vocabulary.length}</span>
            )}
          </button>
          <button
            className="flashcard-button"
            onClick={() => setShowFlashcards(true)}
            aria-label="Open flashcards"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" aria-hidden="true"><path d="M64 64C28.7 64 0 92.7 0 128V384c0 35.3 28.7 64 64 64H512c35.3 0 64-28.7 64-64V128c0-35.3-28.7-64-64-64H64zM272 192H496c8.8 0 16 7.2 16 16s-7.2 16-16 16H272c-8.8 0-16-7.2-16-16s7.2-16 16-16zM256 304c0-8.8 7.2-16 16-16H496c8.8 0 16 7.2 16 16s-7.2 16-16 16H272c-8.8 0-16-7.2-16-16zM164 152v13.9c7.5 1.2 14.6 2.9 21.1 4.7c10.7 2.8 17 13.8 14.2 24.5s-13.8 17-24.5 14.2c-11-2.9-21.6-5-31.2-5.2c-7.9-.1-16 1.8-21.5 5c-4.8 2.8-6.2 5.6-6.2 9.3c0 1.8 .1 3.5 5.3 6.7c6.3 3.8 15.5 6.7 28.3 10.5l.7 .2c11.2 3.4 25.6 7.7 37.1 15c12.9 8.1 24.3 21.3 24.6 41.6c.3 20.9-10.5 36.1-24.8 45c-7.2 4.5-15.2 7.3-23.2 9V360c0 11-9 20-20 20s-20-9-20-20V345.4c-10.3-2.2-20-5.5-28.2-8.4l0 0 0 0c-2.1-.7-4.1-1.4-6.1-2.1c-10.5-3.5-16.1-14.8-12.6-25.3s14.8-16.1 25.3-12.6c2.5 .8 4.9 1.7 7.2 2.4c13.6 4.6 24 8.1 35.1 8.5c8.6 .3 16.5-1.6 21.4-4.7c4.1-2.5 6-5.5 5.9-10.5c0-2.9-.8-5-5.9-8.2c-6.3-4-15.4-6.9-28-10.7l-1.7-.5c-10.9-3.3-24.6-7.4-35.6-14c-12.7-7.7-24.6-20.5-24.7-40.7c-.1-21.1 11.8-35.7 25.8-43.9c6.9-4.1 14.5-6.8 22.2-8.5V152c0-11 9-20 20-20s20 9 20 20z"/></svg>
            {dueWords.length > 0 && (
              <span className="vocab-badge">{dueWords.length}</span>
            )}
          </button>
          <button
            className="settings-button"
            onClick={() => setShowSettings(true)}
            aria-label="Open settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true"><path d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/></svg>
          </button>
        </div>
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
        <div 
          className="tooltip draggable-tooltip" 
          style={{ 
            top: `${tooltip.y}px`, 
            left: `${tooltip.x}px`
          }}
          onMouseDown={handleTooltipMouseDown}
          onTouchStart={handleTooltipTouchStart}
        >
          <div className="tooltip-content">{tooltip.text}</div>
          <button 
            className="tooltip-close" 
            onClick={handleTooltipClose}
            onTouchEnd={handleTooltipClose}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            ×
          </button>
        </div>
      )}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdateSettings={updateSettings}
          onClose={() => setShowSettings(false)}
          wakeLockSupported={wakeLockSupported}
        />
      )}
      {showVocabulary && (
        <VocabularyList
          vocabulary={vocabulary}
          onClose={() => setShowVocabulary(false)}
          onDeleteWord={deleteWord}
          onUpdateWord={updateWord}
        />
      )}
      {showFlashcards && (
        <FlashcardView
          vocabulary={dueWords.length > 0 ? dueWords : nonMasteredWords}
          onClose={() => setShowFlashcards(false)}
          onUpdateWord={updateWord}
        />
      )}
      {showGrammar && (
        <GrammarPanel
          corrections={grammarHistory}
          onClose={() => setShowGrammar(false)}
          onClearHistory={clearHistory}
        />
      )}
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <DanishTutorApp />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
