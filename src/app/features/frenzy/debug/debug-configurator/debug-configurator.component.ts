import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import {
  CANVAS_DPR_CAPS,
  DebugSettingsStore,
  DECOR_PROBE_KEYS,
  FRAME_CAP_FPS,
  RENDER_MODES,
  SCENE_LAYER_KEYS,
} from '../debug-settings.store';
import type { CanvasDprCap, FrameCapFps } from '../debug-settings.store';

/**
 * `?debug=perf` configurator: the runtime render levers for the on-device A/B — render/players/decor backend, the DPR
 * and frame-pacing caps, sprite freeze, per-layer hides and the decor probes. State lives in (and persists through)
 * `DebugSettingsStore`. Dev-only and gated behind the master `?debug=perf` flag (rendered under the scene template
 * `@if`), so it never instantiates the store for a real player. The per-metric toggles live on their readout rows, not
 * here; this panel itself stays plain controls (no Taiga/i18n) by choice.
 */
@Component({
  selector: 'left-paw-debug-configurator',
  templateUrl: './debug-configurator.component.html',
  styleUrl: './debug-configurator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DebugConfiguratorComponent {
  protected readonly store = inject(DebugSettingsStore);
  protected readonly renderModes = RENDER_MODES;
  protected readonly dprCaps = CANVAS_DPR_CAPS;
  protected readonly frameCaps = FRAME_CAP_FPS;
  protected readonly layerKeys = SCENE_LAYER_KEYS;
  protected readonly decorProbeKeys = DECOR_PROBE_KEYS;
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
