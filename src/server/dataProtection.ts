import fs from 'node:fs/promises';

export type InfrastructureProtectionState = 'healthy' | 'stale' | 'failed' | 'not_configured';

export interface InfrastructureProtectionStatus {
  state: InfrastructureProtectionState;
  backupId?: string;
  release?: string;
  completedAt?: string;
  ageHours?: number;
  databaseBytes?: number;
  appDataBytes?: number;
  restoreDrill?: {
    status: 'passed' | 'failed';
    countsMatched: boolean;
  };
}

type StoredProtectionStatus = {
  schemaVersion?: unknown;
  backupId?: unknown;
  release?: unknown;
  completedAt?: unknown;
  status?: unknown;
  databaseBytes?: unknown;
  appDataBytes?: unknown;
  restoreDrill?: unknown;
};

function finiteNonNegativeNumber(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function safeText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim().replace(/[\u0000-\u001f\u007f]/g, ' ');
  return text ? text.slice(0, maxLength) : undefined;
}

export function parseInfrastructureProtectionStatus(
  value: unknown,
  now = new Date(),
  staleAfterHours = 36,
): InfrastructureProtectionStatus {
  const freshnessWindowHours = Number.isFinite(staleAfterHours)
    ? Math.max(1, Math.min(168, staleAfterHours))
    : 36;
  const input = value && typeof value === 'object' ? value as StoredProtectionStatus : {};
  const completedAt = safeText(input.completedAt, 40);
  const completedAtMs = completedAt ? Date.parse(completedAt) : Number.NaN;
  const restoreInput = input.restoreDrill && typeof input.restoreDrill === 'object'
    ? input.restoreDrill as Record<string, unknown>
    : {};
  const restoreStatus = restoreInput.status === 'passed' ? 'passed' : 'failed';
  const countsMatched = restoreInput.countsMatched === true;
  const passed = input.schemaVersion === 1 && input.status === 'passed' && restoreStatus === 'passed' && countsMatched;

  if (!passed || !Number.isFinite(completedAtMs)) {
    return {
      state: 'failed',
      backupId: safeText(input.backupId, 100),
      release: safeText(input.release, 120),
      completedAt,
      databaseBytes: finiteNonNegativeNumber(input.databaseBytes),
      appDataBytes: finiteNonNegativeNumber(input.appDataBytes),
      restoreDrill: { status: restoreStatus, countsMatched },
    };
  }

  const ageHours = Math.max(0, (now.getTime() - completedAtMs) / (60 * 60 * 1000));
  return {
    state: ageHours > freshnessWindowHours ? 'stale' : 'healthy',
    backupId: safeText(input.backupId, 100),
    release: safeText(input.release, 120),
    completedAt: new Date(completedAtMs).toISOString(),
    ageHours: Math.round(ageHours * 10) / 10,
    databaseBytes: finiteNonNegativeNumber(input.databaseBytes),
    appDataBytes: finiteNonNegativeNumber(input.appDataBytes),
    restoreDrill: { status: 'passed', countsMatched: true },
  };
}

export async function readInfrastructureProtectionStatus(
  filePath?: string,
  options: { now?: Date; staleAfterHours?: number } = {},
): Promise<InfrastructureProtectionStatus> {
  if (!filePath?.trim()) return { state: 'not_configured' };

  try {
    const content = await fs.readFile(filePath, 'utf8');
    return parseInfrastructureProtectionStatus(
      JSON.parse(content),
      options.now ?? new Date(),
      options.staleAfterHours ?? 36,
    );
  } catch {
    return { state: 'failed' };
  }
}
