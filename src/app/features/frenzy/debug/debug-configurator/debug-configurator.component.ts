import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { METRIC_LABELS } from '../perf-metrics';
import {
  CANVAS_DPR_CAPS,
  DebugSettingsStore,
  FRAME_CAP_FPS,
  PERF_METRIC_KEYS,
  RENDER_MODES,
  SCENE_LAYER_KEYS,
} from '../debug-settings.store';
import type { CanvasDprCap, FrameCapFps } from '../debug-settings.store';

/**
 * `?debug=perf` configurator: the single runtime control surface for the perf subsystem — one checkbox per metric,
 * toggling its visibility in the readout. State lives in (and persists through) `DebugSettingsStore`. Dev-only and
 * gated behind the master `?debug=perf` flag (rendered under the scene template `@if`), so it never instantiates the
 * store for a real player. Plain checkboxes + hardcoded labels, like the sibling debug panels (not product UI).
 */
@Component({
  selector: 'left-paw-debug-configurator',
  templateUrl: './debug-configurator.component.html',
  styleUrl: './debug-configurator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DebugConfiguratorComponent {
  protected readonly store = inject(DebugSettingsStore);
  protected readonly keys = PERF_METRIC_KEYS;
  protected readonly labels = METRIC_LABELS;
  protected readonly renderModes = RENDER_MODES;
  protected readonly dprCaps = CANVAS_DPR_CAPS;
  protected readonly frameCaps = FRAME_CAP_FPS;
  protected readonly layerKeys = SCENE_LAYER_KEYS;
  // Collapsed by default, like the sibling perf panels: a compact header bar that expands to the controls on click,
  // so the configurator stops covering the scene until the developer opens it. Local UI state.
  protected readonly collapsed = signal(true);

  protected toggleCollapsed(): void {
    this.collapsed.update((value) => !value);
  }

  // DPR-cap button label: 0 means the native device ratio, otherwise the cap multiplier.
  protected dprLabel(cap: CanvasDprCap): string {
    return cap === 0 ? 'native' : `${cap}×`;
  }

  // Frame-cap button label: 0 means uncapped, otherwise the target fps.
  protected frameCapLabel(cap: FrameCapFps): string {
    return cap === 0 ? 'off' : `${cap}`;
  }
}
