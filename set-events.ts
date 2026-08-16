import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const AppDataSource = app.get(DataSource);

  console.log('Connected to DB via Nest Application Context');

  try {
    await AppDataSource.query(`UPDATE achievements SET trigger_event = 'economy.corporation' WHERE title = 'Корпорация'`);
    await AppDataSource.query(`UPDATE achievements SET trigger_event = 'economy.monopolist' WHERE title = 'Монополист'`);
    await AppDataSource.query(`UPDATE achievements SET trigger_event = 'economy.fortune' WHERE title = 'Состояние'`);
    
    console.log('Successfully updated trigger events for achievements.');
  } catch (err) {
    console.error('Error updating achievements:', err);
  } finally {
    await app.close();
  }
}

bootstrap();
