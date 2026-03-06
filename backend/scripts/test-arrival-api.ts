import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ContainerStatisticsService } from '../src/services/containerStatistics.service';
import { Container } from '../src/entities/Container';
import { TruckingTransport } from '../src/entities/TruckingTransport';
import { EmptyReturn } from '../src/entities/EmptyReturn';

async function testArrivalDistribution() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'logix_user',
    password: process.env.DB_PASSWORD || 'LogiX@2024!Secure',
    database: process.env.DB_DATABASE || 'logix_db',
    entities: [Container, TruckingTransport, EmptyReturn],
    synchronize: false
  });

  try {
    await dataSource.initialize();
    console.log('Database connected');

    const containerRepository = dataSource.getRepository(Container);
    const truckingRepository = dataSource.getRepository(TruckingTransport);
    const emptyReturnRepository = dataSource.getRepository(EmptyReturn);

    const statisticsService = new ContainerStatisticsService(
      containerRepository,
      truckingRepository,
      emptyReturnRepository
    );

    console.log('\n=== Testing getArrivalDistribution ===\n');
    const arrivalDistribution = await statisticsService.getArrivalDistribution();

    console.log('Arrival Distribution Result:');
    console.log(JSON.stringify(arrivalDistribution, null, 2));

    console.log('\n=== Summary ===');
    console.log('已到目的港:', arrivalDistribution.arrivedAtDestination);
    console.log('  - 今日到港:', arrivalDistribution.today);
    console.log('  - 之前未提柜:', arrivalDistribution.arrivedBeforeTodayNotPickedUp);
    console.log('  - 之前已提柜:', arrivalDistribution.arrivedBeforeTodayPickedUp);
    console.log('已到中转港:', arrivalDistribution.arrivedAtTransit);
    console.log('  - 已逾期:', arrivalDistribution.transitOverdue);
    console.log('  - 3日内:', arrivalDistribution.transitWithin3Days);
    console.log('  - 7日内:', arrivalDistribution.transitWithin7Days);
    console.log('  - 7日后:', arrivalDistribution.transitOver7Days);
    console.log('  - 无ETA:', arrivalDistribution.transitNoETA);
    console.log('预计到港:', arrivalDistribution.expectedArrival);
    console.log('  - 已逾期:', arrivalDistribution.overdue);
    console.log('  - 3天内:', arrivalDistribution.within3Days);
    console.log('  - 7天内:', arrivalDistribution.within7Days);
    console.log('  - 7天后:', arrivalDistribution.over7Days);
    console.log('  - 其他:', arrivalDistribution.other);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await dataSource.destroy();
  }
}

testArrivalDistribution();
