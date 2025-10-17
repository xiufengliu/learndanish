// Keyboard shortcut configurations

export interface KeyboardShortcut {
  key: string;
  modifiers: ('ctrl' | 'shift' | 'alt' | 'meta')[];
  action: string;
  description: string;
}

export const KEYBOARD_SHORTCUTS: Omit<KeyboardShortcut, 'handler'>[] = [
  {
    key: ' ',
    modifiers: [],
    action: 'toggle-recording',
    description: 'Start/stop recording'
  },
  {
    key: 'Escape',
    modifiers: [],
    action: 'stop-recording',
    description: 'Stop recording'
  },
  {
    key: 'k',
    modifiers: ['ctrl'],
    action: 'open-settings',
    description: 'Open settings'
  },
  {
    key: 'd',
    modifiers: ['ctrl'],
    action: 'toggle-dark-mode',
    description: 'Toggle dark mode'
  },
  {
    key: '/',
    modifiers: ['ctrl'],
    action: 'show-shortcuts',
    description: 'Show keyboard shortcuts'
  },
  {
    key: 'v',
    modifiers: ['ctrl'],
    action: 'open-vocabulary',
    description: 'Open vocabulary list'
  },
  {
    key: 'f',
    modifiers: ['ctrl'],
    action: 'open-flashcards',
    description: 'Open flashcards'
  },
  {
    key: 't',
    modifiers: ['ctrl'],
    action: 'open-topics',
    description: 'Open topic selector'
  }
];
