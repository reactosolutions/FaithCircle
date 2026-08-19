// `data` is optional so every existing `{ ok: true }` return stays valid —
// only actions that need to hand something back (e.g. a generated temp
// password) declare ActionResult<TheirDataShape> and populate it.
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };
