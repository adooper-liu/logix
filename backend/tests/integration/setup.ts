import { AppDataSource } from '../../src/database';
import { redisClient } from '../../src/database/redis';

afterAll(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }

  if (redisClient.status !== 'end') {
    await redisClient.quit();
  }
});
