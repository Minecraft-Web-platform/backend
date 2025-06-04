import { Module } from '@nestjs/common';
import { JwtService } from './own-jwt.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  providers: [JwtService],
  imports: [
    JwtModule.register({
      global: true,
      secret: 'hehehe',
      signOptions: { expiresIn: '1h' },
    }),
  ],
})
export class OwnJwtModule {}
