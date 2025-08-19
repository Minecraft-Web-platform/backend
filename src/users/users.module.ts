import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { ConfirmCodeService } from './confirm-code.service';
import { ConfirmationCode } from './entities/confirmation-code.entity';
import { ConfirmCodeRepository } from './repositories/confirm-code.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User, ConfirmationCode])],
  providers: [UsersService, ConfirmCodeService, ConfirmCodeRepository],
  controllers: [UsersController],
  exports: [UsersService, ConfirmCodeService],
})
export class UsersModule {}
