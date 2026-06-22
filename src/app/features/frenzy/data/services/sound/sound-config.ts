import type { ToneOptions } from './audio-engine.service';

// Every distinct sound cue in the scene, in the spirit of `ITEM_ART`: one key per cue, the value is the exact
// oscillator-tone sequence to play. Adding a sound = one entry here; no per-effect service to wire up.
export type SoundKind =
  | 'badEat'
  | 'brick'
  | 'easterEgg'
  | 'eat'
  | 'eggEmission'
  | 'evolve'
  | 'explosion'
  | 'poopEat'
  | 'poopEmission'
  | 'rock'
  | 'shield'
  | 'wellFed';

// A playful bouncing arpeggio — a quirky "surprise!" cue for picking up the easter egg (laying aura).
const EASTER_EGG_BOUNCE_HZ = [392, 523.25, 659.25, 880];
const EASTER_EGG_NOTE_DURATION_MS = 120;
const EASTER_EGG_NOTE_STEP_MS = 60;

const EVOLVE_ARPEGGIO_HZ = [523.25, 659.25, 783.99, 1046.5];
const EVOLVE_NOTE_DURATION_MS = 220;
const EVOLVE_NOTE_STEP_MS = 90;

// A short rising two-note shimmer — a soft "ward up" cue distinct from the eat/evolve sounds.
const SHIELD_SHIMMER_HZ = [659.25, 987.77];
const SHIELD_NOTE_DURATION_MS = 260;
const SHIELD_NOTE_STEP_MS = 70;

// A warm, rounded two-note "nourished" cue for picking up the vitamin (heal + decay pause) — softer and
// lower than the shield's bright shimmer, so the two buffs sound distinct.
const WELL_FED_WARM_HZ = [440, 587.33];
const WELL_FED_NOTE_DURATION_MS = 240;
const WELL_FED_NOTE_STEP_MS = 90;

function arpeggio(
  frequencies: readonly number[],
  durationMs: number,
  stepMs: number,
  type: OscillatorType,
  gain: number,
): ToneOptions[] {
  return frequencies.map((frequency, index) => ({
    frequency,
    durationMs,
    type,
    gain,
    delayMs: index * stepMs,
  }));
}

// Single source of truth for the tones each cue plays — preserves every effect's exact `ToneOptions` sequence.
export const SOUND_CONFIG: Record<SoundKind, ToneOptions[]> = {
  eat: [
    { frequency: 660, durationMs: 80, type: 'square', gain: 0.12 },
    { frequency: 880, durationMs: 70, type: 'square', gain: 0.1, delayMs: 60 },
  ],
  badEat: [{ frequency: 220, endFrequency: 150, durationMs: 200, type: 'sawtooth', gain: 0.12 }],
  rock: [
    { frequency: 380, endFrequency: 200, durationMs: 60, type: 'square', gain: 0.16 },
    { frequency: 170, endFrequency: 80, durationMs: 160, type: 'square', gain: 0.24 },
  ],
  // Heavier and lower than a rock's thunk — a brick hits twice as hard, so it lands with a deeper, longer thud.
  brick: [
    { frequency: 300, endFrequency: 150, durationMs: 80, type: 'square', gain: 0.2 },
    { frequency: 110, endFrequency: 45, durationMs: 220, type: 'square', gain: 0.3 },
  ],
  // Punchy descending boom: a sawtooth body drops fast, a deeper square tail rings under it.
  explosion: [
    { frequency: 200, endFrequency: 40, durationMs: 280, type: 'sawtooth', gain: 0.3 },
    { frequency: 90, endFrequency: 30, durationMs: 420, type: 'square', gain: 0.22, delayMs: 40 },
  ],
  shield: arpeggio(SHIELD_SHIMMER_HZ, SHIELD_NOTE_DURATION_MS, SHIELD_NOTE_STEP_MS, 'sine', 0.1),
  wellFed: arpeggio(
    WELL_FED_WARM_HZ,
    WELL_FED_NOTE_DURATION_MS,
    WELL_FED_NOTE_STEP_MS,
    'sine',
    0.1,
  ),
  easterEgg: arpeggio(
    EASTER_EGG_BOUNCE_HZ,
    EASTER_EGG_NOTE_DURATION_MS,
    EASTER_EGG_NOTE_STEP_MS,
    'triangle',
    0.1,
  ),
  evolve: arpeggio(
    EVOLVE_ARPEGGIO_HZ,
    EVOLVE_NOTE_DURATION_MS,
    EVOLVE_NOTE_STEP_MS,
    'triangle',
    0.14,
  ),
  // A wet downward "plop-thud" — the squishy cue for eating a poop (the `pooping` debuff landing on you).
  poopEat: [
    { frequency: 220, endFrequency: 80, durationMs: 200, type: 'sawtooth', gain: 0.09 },
    { frequency: 130, endFrequency: 55, durationMs: 160, type: 'square', gain: 0.07, delayMs: 90 },
  ],
  // A short, bright rising blip — a festive "ta-da!" spark played per item sprayed under the easter-egg `laying`
  // aura. Kept very short and quiet on purpose: emissions fire ~1/s per layer, so it reads as a sparkly stream.
  eggEmission: [
    { frequency: 880, endFrequency: 1175, durationMs: 70, type: 'triangle', gain: 0.05 },
  ],
  // A short low buzzy down-glide — the "pfft" fart played per item sprayed under the poop `pooping` aura. Short
  // and quiet like the egg blip (emissions fire ~1/s per pooper), so a stream reads as a string of farts.
  poopEmission: [
    { frequency: 150, endFrequency: 70, durationMs: 90, type: 'sawtooth', gain: 0.06 },
  ],
};
