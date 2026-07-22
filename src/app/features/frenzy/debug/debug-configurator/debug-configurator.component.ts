import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

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
 * here. Labels go through the `frenzy-debug` i18n scope; the toggle values themselves (modes, layer/probe keys) are
 * identifiers and render as-is.
 */
@Component({
  selector: 'left-paw-debug-configurator',
  imports: [TranslocoDirective],
  templateUrl: './debug-configurator.component.html',
  styleUrl: './debug-configurator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DebugConfiguratorComponent {
  protected readonly store = inject(DebugSettingsStore);
  protected readonly renderModeList = RENDER_MODES;
  protected readonly dprCapList = CANVAS_DPR_CAPS;
  protected readonly frameCapList = FRAME_CAP_FPS;
  protected readonly layerKeyList = SCENE_LAYER_KEYS;
  protected readonly decorProbeKeyList = DECOR_PROBE_KEYS;
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
