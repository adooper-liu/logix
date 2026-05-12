describe('database data source options', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.resetModules();
  });

  it('keeps production SSL settings from databaseConfig', async () => {
    jest.resetModules();
    jest.unmock('../database');
    jest.unmock('./index');
    process.env.NODE_ENV = 'production';

    const { dataSourceOptions } = await import('./index');

    expect((dataSourceOptions as { ssl?: unknown }).ssl).toEqual({ rejectUnauthorized: false });
  });
});
