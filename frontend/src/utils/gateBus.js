// frontend/src/utils/gateBus.js

// Lightweight event bus for opening/closing the auth gate modal.
// Now with "sticky" last event so late subscribers still receive it.
const listeners = new Set();
let lastEvent = null; // remember the last open/close

export function subscribeGate(listener) {
  listeners.add(listener);
  // If an event already happened (e.g., open) before we subscribed, replay it.
  if (lastEvent) {
    try { listener(lastEvent); } catch {}
  }
  return () => listeners.delete(listener);
}

export function openGate(fromPath) {
  lastEvent = { type: "open", from: fromPath || "/" };
  for (const fn of listeners) {
    try { fn(lastEvent); } catch {}
  }
}

export function closeGate() {
  lastEvent = { type: "close" };
  for (const fn of listeners) {
    try { fn(lastEvent); } catch {}
  }
  // After a close, we don't need to keep a sticky open.
  lastEvent = null;
}


