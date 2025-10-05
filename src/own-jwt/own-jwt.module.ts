import { Module } from '@nestjs/common';
import { OwnJwtService } from './own-jwt.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  providers: [OwnJwtService],
  imports: [
    JwtModule.register({
      global: true,
    }),
  ],
  exports: [OwnJwtService]
})
export class OwnJwtModule {}
