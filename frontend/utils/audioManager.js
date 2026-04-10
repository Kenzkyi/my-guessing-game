// utils/audioManager.js

let audioContext = null; // Hold the instance here
const bufferCache = {};

export const initAudio = async () => {
  // 1. Check if we are in a browser environment
  if (typeof window === "undefined") return null;

  // 2. If it doesn't exist yet, create it
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.error("Web Audio API is not supported in this browser");
      return null;
    }
    audioContext = new AudioContextClass();
  }

  // 3. CRITICAL: You must return the context!
  return audioContext;
};

export const resumeAudio = async () => {
  const ctx = await initAudio();

  // 4. Guard against null (if initAudio failed or ran on server)
  if (!ctx) return;
  console.log(ctx);

  if (ctx.state === "suspended") {
    await ctx.resume();
    console.log("AudioContext resumed successfully!");
  }
};

export const loadSound = async (name, url) => {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    bufferCache[name] = await audioContext.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.error(error);
  }
};

export const playSound = (name, durationLimit = null) => {
  if (!audioContext || !bufferCache[name]) return;

  const source = audioContext.createBufferSource();
  const gainNode = audioContext.createGain(); // Create a volume controller

  source.buffer = bufferCache[name];

  source.connect(gainNode);
  gainNode.connect(audioContext.destination);

  const startTime = audioContext.currentTime;
  source.start(startTime);

  if (durationLimit) {
    // Start fading out 0.5s before the limit
    const fadeTime = 0.5;
    gainNode.gain.setValueAtTime(1, startTime + durationLimit - fadeTime);
    gainNode.gain.linearRampToValueAtTime(0, startTime + durationLimit);

    source.stop(startTime + durationLimit);
  }
};
