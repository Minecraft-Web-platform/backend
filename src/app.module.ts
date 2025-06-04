import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { OwnJwtModule } from './own-jwt/own-jwt.module';

@Module({
  imports: [AuthModule, UsersModule, DatabaseModule, OwnJwtModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
