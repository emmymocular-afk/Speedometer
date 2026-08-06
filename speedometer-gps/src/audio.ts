/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let audioCtx: AudioContext | null = null;
let lastSirenTime = 0;
let lastSpeechTime = 0;

// Initialize AudioContext lazily on user gesture to avoid browser autoplay bans
const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    // @ts-ignore
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  // Resume if suspended (browser security blocks audio until first click)
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

/**
 * Plays a double beep warnings using oscillator nodes for maximum reliability
 */
export const playSirenBeep = (hz = 880, duration = 0.15) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    const now = Date.now();
    // Throttle beep sound once every 800ms
    if (now - lastSirenTime < 800) return;
    lastSirenTime = now;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(hz, ctx.currentTime);
    osc.frequency.setValueAtTime(hz * 1.5, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.error('Lỗi khi phát còi cảnh báo:', e);
  }
};

/**
 * Text-to-Speech alert in Vietnamese or English
 */
export const speakWarning = (currentSpeed: number, limit: number, buffer = 0, locale: 'vi' | 'en' = 'vi') => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const now = Date.now();
  // Throttle speech warnings once every 10 seconds to avoid annoying or buggy overlaps
  if (now - lastSpeechTime < 10000) return;
  lastSpeechTime = now;

  try {
    // If speaking, cancel ongoing speeches to prioritize the latest speed info
    window.speechSynthesis.cancel();

    const roundedSpeed = Math.round(currentSpeed);
    const roundedLimit = Math.round(limit);
    
    let text = '';
    if (locale === 'en') {
      if (limit === 0) {
        text = 'Critical security warning! Motorcycles are strictly prohibited on national expressways! Please exit the expressway immediately!';
      } else {
        text = `Warning! You are travelling at ${roundedSpeed} kilometers per hour, exceeding the allowed speed limit of ${roundedLimit} kilometers per hour! Please slow down!`;
      }
    } else {
      if (limit === 0) {
        text = 'Cảnh báo đặc biệt! Xe máy bị cấm hoàn toàn trên đường cao tốc Việt Nam! Vui lòng giảm tốc độ và di chuyển ra khỏi cao tốc ngay lập tức!';
      } else {
        text = `Cảnh báo! Bạn đang đi với tốc độ ${roundedSpeed} ki lô mét trên giờ, vượt quá giới hạn cho phép là ${roundedLimit} ki lô mét trên giờ! Vui lòng giảm tốc độ!`;
      }
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale === 'en' ? 'en-US' : 'vi-VN';
    utterance.rate = 1.05; // Slightly faster for urgent alerts
    utterance.volume = 1.0;

    // Fetch voices and try to match
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => 
      locale === 'en' 
        ? (v.lang.startsWith('en') || v.lang.includes('Google US English')) 
        : (v.lang.startsWith('vi') || v.lang.includes('vietnam') || v.lang.includes('Vietnam'))
    );
    if (voice) {
      utterance.voice = voice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error('Lỗi phát âm cảnh báo giọng nói:', e);
  }
};

/**
 * General speech announcement (e.g. system instructions, modes, profile changes)
 */
export const announceSystem = (text: string, locale: 'vi' | 'en' = 'vi') => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale === 'en' ? 'en-US' : 'vi-VN';
    utterance.rate = 1.0;
    utterance.volume = 0.8;
    
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => 
      locale === 'en' ? v.lang.startsWith('en') : v.lang.startsWith('vi')
    );
    if (voice) {
      utterance.voice = voice;
    }
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error('Lỗi thông báo hệ thống:', e);
  }
};
