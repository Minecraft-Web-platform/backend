import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { resolve } from 'path';
import { LaunchersController } from './launchers.controller';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: resolve(process.cwd(), 'files/launchers'),
      serveRoot: '/launchers',
    }),
  ],
  controllers: [LaunchersController],
})
export class LaunchersModule {}
