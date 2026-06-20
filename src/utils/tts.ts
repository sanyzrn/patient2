/**
 * Text-to-Speech utility for NAFAS
 * SURPRISE-04: Voice Companion (Web Speech API)
 * 
 * Provides functions to read text aloud in Persian/English using the Web Speech API.
 */

/**
 * Speaks text aloud using Web Speech API
 * Automatically detects Persian voices and configures appropriate settings
 */
export function speakText(text: string, lang = 'fa-IR'): void {
  if (!window.speechSynthesis) {
    console.warn('Speech Synthesis API not supported');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;

  // Try to find a voice that matches the language
  const voices = window.speechSynthesis.getVoices();
  const langPrefix = lang.split('-')[0] ?? lang;
  const matchingVoice = voices.find(v => v.lang.startsWith(langPrefix));
  if (matchingVoice) {
    utterance.voice = matchingVoice;
  }

  // Persian speech configuration
  if (lang === 'fa-IR') {
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
  } else {
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
  }

  utterance.volume = 1.0;

  // Speak!
  window.speechSynthesis.speak(utterance);
}

/**
 * Stops any ongoing speech
 */
export function stopSpeaking(): void {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Checks if speech synthesis is currently speaking
 */
export function isSpeaking(): boolean {
  return window.speechSynthesis?.speaking ?? false;
}

/**
 * Gets available voices
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis?.getVoices() ?? [];
}

/**
 * Finds a Persian voice
 */
export function getPersianVoice(): SpeechSynthesisVoice | undefined {
  const voices = getAvailableVoices();
  return voices.find(v => v.lang.startsWith('fa')) || 
         voices.find(v => v.lang === 'fa-IR');
}
