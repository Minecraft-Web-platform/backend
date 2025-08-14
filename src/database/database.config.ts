import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfirmationCode } from 'src/users/entities/confirmation-code.entity';
import { User } from 'src/users/entities/user.entity';

export const typeOrmOptions: TypeOrmModuleOptions = {
  type: 'mysql',
  host: 'mysql.lifehosting.ru',
  port: 3306,
  username: 'u4115_tb4WLWoir9',
  password: 'xUGKheuTLhzeZIRvL=u7I^3z',
  database: 's4115_minecraft',
  entities: [User, ConfirmationCode],
  synchronize: false,
};
