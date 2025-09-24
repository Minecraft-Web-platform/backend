import { Module } from '@nestjs/common';
import { ModsController } from './mods.controller';
import { ModsService } from './mods.service';

@Module({
  controllers: [ModsController],
  providers: [ModsService],
})
export class ModsModule {}
