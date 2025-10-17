# Design Document

## Overview

This design document outlines the architecture and implementation approach for enhancing the Danish Tutor application with advanced learning features, improved error handling, accessibility, and user experience improvements. The design maintains the existing real-time voice conversation functionality while adding vocabulary tracking, spaced repetition, customizable settings, and robust error handling.

The enhancements will be implemented using a modular architecture with separate components, hooks, and utilities to maintain code organization and testability.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Application                        │
│                    (DanishTutorApp)                         │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼────────┐    ┌────────▼─────────┐
│  UI Components │    │  Business Logic  │
│                │    │                  │
│ - ChatView     │    │ - VocabTracker   │
│ - Flashcards   │    │ - SRSEngine      │
│ - Settings     │    │ - ErrorHandler   │
│ - TopicPicker  │    │ - AudioManager   │
│ - AudioViz     │    │ - APIRetry       │
└────────┬───────┘    └────────┬─────────┘
         │                     │
         └──────────┬──────────┘
                    │
        ┌───────────▼───────────┐
        │   Data Layer          │
        │                       │
        │ - LocalStorage        │
        │ - State Management    │
        │ - Gemini API          │
        └───────────────────────┘
```

### Component Structure

```
src/
├── components/
│   ├── ErrorBoundary.tsx          # Error boundary wrapper
│   ├── ChatView.tsx                # Main chat interface
│   ├── FlashcardView.tsx          # Flashcard learning mode
│   ├── SettingsPanel.tsx          # Settings configuration
│   ├── TopicSelector.tsx          # Topic-based conversation picker
│   ├── AudioVisualizer.tsx        # Audio quality indicators
│   ├── VocabularyList.tsx         # Vocabulary tracking display
│   ├── GrammarHighlight.tsx       # Grammar correction highlights
│   ├── KeyboardShortcutsHelp.tsx  # Shortcuts help dialog
│   └── LoadingStates.tsx          # Loading indicators
├── hooks/
│   ├── useVocabularyTracker.ts    # Vocabulary tracking logic
│   ├── useSpacedRepetition.ts     # SRS algorithm implementation
│   ├── useAudioSession.ts         # Audio session management
│   ├── useAPIRetry.ts             # API retry logic
│   ├── useSettings.ts             # Settings management
│   ├── useTheme.ts                # Dark mode management
│   ├── useKeyboardShortcuts.ts    # Keyboard shortcuts handler
│   └── useAudioQuality.ts         # Audio quality monitoring
├── utils/
│   ├── vocabularyExtractor.ts     # Extract vocab from conversations
│   ├── srsAlgorithm.ts            # SM-2 spaced repetition
│   ├── grammarAnalyzer.ts         # Grammar correction detection
│   ├── storageManager.ts          # LocalStorage with error handling
│   ├── retryLogic.ts              # Exponential backoff retry
│   └── audioHelpers.ts            # Audio encoding/decoding
├── types/
│   ├── vocabulary.ts              # Vocabulary data types
│   ├── settings.ts                # Settings types
│   └── chat.ts                    # Chat message types
└── constants/
    ├── topics.ts                  # Conversation topics
    ├── voices.ts                  # Available voices
    └── shortcuts.ts               # Keyboard shortcuts
```

## Components and Interfaces

### 1. Error Boundary Component

**Purpose:** Catch and handle React errors gracefully without crashing the entire app.

**Interface:**
```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
```

**Key Features:**
- Catches errors in child components
- Displays user-friendly error message
- Provides reset functionality
- Logs errors for debugging

### 2. Vocabulary Tracking System

**Data Model:**
```typescript
interface VocabularyWord {
  id: string;
  danishWord: string;
  englishTranslation: string;
  context: string;
  firstEncountered: Date;
  lastPracticed: Date;
  practiceCount: number;
  proficiencyLevel: 'new' | 'learning' | 'familiar' | 'mastered';
  srsData: SRSData;
}

interface SRSData {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
}
```

**Hook Interface:**
```typescript
function useVocabularyTracker() {
  return {
    vocabulary: VocabularyWord[];
    addWord: (word: Omit<VocabularyWord, 'id' | 'srsData'>) => void;
    updateWord: (id: string, updates: Partial<VocabularyWord>) => void;
    getWordsDueForReview: () => VocabularyWord[];
    extractVocabularyFromMessage: (message: string) => Promise<VocabularyWord[]>;
  };
}
```

**Implementation Details:**
- Use Gemini API to extract vocabulary from AI responses
- Store vocabulary in localStorage with compression for large datasets
- Implement vocabulary extraction using pattern matching and AI analysis
- Track practice frequency and calculate proficiency levels

### 3. Spaced Repetition System

**Algorithm:** SM-2 (SuperMemo 2) with modifications

**Interface:**
```typescript
interface SRSReview {
  wordId: string;
  quality: 0 | 1 | 2 | 3 | 4 | 5; // 0=complete blackout, 5=perfect recall
}

function useSpacedRepetition() {
  return {
    reviewWord: (review: SRSReview) => void;
    getNextReviewDate: (wordId: string) => Date;
    getDueWords: () => VocabularyWord[];
    dueCount: number;
  };
}
```

**SM-2 Algorithm Implementation:**
```typescript
function calculateNextReview(
  quality: number,
  easeFactor: number,
  interval: number,
  repetitions: number
): { easeFactor: number; interval: number; repetitions: number } {
  // If quality < 3, reset repetitions
  if (quality < 3) {
    return {
      easeFactor: Math.max(1.3, easeFactor - 0.2),
      interval: 1,
      repetitions: 0
    };
  }
  
  // Calculate new ease factor
  const newEaseFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );
  
  // Calculate new interval
  let newInterval: number;
  if (repetitions === 0) {
    newInterval = 1;
  } else if (repetitions === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(interval * newEaseFactor);
  }
  
  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: repetitions + 1
  };
}
```

### 4. Flashcard Component

**Interface:**
```typescript
interface FlashcardProps {
  word: VocabularyWord;
  onReview: (quality: number) => void;
  showContext?: boolean;
}

interface FlashcardViewProps {
  vocabulary: VocabularyWord[];
  onComplete: (stats: ReviewStats) => void;
}

interface ReviewStats {
  totalReviewed: number;
  correctCount: number;
  averageQuality: number;
  timeSpent: number;
}
```

**Features:**
- Flip animation between Danish and English
- Context display from original conversation
- Quality rating buttons (Again, Hard, Good, Easy)
- Progress indicator
- Session statistics

### 5. Grammar Correction System

**Data Model:**
```typescript
interface GrammarCorrection {
  id: string;
  messageIndex: number;
  originalText: string;
  correctedText: string;
  errorType: 'verb' | 'article' | 'word-order' | 'spelling' | 'other';
  explanation: string;
  startIndex: number;
  endIndex: number;
}
```

**Implementation:**
- Use Gemini API to analyze user messages for grammar errors
- Highlight errors inline with visual indicators
- Show corrections on hover/tap
- Store corrections for review

**API Prompt for Grammar Analysis:**
```typescript
const grammarPrompt = `
Analyze the following Danish text for grammatical errors.
Return a JSON array of corrections with this structure:
{
  "corrections": [
    {
      "original": "incorrect text",
      "corrected": "correct text",
      "errorType": "verb|article|word-order|spelling|other",
      "explanation": "brief explanation in English",
      "startIndex": 0,
      "endIndex": 10
    }
  ]
}

Text: "${userMessage}"
`;
```

### 6. Topic-Based Conversation Modes

**Data Model:**
```typescript
interface ConversationTopic {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemInstructionAddition: string;
  suggestedVocabulary: string[];
}

const topics: ConversationTopic[] = [
  {
    id: 'ordering-food',
    name: 'Ordering Food',
    description: 'Practice ordering at restaurants and cafes',
    icon: '🍽️',
    systemInstructionAddition: `
      Focus on restaurant and food-related vocabulary.
      Simulate scenarios like ordering meals, asking about ingredients,
      requesting the bill, etc. Introduce common Danish food terms.
    `,
    suggestedVocabulary: ['menu', 'bestille', 'regning', 'mad', 'drikke']
  },
  // ... more topics
];
```

**Hook Interface:**
```typescript
function useConversationTopic() {
  return {
    currentTopic: ConversationTopic | null;
    setTopic: (topicId: string) => void;
    clearTopic: () => void;
    availableTopics: ConversationTopic[];
  };
}
```

### 7. Settings Panel

**Data Model:**
```typescript
interface AppSettings {
  voice: {
    name: string;
    displayName: string;
  };
  speechSpeed: number; // 0.5 to 2.0
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  theme: 'light' | 'dark' | 'system';
  audioQualityIndicators: boolean;
  grammarCorrections: boolean;
  vocabularyTracking: boolean;
}
```

**Hook Interface:**
```typescript
function useSettings() {
  return {
    settings: AppSettings;
    updateSettings: (updates: Partial<AppSettings>) => void;
    resetSettings: () => void;
  };
}
```

**Available Voices:**
```typescript
const availableVoices = [
  { name: 'Kore', displayName: 'Kore (Default)', gender: 'neutral' },
  { name: 'Puck', displayName: 'Puck', gender: 'neutral' },
  { name: 'Charon', displayName: 'Charon', gender: 'neutral' },
  { name: 'Aoede', displayName: 'Aoede', gender: 'neutral' }
];
```

**Difficulty Level System Instructions:**
```typescript
const difficultyInstructions = {
  beginner: `
    Use simple vocabulary and short sentences.
    Speak slowly and clearly. Repeat important words.
    Provide more English explanations when needed.
  `,
  intermediate: `
    Use everyday vocabulary with some idiomatic expressions.
    Speak at a natural pace. Provide English explanations occasionally.
  `,
  advanced: `
    Use rich vocabulary including idioms and colloquialisms.
    Speak naturally. Minimize English explanations.
  `
};
```

### 8. API Retry Logic

**Interface:**
```typescript
interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

function useAPIRetry<T>(
  apiCall: () => Promise<T>,
  config?: Partial<RetryConfig>
): {
  execute: () => Promise<T>;
  isRetrying: boolean;
  retryCount: number;
  error: Error | null;
  reset: () => void;
}
```

**Implementation:**
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error;
  let delay = config.initialDelay;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (isNonRetryableError(error)) {
        throw error;
      }
      
      if (attempt < config.maxRetries) {
        await sleep(delay);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
      }
    }
  }
  
  throw lastError!;
}

function isNonRetryableError(error: any): boolean {
  // Don't retry on authentication errors, invalid requests, etc.
  return error.status === 401 || error.status === 400;
}
```

### 9. Audio Quality Indicators

**Interface:**
```typescript
interface AudioQualityMetrics {
  inputLevel: number; // 0-100
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  isListening: boolean;
  isSpeaking: boolean;
  latency: number; // milliseconds
}

function useAudioQuality(): AudioQualityMetrics {
  // Monitor audio levels and connection quality
}
```

**Visual Components:**
- Real-time audio level meter (waveform or bars)
- Connection quality indicator (colored dot with label)
- Speaking/listening status indicator
- Latency display (optional, for debugging)

### 10. Dark Mode Implementation

**Theme System:**
```typescript
interface Theme {
  name: 'light' | 'dark';
  colors: {
    primary: string;
    primaryHover: string;
    background: string;
    containerBackground: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    userMessageBg: string;
    modelMessageBg: string;
    // ... more colors
  };
}

const lightTheme: Theme = {
  name: 'light',
  colors: {
    primary: '#4285f4',
    primaryHover: '#357ae8',
    background: '#f8f9fa',
    containerBackground: '#ffffff',
    text: '#3c4043',
    // ... existing light colors
  }
};

const darkTheme: Theme = {
  name: 'dark',
  colors: {
    primary: '#8ab4f8',
    primaryHover: '#aecbfa',
    background: '#202124',
    containerBackground: '#292a2d',
    text: '#e8eaed',
    textSecondary: '#9aa0a6',
    border: '#3c4043',
    error: '#f28b82',
    userMessageBg: '#8ab4f8',
    modelMessageBg: '#3c4043',
    // ... dark mode colors
  }
};
```

**Hook Interface:**
```typescript
function useTheme() {
  return {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
  };
}
```

**Implementation:**
- Use CSS custom properties for theme colors
- Apply theme class to root element
- Persist theme preference in localStorage
- Respect system preference when set to 'system'

### 11. Keyboard Shortcuts

**Shortcuts Configuration:**
```typescript
interface KeyboardShortcut {
  key: string;
  modifiers: ('ctrl' | 'shift' | 'alt' | 'meta')[];
  action: string;
  description: string;
  handler: () => void;
}

const shortcuts: KeyboardShortcut[] = [
  {
    key: ' ',
    modifiers: [],
    action: 'toggle-recording',
    description: 'Start/stop recording',
    handler: toggleRecording
  },
  {
    key: 'Escape',
    modifiers: [],
    action: 'stop-recording',
    description: 'Stop recording',
    handler: stopRecording
  },
  {
    key: 'k',
    modifiers: ['ctrl'],
    action: 'open-settings',
    description: 'Open settings',
    handler: openSettings
  },
  {
    key: 'd',
    modifiers: ['ctrl'],
    action: 'toggle-dark-mode',
    description: 'Toggle dark mode',
    handler: toggleDarkMode
  },
  {
    key: '/',
    modifiers: ['ctrl'],
    action: 'show-shortcuts',
    description: 'Show keyboard shortcuts',
    handler: showShortcutsHelp
  }
];
```

**Hook Interface:**
```typescript
function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
): void {
  // Register keyboard event listeners
  // Handle modifier key combinations
  // Prevent default browser behavior when needed
}
```

### 12. Enhanced Loading States

**Loading State Types:**
```typescript
type LoadingState = 
  | { type: 'idle' }
  | { type: 'loading'; message?: string }
  | { type: 'retrying'; attempt: number; maxAttempts: number }
  | { type: 'success' }
  | { type: 'error'; error: Error };

interface LoadingIndicatorProps {
  state: LoadingState;
  inline?: boolean;
}
```

**Components:**
- Skeleton loaders for translations
- Typing indicator for AI responses
- Audio generation indicator
- Retry progress indicator
- Spinner with contextual messages

### 13. Screen Reader Support

**ARIA Implementation:**
```typescript
// Live region for chat messages
<div 
  role="log" 
  aria-live="polite" 
  aria-atomic="false"
  aria-relevant="additions"
>
  {chatHistory.map(msg => (
    <div role="article" aria-label={`${msg.role} says: ${msg.text}`}>
      {msg.text}
    </div>
  ))}
</div>

// Recording button with status announcement
<button
  aria-label={isRecording ? 'Stop recording' : 'Start recording'}
  aria-pressed={isRecording}
  onClick={handleMicClick}
>
  <span className="sr-only">
    {isRecording ? 'Recording in progress' : 'Press to start recording'}
  </span>
</button>

// Status announcements
<div role="status" aria-live="assertive" className="sr-only">
  {statusMessage}
</div>
```

**Accessibility Features:**
- Proper heading hierarchy (h1, h2, h3)
- Landmark regions (main, navigation, complementary)
- Focus management for modals and panels
- Keyboard navigation for all interactive elements
- Skip links for navigation
- Alt text for all images and icons

## Data Models

### Complete Type Definitions

```typescript
// Chat Message with enhancements
interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  translation?: string;
  timestamp: Date;
  grammarCorrections?: GrammarCorrection[];
  extractedVocabulary?: string[]; // IDs of vocabulary words
}

// Vocabulary Word (complete)
interface VocabularyWord {
  id: string;
  danishWord: string;
  englishTranslation: string;
  context: string;
  partOfSpeech?: string;
  firstEncountered: Date;
  lastPracticed: Date;
  practiceCount: number;
  proficiencyLevel: 'new' | 'learning' | 'familiar' | 'mastered';
  srsData: SRSData;
  relatedWords?: string[]; // IDs of related vocabulary
  topicTags?: string[];
}

// SRS Data
interface SRSData {
  easeFactor: number; // 1.3 to 2.5
  interval: number; // days until next review
  repetitions: number;
  nextReviewDate: Date;
  lastQuality?: number; // 0-5
}

// Grammar Correction (complete)
interface GrammarCorrection {
  id: string;
  messageId: string;
  originalText: string;
  correctedText: string;
  errorType: 'verb' | 'article' | 'word-order' | 'spelling' | 'preposition' | 'other';
  explanation: string;
  startIndex: number;
  endIndex: number;
  severity: 'minor' | 'moderate' | 'major';
}

// App Settings (complete)
interface AppSettings {
  voice: {
    name: string;
    displayName: string;
  };
  speechSpeed: number;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  theme: 'light' | 'dark' | 'system';
  audioQualityIndicators: boolean;
  grammarCorrections: boolean;
  vocabularyTracking: boolean;
  autoTranslate: boolean;
  keyboardShortcuts: boolean;
}

// Conversation Topic (complete)
interface ConversationTopic {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemInstructionAddition: string;
  suggestedVocabulary: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all';
}
```

## Error Handling

### Error Types

```typescript
enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  AUDIO_ERROR = 'AUDIO_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  recoverable: boolean;
  retryable: boolean;
}
```

### Error Handling Strategy

1. **Network Errors:** Automatic retry with exponential backoff
2. **API Errors:** Display user-friendly message, offer manual retry
3. **Audio Errors:** Provide troubleshooting steps, check permissions
4. **Storage Errors:** Offer to clear data, export before clearing
5. **Permission Errors:** Show permission request UI with instructions

## Testing Strategy

### Unit Tests
- Vocabulary extraction logic
- SRS algorithm calculations
- Grammar correction parsing
- Retry logic with various error scenarios
- Theme switching
- Keyboard shortcut handlers

### Integration Tests
- Vocabulary tracking through full conversation flow
- Flashcard review session
- Settings persistence and application
- Error boundary catching and recovery
- API retry with mock failures

### Accessibility Tests
- Screen reader compatibility
- Keyboard navigation
- ARIA attribute correctness
- Focus management
- Color contrast ratios

### Performance Tests
- LocalStorage size limits
- Large vocabulary list rendering
- Audio processing latency
- Theme switching performance

## Migration Strategy

### Phase 1: Core Infrastructure
1. Implement error boundary
2. Add retry logic to existing API calls
3. Set up theme system and dark mode
4. Implement settings panel with basic options

### Phase 2: Learning Features
1. Add vocabulary tracking
2. Implement flashcard system
3. Add spaced repetition algorithm
4. Create vocabulary list view

### Phase 3: Enhanced Features
1. Add grammar correction system
2. Implement topic-based conversations
3. Add audio quality indicators
4. Implement keyboard shortcuts

### Phase 4: Accessibility & Polish
1. Enhance screen reader support
2. Add loading states
3. Improve error messages
4. Add onboarding tutorial

## Performance Considerations

### LocalStorage Management
- Implement data compression for large datasets
- Set size limits and warn users when approaching limits
- Provide export/import functionality
- Implement data cleanup for old entries

### Optimization Strategies
- Lazy load flashcard and vocabulary components
- Debounce grammar correction API calls
- Memoize expensive calculations (SRS, vocabulary extraction)
- Use React.memo for frequently re-rendered components
- Implement virtual scrolling for large vocabulary lists

### Bundle Size
- Code split by feature (flashcards, settings, etc.)
- Lazy load non-critical components
- Tree-shake unused utilities
- Minimize dependencies

## Security Considerations

- Sanitize user input before API calls
- Validate data from localStorage before parsing
- Implement rate limiting for API calls
- Don't expose API keys in client code (use environment variables)
- Implement CORS properly if deploying to custom domain

## Future Enhancements

- Cloud sync for vocabulary and progress
- Multiple language support (beyond Danish)
- Voice recording playback for pronunciation comparison
- Achievement system and gamification
- Social features (share progress, compete with friends)
- Offline mode with cached lessons
- Export vocabulary to Anki or other SRS apps
