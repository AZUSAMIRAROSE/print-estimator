type TelemetryEvent = {
  type: string;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
};

const MAX_EVENTS = 200;
const STORAGE_KEY = "print-estimator-telemetry";

function appendEvent(event: TelemetryEvent): void {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    const events: TelemetryEvent[] = existing ? JSON.parse(existing) : [];
    events.unshift(event);
    if (events.length > MAX_EVENTS) {
      events.length = MAX_EVENTS;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // Swallow to avoid secondary failures during error handling.
  }
}

export function logEvent(type: string, message: string, context?: Record<string, unknown>): void {
  appendEvent({
    type,
    message,
    context,
    timestamp: new Date().toISOString(),
  });
}

export function setupGlobalErrorLogging(): void {
  window.addEventListener("error", (event) => {
    logEvent("runtime_error", event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
    logEvent("unhandled_rejection", reason);
  });
}
