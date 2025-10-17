// Conversation topic type definitions

export interface ConversationTopic {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemInstructionAddition: string;
  suggestedVocabulary: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all';
}
