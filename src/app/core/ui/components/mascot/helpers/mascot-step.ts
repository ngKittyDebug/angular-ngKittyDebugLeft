import { MASCOT_CONFIG } from '../constants/mascot-config';

export type MascotState = 'standing' | 'walkingLeft' | 'walkingRight' | 'idle';

export interface MascotStepInput {
  positionX: number;
  cursorX: number | null;
  width: number;
  viewportWidth: number;
  lastChaseTime: number;
  time: number;
  deltaSeconds: number;
}

export interface MascotStepResult {
  positionX: number;
  state: MascotState;
  lastChaseTime: number;
}

// One animation step of the mascot state machine: chase the cursor's X while it is
// farther than the threshold, stand otherwise, get bored (Idle) after standing long
// enough. Pure — the component applies the result to the DOM.
export function mascotStep(input: MascotStepInput): MascotStepResult {
  const { positionX, cursorX, width, viewportWidth, lastChaseTime, time, deltaSeconds } = input;
  const distance = cursorX === null ? 0 : cursorX - (positionX + width / 2);

  if (Math.abs(distance) <= MASCOT_CONFIG.chaseThresholdPx) {
    const bored = time - lastChaseTime >= MASCOT_CONFIG.idleTimeoutMs;

    return { positionX, state: bored ? 'idle' : 'standing', lastChaseTime };
  }

  // Never step past the threshold edge, so the mascot stops instead of jittering under the cursor.
  const stepLength = Math.min(
    MASCOT_CONFIG.walkSpeedPxPerSecond * deltaSeconds,
    Math.abs(distance) - MASCOT_CONFIG.chaseThresholdPx,
  );
  const direction = Math.sign(distance);
  const nextPositionX = Math.min(
    Math.max(positionX + direction * stepLength, 0),
    viewportWidth - width,
  );

  return {
    positionX: nextPositionX,
    state: direction < 0 ? 'walkingLeft' : 'walkingRight',
    lastChaseTime: time,
  };
}
