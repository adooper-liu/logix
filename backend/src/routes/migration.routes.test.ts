import { NextFunction, Request, Response } from 'express';
import {
  isMigrationExecutionEnabled,
  requireMigrationExecutionEnabled
} from './migration.routes';

const ENV_NAME = 'ENABLE_MIGRATION_EXECUTION_API';

function createMockResponse(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  } as unknown as Response;
}

describe('migration execution route guard', () => {
  const originalValue = process.env[ENV_NAME];

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env[ENV_NAME];
    } else {
      process.env[ENV_NAME] = originalValue;
    }
    jest.clearAllMocks();
  });

  it('disables migration execution unless explicitly enabled', () => {
    delete process.env[ENV_NAME];

    expect(isMigrationExecutionEnabled()).toBe(false);
  });

  it('blocks execution requests by default', () => {
    delete process.env[ENV_NAME];
    const res = createMockResponse();
    const next: NextFunction = jest.fn();

    requireMigrationExecutionEnabled({} as Request, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false
      })
    );
  });

  it('allows execution only when the explicit environment flag is true', () => {
    process.env[ENV_NAME] = 'true';
    const res = createMockResponse();
    const next: NextFunction = jest.fn();

    requireMigrationExecutionEnabled({} as Request, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
