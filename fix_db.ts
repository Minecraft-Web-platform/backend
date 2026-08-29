import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  try {
    await dataSource.query(`ALTER TABLE cities RENAME TO settlements;`);
    console.log('Renamed cities to settlements successfully');
  } catch(e) {
    console.log('Error renaming (maybe already renamed):', e.message);
  }
  
  try {
    // Also rename foreign key constraints or columns if needed
    // But for now, TypeORM might just handle the mapping if we keep the @JoinColumn names
  } catch(e) {}
  
  await app.close();
  process.exit(0);
}
bootstrap();
