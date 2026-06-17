import type { ServerMessage } from '@game/frenzy/types';

// Wire-size quantizer: physics floats (normalized coords/velocities) carry ~16 fractional digits of noise that
// JSON.stringify would serialize verbatim. Four decimals keep sub-pixel precision on the 2400×900 world (max
// rounding error ≈ 0.12px on x) while cutting snapshot payloads by roughly a quarter. The integer short-circuit
// is load-bearing: it exempts hp/tick/Date.now()-scale timestamps exactly, instead of routing them through
// `toFixed` for nothing. Rounding never accumulates — the engine keeps full precision, only the wire is rounded.
const quantize = (value: number): number =>
  Number.isInteger(value) ? value : Number(value.toFixed(4));

/** Serializes an outbound message for the wire, rounding every non-integer number to 4 decimals. */
export function serializeServerMessage(message: ServerMessage): string {
  return JSON.stringify(message, (_key, value: unknown) =>
    typeof value === 'number' ? quantize(value) : value,
  );
}
