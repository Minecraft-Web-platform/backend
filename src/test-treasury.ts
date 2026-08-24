import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { StatesService } from './states/states.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const statesService = app.get(StatesService);

  const stateId = '8e7a8fdf-58dd-4fea-a61f-1fc226884068';
  
  console.log('Adding 10 gold blocks to the treasury to trigger event...');
  
  // This emits state.treasury.updated
  await statesService.updateTreasuryItem(stateId, 'minecraft:gold_block', 10);
  
  // Wait a little for event to process
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('Event emitted and processed!');
  
  await app.close();
}
bootstrap();
