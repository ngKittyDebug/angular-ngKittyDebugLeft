// Last frame's item write accounting (the soft-cull split), for the `?debug=perf` census. `written` is on-screen
// (got a translate/draw), `skipped` is culled off-screen, `total` is every item in the frame (some may lack a DOM
// host yet). Shared between the DOM registry (`writeTally`) and the canvas renderer (`drawTally`) backends.
export interface ItemWriteTally {
  total: number;
  written: number;
  skipped: number;
}
