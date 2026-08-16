import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const AppDataSource = app.get(DataSource);

  console.log('Connected to DB via Nest Application Context');

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  console.log('Started transaction');

  try {
    // 1. Unlink users
    console.log('Unlinking users from states and cities...');
    await queryRunner.query('UPDATE users SET city_id = NULL, state_id = NULL');

    // 2. Delete Economy
    console.log('Deleting economy records...');
    const economyTables = [
      'economy_transfers',
      'economy_company_share_price_history',
      'economy_company_order_status_history',
      'economy_company_order_items',
      'economy_company_orders',
      'economy_company_service_sub_items',
      'economy_company_services',
      'economy_withdrawn_shares',
      'economy_ipo_requests',
      'economy_company_shares',
      '"credit-cards"',
      'account_treasury_items',
      'economy_accounts',
      'economy_companies',
      'economy_currencies',
      'economy_properties'
    ];
    for (const table of economyTables) {
      await queryRunner.query(`DELETE FROM ${table}`);
      console.log(`- Deleted from ${table}`);
    }

    // 3. Delete States & Elections
    console.log('Deleting states records...');
    const stateTables = [
      'election_votes',
      'election_candidates',
      'elections',
      'state_diplomacies',
      'state_decrees',
      'citizenship_requests',
      'state_treasury_items',
      'streets',
      'cities',
      'states'
    ];
    for (const table of stateTables) {
      await queryRunner.query(`DELETE FROM ${table}`);
      console.log(`- Deleted from ${table}`);
    }

    // 4. Delete Others
    console.log('Deleting other records (user achievements, news, events, codes)...');
    const otherTables = [
      'user_achievements',
      'news_blocks',
      'news',
      'news_categories',
      'confirmation_codes',
      'events'
    ];
    for (const table of otherTables) {
      await queryRunner.query(`DELETE FROM ${table}`);
      console.log(`- Deleted from ${table}`);
    }

    await queryRunner.commitTransaction();
    console.log('Cleanup successful! 🎉 All requested data has been wiped.');
  } catch (err) {
    await queryRunner.rollbackTransaction();
    console.error('Error during cleanup:', err);
  } finally {
    await queryRunner.release();
    await app.close();
  }
}

bootstrap();
