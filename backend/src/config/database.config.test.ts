import { parseDatabaseSslConfig } from './database.config';

describe('parseDatabaseSslConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DB_SSL;
    delete process.env.DB_SSL_REJECT_UNAUTHORIZED;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('enables SSL by default in production for external deployments', () => {
    process.env.NODE_ENV = 'production';

    expect(parseDatabaseSslConfig()).toEqual({ rejectUnauthorized: false });
  });

  it('allows local Docker production stacks to disable database SSL explicitly', () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_SSL = 'false';

    expect(parseDatabaseSslConfig()).toBe(false);
  });

  it('honors certificate verification when requested', () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_SSL = 'true';
    process.env.DB_SSL_REJECT_UNAUTHORIZED = 'true';

    expect(parseDatabaseSslConfig()).toEqual({ rejectUnauthorized: true });
  });
});
