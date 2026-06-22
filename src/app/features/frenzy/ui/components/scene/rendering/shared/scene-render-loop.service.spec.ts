import { createEnvironmentInjector, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CameraSnapshot } from '../../camera/scene-camera.service';
import { SceneFacade } from '../../scene.facade';
import { SceneRenderLoopService } from './scene-render-loop.service';
import type { SceneFrameContext } from './scene-render-loop.service';
import type { DebugFlags } from '../../../../../debug/debug-options';
import type { RenderedPlayer } from '../../scene-view-models';

// Sentinels returned by the fake facade so the test can assert what the loop forwards.
const RENDERED = [{ id: 'p1' }] as unknown as readonly RenderedPlayer[];
const SNAPSHOT = { ready: true } as unknown as CameraSnapshot;

// A fake SceneFacade that records the order of the per-frame calls the loop makes through it.
function createFakeFacade(): {
  calls: string[];
  tickItems: ReturnType<typeof vi.fn>;
  tickDecor: ReturnType<typeof vi.fn>;
  tickPlayers: ReturnType<typeof vi.fn>;
  publishDebugFrame: ReturnType<typeof vi.fn>;
  updateCamera: ReturnType<typeof vi.fn>;
  cameraSnapshot: ReturnType<typeof vi.fn>;
  renderedPlayers: ReturnType<typeof vi.fn>;
} {
  const calls: string[] = [];

  return {
    calls,
    tickItems: vi.fn(() => calls.push('tickItems')),
    tickDecor: vi.fn(() => calls.push('tickDecor')),
    tickPlayers: vi.fn(() => calls.push('tickPlayers')),
    publishDebugFrame: vi.fn(() => calls.push('publishDebugFrame')),
    updateCamera: vi.fn(() => calls.push('updateCamera')),
    cameraSnapshot: vi.fn(() => {
      calls.push('cameraSnapshot');

      return SNAPSHOT;
    }),
    renderedPlayers: vi.fn(() => RENDERED),
  };
}

function flags(overrides: Partial<DebugFlags> = {}): DebugFlags {
  return { pokemonBorders: false, itemBorders: false, speed: false, perf: false, ...overrides };
}

function makeContext(overrides: Partial<SceneFrameContext> = {}): SceneFrameContext {
  return {
    items: () => [],
    players: () => [],
    myId: () => null,
    evolving: () => new Map(),
    renderMode: () => 'dom',
    playerSpritesMode: () => 'dom',
    decorMode: () => 'dom',
    decorNoPlants: () => false,
    frameCapFps: () => 0,
    debug: flags(),
    debugBoxesActive: false,
    world: () => ({}) as HTMLElement,
    parallaxNear: () => undefined,
    parallaxMid: () => undefined,
    foregroundKelp: () => undefined,
    offscreenIndicators: () => undefined,
    perfMetrics: () => undefined,
    ...overrides,
  };
}

describe('SceneRenderLoopService', () => {
  let frame: FrameRequestCallback | null;
  let cancelSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    frame = null;
    cancelSpy = vi.fn();
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frame = callback;

        return 7;
      }),
    );
    vi.stubGlobal('cancelAnimationFrame', cancelSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function createService(facade: ReturnType<typeof createFakeFacade>): {
    service: SceneRenderLoopService;
    injector: EnvironmentInjector;
  } {
    const injector = createEnvironmentInjector(
      [
        SceneRenderLoopService,
        { provide: SceneFacade, useValue: facade as unknown as SceneFacade },
      ],
      TestBed.inject(EnvironmentInjector),
    );

    return { service: injector.get(SceneRenderLoopService), injector };
  }

  function runOneFrame(): void {
    expect(frame).not.toBeNull();
    frame?.(0);
  }

  it('drives one frame: ticks items + players, then the camera, then the offscreen indicators, in order', () => {
    const facade = createFakeFacade();
    const offscreen = { frame: vi.fn() };
    const { service } = createService(facade);

    service.start(makeContext({ offscreenIndicators: () => offscreen }));
    runOneFrame();

    expect(facade.calls).toEqual(['tickItems', 'tickPlayers', 'updateCamera', 'cameraSnapshot']);
    expect(offscreen.frame).toHaveBeenCalledWith(SNAPSHOT, expect.any(Number), RENDERED);
  });

  it('ticks the decor canvas only when the decor mode is canvas', () => {
    const domFacade = createFakeFacade();
    const { service: domService } = createService(domFacade);

    domService.start(makeContext());
    runOneFrame();

    expect(domFacade.tickDecor).not.toHaveBeenCalled();

    const canvasFacade = createFakeFacade();
    const { service: canvasService } = createService(canvasFacade);

    canvasService.start(makeContext({ decorMode: () => 'canvas' }));
    runOneFrame();

    expect(canvasFacade.tickDecor).toHaveBeenCalledTimes(1);
  });

  it('records perf metrics, with this frame timestamp + a scene-loop ms, only when ?debug=perf is on', () => {
    const facade = createFakeFacade();
    const recorder = { record: vi.fn() };
    const { service } = createService(facade);

    service.start(
      makeContext({ debug: flags({ perf: true }), myId: () => 'me', perfMetrics: () => recorder }),
    );
    runOneFrame();

    expect(recorder.record).toHaveBeenCalledTimes(1);

    const [now, sceneLoopMs, , myId] = recorder.record.mock.calls[0];

    expect(typeof now).toBe('number');
    expect(typeof sceneLoopMs).toBe('number');
    expect(myId).toBe('me');
  });

  it('does not record perf metrics when ?debug=perf is off', () => {
    const facade = createFakeFacade();
    const recorder = { record: vi.fn() };
    const { service } = createService(facade);

    service.start(makeContext({ perfMetrics: () => recorder }));
    runOneFrame();

    expect(recorder.record).not.toHaveBeenCalled();
  });

  it('republishes the debug frame each tick only when a box overlay is active', () => {
    const facade = createFakeFacade();
    const { service } = createService(facade);

    service.start(makeContext({ debugBoxesActive: true }));
    runOneFrame();

    expect(facade.publishDebugFrame).toHaveBeenCalledTimes(1);
  });

  it('does not republish the debug frame when no box overlay is active', () => {
    const facade = createFakeFacade();
    const { service } = createService(facade);

    service.start(makeContext());
    runOneFrame();

    expect(facade.publishDebugFrame).not.toHaveBeenCalled();
  });

  it('still ticks but skips the camera and offscreen indicators while the world ref is absent', () => {
    const facade = createFakeFacade();
    const offscreen = { frame: vi.fn() };
    const { service } = createService(facade);

    service.start(makeContext({ world: () => undefined, offscreenIndicators: () => offscreen }));
    runOneFrame();

    expect(facade.tickItems).toHaveBeenCalled();
    expect(facade.tickPlayers).toHaveBeenCalled();
    expect(facade.updateCamera).not.toHaveBeenCalled();
    expect(offscreen.frame).not.toHaveBeenCalled();
  });

  it('passes the same frame timestamp to the player tick and the offscreen indicators (no phase skew)', () => {
    const facade = createFakeFacade();
    const offscreen = { frame: vi.fn() };
    const { service } = createService(facade);

    service.start(makeContext({ offscreenIndicators: () => offscreen }));
    runOneFrame();

    const tickNow = facade.tickPlayers.mock.calls[0][3];
    const frameNow = offscreen.frame.mock.calls[0][1];

    expect(frameNow).toBe(tickNow);
  });

  it('cancels the scheduled frame when its injection scope is destroyed', () => {
    const facade = createFakeFacade();
    const { service, injector } = createService(facade);

    service.start(makeContext());
    injector.destroy();

    expect(cancelSpy).toHaveBeenCalledWith(7);
  });
});
