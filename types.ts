
export type VoiceName = 'zephyr' | 'aoede' | 'leda' | 'despina' | 'callirrhoe' | 'charon' | 'fenrir' | 'kore' | 'puck' | 'orus';

export interface SpeakerConfig {
  id: string;
  name: string;
  voice: VoiceName;
}
