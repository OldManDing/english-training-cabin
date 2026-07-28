import { describe, expect, it } from 'vitest';
import { isLoopbackHostname } from '../../src/lib/practiceSpeech';

describe('practice speech server eligibility', () => {
  it.each(['localhost', 'app.localhost', '127.0.0.1', '127.0.0.2', '127.255.255.255', '::1', '[::1]'])(
    'recognizes %s as a loopback hostname',
    (hostname) => {
      expect(isLoopbackHostname(hostname)).toBe(true);
    },
  );

  it.each(['example.com', '192.168.1.2', '128.0.0.1', '127.0.0.999'])(
    'does not treat %s as a loopback hostname',
    (hostname) => {
      expect(isLoopbackHostname(hostname)).toBe(false);
    },
  );
});
