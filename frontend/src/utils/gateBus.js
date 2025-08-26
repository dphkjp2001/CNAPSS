// frontend/src/utils/gateBus.js

// Lightweight event bus for opening/closing the auth gate modal.
const listeners = new Set();

export function subscribeGate(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function openGate(fromPath) {
  for (const fn of listeners) fn({ type: "open", from: fromPath });
}

export function closeGate() {
  for (const fn of listeners) fn({ type: "close" });
}

