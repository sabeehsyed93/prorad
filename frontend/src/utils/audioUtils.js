/**
 * Utility functions for audio recording and processing
 */

// Convert audio blob to base64
export const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Calculate audio levels from analyser data
export const calculateAudioLevel = (dataArray) => {
  if (!dataArray || dataArray.length === 0) return 0;
  
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i];
  }
  const average = sum / dataArray.length;
  
  // Normalize to 0-100 range with some amplification for better visualization
  return Math.min(100, Math.max(0, average * 1.5));
};

// Create audio context and analyser
export const createAudioAnalyser = (stream) => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioContext.createAnalyser();
  const microphone = audioContext.createMediaStreamSource(stream);
  
  microphone.connect(analyser);
  analyser.fftSize = 256;
  
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  return { analyser, dataArray, audioContext };
};

// Check if browser supports required audio APIs
export const checkAudioSupport = () => {
  const issues = [];
  
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    issues.push("Your browser doesn't support audio recording. Please try a modern browser like Chrome, Firefox, or Edge.");
  }
  
  if (!window.AudioContext && !window.webkitAudioContext) {
    issues.push("AudioContext is not supported in this browser.");
  }
  
  if (!window.MediaRecorder) {
    issues.push("MediaRecorder is not supported in this browser.");
  }
  
  return {
    isSupported: issues.length === 0,
    issues
  };
};

// Get supported MIME types for audio recording
export const getSupportedMimeTypes = () => {
  const types = [
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/mpeg'
  ];
  
  return types.filter(type => MediaRecorder.isTypeSupported(type));
};
