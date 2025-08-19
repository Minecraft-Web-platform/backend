import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/users/users.module';
import { OwnJwtService } from 'src/own-jwt/own-jwt.service';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [UsersModule, EmailModule],
  controllers: [AuthController],
  providers: [AuthService, OwnJwtService],
})
export class AuthModule {}
