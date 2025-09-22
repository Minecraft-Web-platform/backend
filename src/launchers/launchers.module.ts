import { Module } from '@nestjs/common';
import { LaunchersController } from './launchers.controller';

@Module({
  controllers: [LaunchersController],
})
export class LaunchersModule {}
