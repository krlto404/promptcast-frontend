
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // Ensure the underlying buffer is aligned for Int16Array (2-byte alignment)
  // If not, we slice it to get a fresh, aligned ArrayBuffer
  const bufferToUse = data.byteOffset % 2 === 0 ? data.buffer : data.slice().buffer;
  const offsetToUse = data.byteOffset % 2 === 0 ? data.byteOffset : 0;
  
  const dataInt16 = new Int16Array(bufferToUse, offsetToUse, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function createSilenceBuffer(ctx: AudioContext, durationInSeconds: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const frameCount = Math.floor(sampleRate * durationInSeconds);
  return ctx.createBuffer(1, frameCount, sampleRate);
}

export function mergeAudioBuffersWithLatency(buffers: AudioBuffer[], context: AudioContext, latencySec = 0.8): AudioBuffer {
  const silenceSamples = Math.floor(latencySec * context.sampleRate);
  const totalLength = buffers.reduce((acc, buf, idx) => {
    return acc + buf.length + (idx < buffers.length - 1 ? silenceSamples : 0);
  }, 0);

  const result = context.createBuffer(1, totalLength, context.sampleRate);
  let offset = 0;
  
  for (let i = 0; i < buffers.length; i++) {
    const buf = buffers[i];
    result.getChannelData(0).set(buf.getChannelData(0), offset);
    offset += buf.length + silenceSamples;
  }
  return result;
}

/**
 * Convertit un AudioBuffer en Blob au format WAV.
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const bufferLength = buffer.length;
  const dataSize = bufferLength * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  
  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);
  
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const offset = 44;
  const channels = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let index = 0;
  for (let i = 0; i < bufferLength; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = channels[channel][i];
      sample = Math.max(-1, Math.min(1, sample));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset + (index * 2), intSample, true);
      index++;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
