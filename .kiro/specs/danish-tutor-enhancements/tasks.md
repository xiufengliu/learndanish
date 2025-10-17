# Implementation Plan

- [x] 1. Set up project structure and type definitions
  - Create new directories for components, hooks, utils, types, and constants
  - Define TypeScript interfaces for vocabulary, settings, chat messages, and SRS data
  - Create constants files for topics, voices, and keyboard shortcuts
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 9.1_

- [x] 2. Implement error boundary component
  - [x] 2.1 Create ErrorBoundary component with error catching logic
    - Implement componentDidCatch and getDerivedStateFromError lifecycle methods
    - Create error state management
    - _Requirements: 6.1, 6.2_
  
  - [x] 2.2 Create error fallback UI component
    - Design user-friendly error display with recovery options
    - Add reset button to clear error state
    - Include error logging to console
    - _Requirements: 6.2, 6.3, 6.4_
  
  - [x] 2.3 Wrap main application with ErrorBoundary
    - Update root render to include ErrorBoundary wrapper
    - Test error boundary with intentional errors
    - _Requirements: 6.1, 6.5_

- [x] 3. Implement API retry logic and error handling
  - [x] 3.1 Create retry utility with exponential backoff
    - Implement retryWithBackoff function with configurable parameters
    - Add error type detection for retryable vs non-retryable errors
    - _Requirements: 7.1, 7.4_
  
  - [x] 3.2 Create useAPIRetry hook
    - Implement hook with retry state management
    - Add retry count and error tracking
    - Provide manual retry functionality
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x] 3.3 Integrate retry logic into existing API calls
    - Wrap Gemini API calls with retry logic
    - Update translation API calls with retry
    - Add retry UI indicators
    - _Requirements: 7.2, 7.5_

- [x] 4. Implement theme system and dark mode
  - [x] 4.1 Create theme definitions and CSS custom properties
    - Define light and dark theme color palettes
    - Create CSS custom properties for all theme colors
    - Ensure sufficient contrast for accessibility
    - _Requirements: 10.1, 10.2_
  
  - [x] 4.2 Create useTheme hook
    - Implement theme state management
    - Add system theme detection
    - Persist theme preference in localStorage
    - _Requirements: 10.3, 10.4_
  
  - [x] 4.3 Update all components to use theme colors
    - Replace hardcoded colors with CSS custom properties
    - Update chat bubbles, buttons, and backgrounds
    - Test all UI elements in both themes
    - _Requirements: 10.5_
  
  - [x] 4.4 Add theme toggle button to UI
    - Create theme toggle button component
    - Add to title bar or settings panel
    - Provide visual feedback on theme change
    - _Requirements: 10.1_

- [x] 5. Implement settings panel
  - [x] 5.1 Create settings data model and storage
    - Define AppSettings interface
    - Create useSettings hook with localStorage persistence
    - Implement default settings
    - _Requirements: 9.5_
  
  - [x] 5.2 Create SettingsPanel component UI
    - Design settings panel layout with sections
    - Create voice selection dropdown
    - Add speech speed slider
    - Add difficulty level selector
    - _Requirements: 9.1_
  
  - [x] 5.3 Implement voice selection functionality
    - Create voice options list
    - Update Gemini API config when voice changes
    - Apply voice changes to new sessions
    - _Requirements: 9.2_
  
  - [x] 5.4 Implement speech speed control
    - Add speed slider (0.5x to 2.0x)
    - Apply playback rate to audio output
    - _Requirements: 9.3_
  
  - [x] 5.5 Implement difficulty level system
    - Create difficulty-specific system instructions
    - Update AI tutor behavior based on difficulty
    - Apply difficulty changes to conversation
    - _Requirements: 9.4_

- [x] 6. Implement vocabulary tracking system
  - [x] 6.1 Create vocabulary data model and storage
    - Define VocabularyWord interface
    - Create storage manager with localStorage
    - Implement data compression for large datasets
    - _Requirements: 1.5_
  
  - [x] 6.2 Create vocabulary extraction utility
    - Implement AI-based vocabulary extraction from messages
    - Parse Danish words with English translations
    - Extract context from conversations
    - _Requirements: 1.1_
  
  - [x] 6.3 Create useVocabularyTracker hook
    - Implement vocabulary state management
    - Add word tracking on new messages
    - Update practice counts and timestamps
    - Calculate proficiency levels
    - _Requirements: 1.2, 1.4_
  
  - [x] 6.4 Create VocabularyList component
    - Display all tracked vocabulary words
    - Show translations, practice counts, and proficiency
    - Add filtering and sorting options
    - _Requirements: 1.3_
  
  - [x] 6.5 Integrate vocabulary tracking into chat flow
    - Extract vocabulary from AI responses automatically
    - Update vocabulary on message receipt
    - Store vocabulary IDs with messages
    - _Requirements: 1.1, 1.2_

- [x] 7. Implement spaced repetition system
  - [x] 7.1 Implement SM-2 algorithm
    - Create SRS calculation functions
    - Implement ease factor and interval calculations
    - Handle quality ratings (0-5)
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 7.2 Create useSpacedRepetition hook
    - Implement review scheduling logic
    - Track due words and review dates
    - Update SRS data after reviews
    - _Requirements: 5.1, 5.5_
  
  - [x] 7.3 Add review notification system
    - Display badge with due word count
    - Show notification when words are due
    - _Requirements: 5.4_

- [x] 8. Implement flashcard system
  - [x] 8.1 Create Flashcard component
    - Design card flip animation
    - Display Danish word on front, English on back
    - Show context from conversation
    - _Requirements: 2.2_
  
  - [x] 8.2 Create FlashcardView component
    - Implement flashcard session flow
    - Add quality rating buttons (Again, Hard, Good, Easy)
    - Show progress indicator
    - _Requirements: 2.1, 2.3_
  
  - [x] 8.3 Integrate SRS with flashcard reviews
    - Update SRS data based on quality ratings
    - Schedule next review dates
    - Track review statistics
    - _Requirements: 2.3, 5.5_
  
  - [x] 8.4 Create flashcard session summary
    - Display session statistics
    - Show words reviewed and accuracy
    - Display next review dates
    - _Requirements: 2.4_
  
  - [x] 8.5 Add empty state for flashcards
    - Show message when no vocabulary exists
    - Encourage users to have conversations
    - _Requirements: 2.5_

- [x] 9. Implement grammar correction system
  - [x] 9.1 Create grammar analysis utility
    - Implement AI-based grammar checking
    - Parse correction responses from Gemini API
    - Categorize error types
    - _Requirements: 3.1, 3.3_
  
  - [x] 9.2 Create GrammarHighlight component
    - Highlight grammar errors inline in messages
    - Add visual indicators for error severity
    - _Requirements: 3.1_
  
  - [x] 9.3 Implement correction tooltip
    - Show explanation on hover/tap
    - Display corrected text
    - Show error type and category
    - _Requirements: 3.2_
  
  - [x] 9.4 Store grammar corrections for review
    - Save corrections with messages
    - Create corrections history
    - _Requirements: 3.4_
  
  - [x] 9.5 Add positive feedback for correct grammar
    - Detect grammatically correct messages
    - Show encouragement without highlighting
    - _Requirements: 3.5_

- [x] 10. Implement topic-based conversation modes
  - [x] 10.1 Create conversation topics data
    - Define topic objects with metadata
    - Create system instruction additions for each topic
    - Add suggested vocabulary for topics
    - _Requirements: 4.1_
  
  - [x] 10.2 Create TopicSelector component
    - Display available topics with icons
    - Show topic descriptions
    - Filter by difficulty level
    - _Requirements: 4.1_
  
  - [x] 10.3 Create useConversationTopic hook
    - Manage current topic state
    - Update AI system instructions when topic changes
    - Persist topic selection
    - _Requirements: 4.2, 4.4_
  
  - [x] 10.4 Display current topic in UI
    - Show active topic prominently
    - Add option to change or clear topic
    - _Requirements: 4.3_
  
  - [x] 10.5 Create topic completion summary
    - Show vocabulary learned in topic context
    - Display topic-specific phrases practiced
    - _Requirements: 4.5_

- [x] 11. Implement audio quality indicators
  - [x] 11.1 Create useAudioQuality hook
    - Monitor microphone input levels
    - Track connection quality metrics
    - Detect listening and speaking states
    - _Requirements: 8.1, 8.3_
  
  - [x] 11.2 Create AudioVisualizer component
    - Display real-time audio level meter
    - Show waveform or bar visualization
    - _Requirements: 8.1_
  
  - [x] 11.3 Create connection quality indicator
    - Display connection status with colored indicator
    - Show quality labels (excellent, good, fair, poor)
    - _Requirements: 8.2_
  
  - [x] 11.4 Add microphone permission handling
    - Detect permission issues
    - Display clear permission instructions
    - _Requirements: 8.4_
  
  - [x] 11.5 Add speaking indicator
    - Show visual feedback when AI is speaking
    - Display audio playback status
    - _Requirements: 8.5_

- [x] 12. Implement keyboard shortcuts
  - [x] 12.1 Create keyboard shortcuts configuration
    - Define shortcut mappings
    - Create shortcuts help content
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [x] 12.2 Create useKeyboardShortcuts hook
    - Implement keyboard event listeners
    - Handle modifier key combinations
    - Prevent default browser behavior when needed
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [x] 12.3 Create KeyboardShortcutsHelp component
    - Display all available shortcuts
    - Show keyboard key visualizations
    - Make accessible via Ctrl/Cmd + /
    - _Requirements: 11.5_
  
  - [x] 12.4 Add visual feedback for shortcuts
    - Show confirmation when shortcut is used
    - Display toast or brief animation
    - _Requirements: 11.6_
  
  - [x] 12.5 Add settings option to enable/disable shortcuts
    - Allow users to turn off keyboard shortcuts
    - Persist preference in settings
    - _Requirements: 11.6_

- [x] 13. Implement enhanced loading states
  - [x] 13.1 Create LoadingIndicator component
    - Design spinner with contextual messages
    - Create skeleton loaders for translations
    - _Requirements: 12.1_
  
  - [x] 13.2 Add typing indicator for AI responses
    - Show indicator when AI is processing
    - Display in chat area
    - _Requirements: 12.3_
  
  - [x] 13.3 Add translation loading states
    - Show spinner in tooltip during translation
    - Display progress for multiple translations
    - _Requirements: 12.1, 12.2_
  
  - [x] 13.4 Add audio generation indicator
    - Show visual feedback when audio is being generated
    - Display in appropriate UI location
    - _Requirements: 12.4_
  
  - [x] 13.5 Add timeout messages for long operations
    - Display message when loading exceeds expected time
    - Reassure user that operation is still in progress
    - _Requirements: 12.5_

- [x] 14. Implement screen reader support and accessibility
  - [x] 14.1 Add ARIA live regions for chat messages
    - Implement role="log" for chat history
    - Add aria-live="polite" for new messages
    - Ensure messages are announced properly
    - _Requirements: 13.1_
  
  - [x] 14.2 Add ARIA labels and descriptions
    - Label all interactive elements descriptively
    - Add aria-pressed for toggle buttons
    - Include aria-label for icon buttons
    - _Requirements: 13.3_
  
  - [x] 14.3 Implement status announcements
    - Create live region for status messages
    - Announce recording state changes
    - Announce errors and important events
    - _Requirements: 13.2, 13.5_
  
  - [x] 14.4 Add proper heading hierarchy
    - Structure content with h1, h2, h3 tags
    - Add landmark regions (main, nav, complementary)
    - Implement skip links for navigation
    - _Requirements: 13.6_
  
  - [x] 14.5 Ensure keyboard navigation
    - Make all interactive elements keyboard accessible
    - Implement proper focus management
    - Add focus indicators
    - _Requirements: 13.3_
  
  - [x] 14.6 Make flashcards accessible
    - Ensure flashcard content is announced
    - Make rating buttons keyboard accessible
    - Provide clear instructions for screen readers
    - _Requirements: 13.4_

- [x] 15. Refactor main application component
  - [x] 15.1 Extract audio session logic to useAudioSession hook
    - Move session management to custom hook
    - Separate concerns from main component
    - _Requirements: 7.5_
  
  - [x] 15.2 Create ChatView component
    - Extract chat display logic
    - Move message rendering to separate component
    - _Requirements: 1.1, 3.1_
  
  - [x] 15.3 Integrate all new features into main app
    - Add navigation between chat, flashcards, vocabulary, and settings
    - Implement tab or view switching
    - Ensure smooth transitions between features
    - _Requirements: All_
  
  - [x] 15.4 Add onboarding tutorial for first-time users
    - Create welcome screen with feature overview
    - Add tooltips for key features
    - Store onboarding completion in localStorage
    - _Requirements: All_

- [x] 16. Testing and polish
  - [x] 16.1 Test error boundary with various error scenarios
    - Trigger errors in different components
    - Verify recovery functionality
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 16.2 Test API retry logic
    - Simulate network failures
    - Test exponential backoff timing
    - Verify retry UI indicators
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [x] 16.3 Test vocabulary tracking and SRS
    - Verify vocabulary extraction accuracy
    - Test SRS algorithm calculations
    - Ensure proper review scheduling
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 16.4 Test accessibility with screen readers
    - Test with NVDA, JAWS, or VoiceOver
    - Verify all content is announced
    - Test keyboard navigation
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_
  
  - [x] 16.5 Test theme switching and persistence
    - Verify all colors update correctly
    - Test system theme detection
    - Ensure theme persists across sessions
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 16.6 Test keyboard shortcuts
    - Verify all shortcuts work correctly
    - Test modifier key combinations
    - Ensure no conflicts with browser shortcuts
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  
  - [x] 16.7 Test on mobile devices
    - Verify responsive design
    - Test touch interactions
    - Ensure mobile-specific features work
    - _Requirements: All_
  
  - [x] 16.8 Performance testing
    - Test with large vocabulary lists
    - Verify localStorage size management
    - Check for memory leaks
    - _Requirements: 1.5, 6.1_
