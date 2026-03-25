
export interface TranslationState {
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  isTranslating: boolean;
  isGeneratingAudio: boolean;
  error: string | null;
}

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
];

export interface VoiceOption {
  name: string;
  label: string;
  gender: 'male' | 'female';
}

export const VOICES: VoiceOption[] = [
  { name: 'Kore', label: 'Cheerful', gender: 'female' },
  { name: 'Zephyr', label: 'Soft', gender: 'female' },
  { name: 'Puck', label: 'Deep', gender: 'male' },
  { name: 'Charon', label: 'Calm', gender: 'male' },
  { name: 'Fenrir', label: 'Brisk', gender: 'male' },
];
