type TelemetryPayload = Record<string, string | number | boolean | null | undefined>;

const MAX_TELEMETRY_TEXT_LENGTH = 500;

function limitTelemetryText(value: unknown, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_TELEMETRY_TEXT_LENGTH);
}

export function trackTelemetry(eventName: string, payload: TelemetryPayload = {}) {
  const body = JSON.stringify({
    eventName,
    payload,
    occurredAt: new Date().toISOString(),
  });

  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const sent = navigator.sendBeacon('/api/telemetry/event', new Blob([body], { type: 'application/json' }));
    if (sent) return;
  }

  fetch('/api/telemetry/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Telemetry must never block training flows.
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error === null || error === undefined) return 'unknown_error';
  return String(error);
}

export function trackClientError(error: unknown, context: TelemetryPayload = {}) {
  const browserContext = typeof window === 'undefined'
    ? {}
    : {
        path: window.location.pathname,
        hash: window.location.hash || undefined,
        userAgent: limitTelemetryText(window.navigator.userAgent),
      };

  trackTelemetry('client_error', {
    ...browserContext,
    ...context,
    message: limitTelemetryText(getErrorMessage(error), 'unknown_error'),
    name: error instanceof Error ? limitTelemetryText(error.name, 'Error') : undefined,
  });
}

let globalErrorMonitoringInstalled = false;

export function installGlobalErrorMonitoring() {
  if (globalErrorMonitoringInstalled || typeof window === 'undefined') return;
  globalErrorMonitoringInstalled = true;

  window.addEventListener('error', (event) => {
    trackClientError(event.error ?? event.message, {
      source: 'window_error',
      filename: limitTelemetryText(event.filename),
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    trackClientError(event.reason, {
      source: 'unhandled_rejection',
    });
  });
}
