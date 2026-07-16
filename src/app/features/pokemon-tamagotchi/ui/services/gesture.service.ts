import { Injectable } from '@angular/core';
import {
  buildGestureResult,
  calculateBondLevel,
  classifyPointerGesture,
  type GestureResult,
  intensityForGesture,
} from '../../data/helpers/gesture.helper';
import type { InteractionEventModel, InteractionType } from '../../data/models/interaction.model';

interface PointerSession {
  lastX: number;
  lastY: number;
  startTime: number;
  startX: number;
  startY: number;
  totalDistance: number;
}

@Injectable()
export class GestureService {
  private readonly activePointers = new Map<number, PointerSession>();

  public calculateBondLevel(history: InteractionEventModel[]): number {
    return calculateBondLevel(history);
  }

  public handlePointerDown(event: PointerEvent): GestureResult | null {
    this.activePointers.set(event.pointerId, {
      lastX: event.clientX,
      lastY: event.clientY,
      startTime: Date.now(),
      startX: event.clientX,
      startY: event.clientY,
      totalDistance: 0,
    });

    if (this.activePointers.size >= 2) {
      return buildGestureResult('multiTouch', 1);
    }

    return null;
  }

  public handlePointerMove(event: PointerEvent): void {
    const session = this.activePointers.get(event.pointerId);

    if (!session) {
      return;
    }

    const delta = Math.hypot(event.clientX - session.lastX, event.clientY - session.lastY);

    session.totalDistance += delta;
    session.lastX = event.clientX;
    session.lastY = event.clientY;
  }

  public handlePointerUp(event: PointerEvent): GestureResult | null {
    const session = this.activePointers.get(event.pointerId);

    if (!session) {
      return null;
    }

    this.activePointers.delete(event.pointerId);

    const durationMs = Date.now() - session.startTime;
    const gestureType = classifyPointerGesture(
      session.startX,
      session.startY,
      event.clientX,
      event.clientY,
      session.totalDistance,
      durationMs,
    );

    if (!gestureType) {
      return null;
    }

    const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);
    const intensity = intensityForGesture(gestureType, distance, durationMs);

    return buildGestureResult(gestureType, intensity);
  }

  public handlePointerCancel(event: PointerEvent): void {
    this.activePointers.delete(event.pointerId);
  }

  public handleKeyboardActivate(type: InteractionType = 'click'): GestureResult {
    const intensity = type === 'multiTouch' ? 1 : 0.5;

    return buildGestureResult(type, intensity);
  }
}
