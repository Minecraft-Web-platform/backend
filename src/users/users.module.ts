import { Global, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { ConfirmCodeService } from './confirm-code.service';
import { ConfirmationCode } from './entities/confirmation-code.entity';
import { ConfirmCodeRepository } from './repositories/confirm-code.repository';
import { OwnJwtModule } from 'src/own-jwt/own-jwt.module';
import { UploadModule } from 'src/upload/upload.module';
import { MinecraftRconModule } from 'src/minecraft-rcon/minecraft-rcon.module';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, ConfirmationCode]), OwnJwtModule, UploadModule, MinecraftRconModule],
  providers: [UsersService, ConfirmCodeService, ConfirmCodeRepository],
  controllers: [UsersController],
  exports: [UsersService, ConfirmCodeService, TypeOrmModule],
})
export class UsersModule {}
