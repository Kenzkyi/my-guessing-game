let audioCtx = null;
const bufferCache = {};

export const initAudio = async () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Essential: Resume the context on a user gesture
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
};

export const loadSound = async (name, url) => {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    bufferCache[name] = await audioCtx.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.error(error);
  }
};

export const playSound = (name, durationLimit = null) => {
  if (!audioCtx || !bufferCache[name]) return;

  const source = audioCtx.createBufferSource();
  const gainNode = audioCtx.createGain(); // Create a volume controller

  source.buffer = bufferCache[name];

  source.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  const startTime = audioCtx.currentTime;
  source.start(startTime);

  if (durationLimit) {
    // Start fading out 0.5s before the limit
    const fadeTime = 0.5;
    gainNode.gain.setValueAtTime(1, startTime + durationLimit - fadeTime);
    gainNode.gain.linearRampToValueAtTime(0, startTime + durationLimit);

    source.stop(startTime + durationLimit);
  }
};
