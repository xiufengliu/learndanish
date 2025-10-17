import React from 'react';
import { AppSettings } from '../types/settings';
import { AVAILABLE_VOICES } from '../constants/voices';

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdateSettings, onClose }) => {
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose} aria-label="Close settings">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" aria-hidden="true">
              <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
            </svg>
          </button>
        </div>

        <div className="settings-content">
          {/* Voice Selection */}
          <div className="setting-group">
            <label htmlFor="voice-select">Voice</label>
            <select
              id="voice-select"
              value={settings.voice.name}
              onChange={(e) => {
                const voice = AVAILABLE_VOICES.find(v => v.name === e.target.value);
                if (voice) {
                  onUpdateSettings({ voice: { name: voice.name, displayName: voice.displayName } });
                }
              }}
            >
              {AVAILABLE_VOICES.map(voice => (
                <option key={voice.name} value={voice.name}>
                  {voice.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Speech Speed */}
          <div className="setting-group">
            <label htmlFor="speed-slider">
              Speech Speed: {settings.speechSpeed.toFixed(1)}x
            </label>
            <input
              id="speed-slider"
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.speechSpeed}
              onChange={(e) => onUpdateSettings({ speechSpeed: parseFloat(e.target.value) })}
            />
            <div className="slider-labels">
              <span>0.5x</span>
              <span>1.0x</span>
              <span>2.0x</span>
            </div>
          </div>

          {/* Difficulty Level */}
          <div className="setting-group">
            <label>Difficulty Level</label>
            <div className="radio-group">
              {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
                <label key={level} className="radio-label">
                  <input
                    type="radio"
                    name="difficulty"
                    value={level}
                    checked={settings.difficultyLevel === level}
                    onChange={(e) => onUpdateSettings({ difficultyLevel: e.target.value as any })}
                  />
                  <span>{level.charAt(0).toUpperCase() + level.slice(1)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="setting-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.audioQualityIndicators}
                onChange={(e) => onUpdateSettings({ audioQualityIndicators: e.target.checked })}
              />
              <span>Show audio quality indicators</span>
            </label>
          </div>

          <div className="setting-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.grammarCorrections}
                onChange={(e) => onUpdateSettings({ grammarCorrections: e.target.checked })}
              />
              <span>Enable grammar corrections</span>
            </label>
          </div>

          <div className="setting-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.vocabularyTracking}
                onChange={(e) => onUpdateSettings({ vocabularyTracking: e.target.checked })}
              />
              <span>Track vocabulary automatically</span>
            </label>
          </div>

          <div className="setting-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.keyboardShortcuts}
                onChange={(e) => onUpdateSettings({ keyboardShortcuts: e.target.checked })}
              />
              <span>Enable keyboard shortcuts</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
