import { describe, expect, it } from 'vitest';
import { parseInfrastructureProtectionStatus } from '../../src/server/dataProtection';

const passedStatus = {
  schemaVersion: 1,
  backupId: 'scheduled-20260729T033000Z',
  release: 'v1-20260728-cloud-drafts-product-quality',
  completedAt: '2026-07-29T03:35:00.000Z',
  status: 'passed',
  databaseBytes: 1024,
  appDataBytes: 2048,
  restoreDrill: {
    status: 'passed',
    countsMatched: true,
  },
};

describe('infrastructure data protection status', () => {
  it('reports a recent verified restore drill as healthy', () => {
    expect(parseInfrastructureProtectionStatus(
      passedStatus,
      new Date('2026-07-29T12:00:00.000Z'),
    )).toMatchObject({
      state: 'healthy',
      ageHours: 8.4,
      restoreDrill: { status: 'passed', countsMatched: true },
    });
  });

  it('marks an otherwise valid backup stale after the freshness window', () => {
    expect(parseInfrastructureProtectionStatus(
      passedStatus,
      new Date('2026-07-31T12:00:00.000Z'),
    ).state).toBe('stale');
  });

  it('falls back to the default freshness window for invalid configuration', () => {
    expect(parseInfrastructureProtectionStatus(
      passedStatus,
      new Date('2026-07-31T12:00:00.000Z'),
      Number.NaN,
    ).state).toBe('stale');
  });

  it('fails closed when the restore drill or schema is invalid', () => {
    expect(parseInfrastructureProtectionStatus({
      ...passedStatus,
      restoreDrill: { status: 'failed', countsMatched: false },
    }).state).toBe('failed');
    expect(parseInfrastructureProtectionStatus({ status: 'passed' }).state).toBe('failed');
  });
});
