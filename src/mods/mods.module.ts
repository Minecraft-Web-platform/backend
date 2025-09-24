import { Module } from '@nestjs/common';
import { ModsController } from './mods.controller';
import { ModsService } from './mods.service';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { OwnJwtService } from 'src/own-jwt/own-jwt.service';

@Module({
  controllers: [ModsController],
  providers: [OwnJwtService, AccessTokenGuard, ModsService],
})
export class ModsModule {}
