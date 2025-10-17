// Conversation topic configurations

import { ConversationTopic } from '../types';

export const CONVERSATION_TOPICS: ConversationTopic[] = [
  {
    id: 'general',
    name: 'General Conversation',
    description: 'Free-form conversation on any topic',
    icon: '💬',
    systemInstructionAddition: '',
    suggestedVocabulary: [],
    difficulty: 'all'
  },
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
    suggestedVocabulary: ['menu', 'bestille', 'regning', 'mad', 'drikke'],
    difficulty: 'beginner'
  },
  {
    id: 'directions',
    name: 'Asking for Directions',
    description: 'Learn to navigate and ask for directions',
    icon: '🗺️',
    systemInstructionAddition: `
      Focus on location and direction vocabulary.
      Practice asking for and giving directions, discussing locations,
      and understanding spatial relationships in Danish.
    `,
    suggestedVocabulary: ['hvor', 'venstre', 'højre', 'lige ud', 'gade'],
    difficulty: 'beginner'
  },
  {
    id: 'shopping',
    name: 'Shopping',
    description: 'Practice shopping conversations',
    icon: '🛍️',
    systemInstructionAddition: `
      Focus on shopping and retail vocabulary.
      Practice asking about prices, sizes, colors, and making purchases.
      Introduce common shopping phrases and numbers.
    `,
    suggestedVocabulary: ['pris', 'størrelse', 'farve', 'købe', 'betale'],
    difficulty: 'beginner'
  },
  {
    id: 'greetings',
    name: 'Greetings & Introductions',
    description: 'Master basic greetings and introductions',
    icon: '👋',
    systemInstructionAddition: `
      Focus on greeting phrases and self-introduction.
      Practice formal and informal greetings, introducing yourself,
      and basic small talk in Danish.
    `,
    suggestedVocabulary: ['hej', 'goddag', 'jeg hedder', 'hvordan går det', 'tak'],
    difficulty: 'beginner'
  },
  {
    id: 'travel',
    name: 'Travel & Transportation',
    description: 'Navigate travel situations',
    icon: '✈️',
    systemInstructionAddition: `
      Focus on travel and transportation vocabulary.
      Practice booking tickets, asking about schedules, and discussing
      different modes of transportation in Danish.
    `,
    suggestedVocabulary: ['tog', 'bus', 'billet', 'station', 'ankomst'],
    difficulty: 'intermediate'
  },
  {
    id: 'work',
    name: 'Work & Business',
    description: 'Professional and workplace conversations',
    icon: '💼',
    systemInstructionAddition: `
      Focus on workplace and professional vocabulary.
      Practice discussing jobs, meetings, projects, and professional
      interactions in Danish.
    `,
    suggestedVocabulary: ['arbejde', 'møde', 'projekt', 'kollega', 'chef'],
    difficulty: 'intermediate'
  },
  {
    id: 'hobbies',
    name: 'Hobbies & Interests',
    description: 'Talk about your interests and activities',
    icon: '🎨',
    systemInstructionAddition: `
      Focus on hobbies, interests, and leisure activities.
      Practice discussing what you like to do in your free time,
      sports, arts, and entertainment in Danish.
    `,
    suggestedVocabulary: ['hobby', 'sport', 'musik', 'læse', 'spille'],
    difficulty: 'intermediate'
  },
  {
    id: 'health',
    name: 'Health & Medical',
    description: 'Discuss health and medical topics',
    icon: '🏥',
    systemInstructionAddition: `
      Focus on health and medical vocabulary.
      Practice describing symptoms, talking to doctors, and discussing
      health-related topics in Danish.
    `,
    suggestedVocabulary: ['læge', 'syg', 'medicin', 'hospital', 'smerte'],
    difficulty: 'advanced'
  }
];
