// Available voice configurations for Gemini

export interface Voice {
  name: string;
  displayName: string;
  gender: 'neutral';
}

export const AVAILABLE_VOICES: Voice[] = [
  { name: 'Kore', displayName: 'Kore (Default)', gender: 'neutral' },
  { name: 'Puck', displayName: 'Puck', gender: 'neutral' },
  { name: 'Charon', displayName: 'Charon', gender: 'neutral' },
  { name: 'Aoede', displayName: 'Aoede', gender: 'neutral' }
];
