type TelemetryPayload = Record<string, string | number | boolean | null | undefined>;

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
