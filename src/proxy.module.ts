import { Module } from '@nestjs/common';
import { ProxyTestController } from './proxy.controller';

@Module({
  controllers: [ProxyTestController],
})
export class ProxyModule {}
