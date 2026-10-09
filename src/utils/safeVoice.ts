import { NativeModules, Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import Voice from '@react-native-voice/voice';

export interface VoiceCallbacks {
  onSpeechResults?: (e: any) => void;
  onSpeechPartialResults?: (e: any) => void;
  onSpeechError?: (e: any) => void;
  onSpeechEnd?: (e?: any) => void;
  onSpeechStart?: (e?: any) => void;
}

export const isVoiceAvailable = (): boolean => {
  return !!NativeModules.Voice || (!!Voice && typeof Voice.start === 'function');
};

export const requestAudioPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  try {
    const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    if (hasPermission) return true;

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission Required',
        message: 'Connect Mobile needs microphone access for Voice Search to recognize your speech.',
        buttonPositive: 'Allow',
        buttonNegative: 'Cancel',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('[safeVoice] Permission request error:', err);
    return false;
  }
};

export const setupVoiceListeners = (callbacks: VoiceCallbacks) => {
  try {
    if (Voice) {
      if (callbacks.onSpeechResults) Voice.onSpeechResults = callbacks.onSpeechResults;
      if (callbacks.onSpeechPartialResults) Voice.onSpeechPartialResults = callbacks.onSpeechPartialResults;
      if (callbacks.onSpeechError) Voice.onSpeechError = callbacks.onSpeechError;
      if (callbacks.onSpeechEnd) Voice.onSpeechEnd = callbacks.onSpeechEnd;
      if (callbacks.onSpeechStart) Voice.onSpeechStart = callbacks.onSpeechStart;
    }
  } catch (err) {
    console.warn('[safeVoice] Listener registration error:', err);
  }
};

export const cleanupVoiceListeners = async () => {
  try {
    if (Voice) {
      try {
        await Voice.stop().catch(() => {});
      } catch (_) {}
      try {
        await Voice.destroy().catch(() => {});
      } catch (_) {}
      try {
        if (typeof Voice.removeAllListeners === 'function') {
          Voice.removeAllListeners();
        }
      } catch (_) {}
    }
  } catch (err) {
    console.warn('[safeVoice] Cleanup error ignored:', err);
  }
};

export const startVoiceRecording = async (locale: string = 'en-IN') => {
  const hasPermission = await requestAudioPermission();
  if (!hasPermission) {
    throw new Error('Microphone permission was denied.');
  }

  if (Voice && typeof Voice.start === 'function') {
    try {
      await Voice.stop().catch(() => {});
      await Voice.start(locale);
      return;
    } catch (err) {
      console.warn('[safeVoice] Native Voice start error:', err);
      throw err;
    }
  }
  throw new Error('Speech recognition module is unavailable on this device.');
};

export const stopVoiceRecording = async () => {
  if (Voice && typeof Voice.stop === 'function') {
    try {
      await Voice.stop().catch(() => {});
    } catch (err) {
      console.warn('[safeVoice] Voice stop error:', err);
    }
  }
};

export default {
  isVoiceAvailable,
  requestAudioPermission,
  setupVoiceListeners,
  cleanupVoiceListeners,
  startVoiceRecording,
  stopVoiceRecording,
};
