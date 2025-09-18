import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfirmationCode } from 'src/users/entities/confirmation-code.entity';
import { User } from 'src/users/entities/user.entity';

export const typeOrmOptions: TypeOrmModuleOptions = {
  type: 'mysql',
  host: 'mysql.lifehosting.ru',
  port: 3306,
  username: 'u4638_RaalTBQgbN',
  password: '=DnRPvKIB62hPGabkn!w@w9O',
  database: 's4638_auth',
  entities: [User, ConfirmationCode],
  synchronize: false,
};
