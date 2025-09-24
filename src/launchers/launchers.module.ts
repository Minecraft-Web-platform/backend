import { Module } from '@nestjs/common';
import { LaunchersController } from './launchers.controller';
import { OwnJwtService } from 'src/own-jwt/own-jwt.service';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';

@Module({
  controllers: [LaunchersController],
  providers: [OwnJwtService, AccessTokenGuard],
})
export class LaunchersModule {}
