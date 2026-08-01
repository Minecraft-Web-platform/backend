import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { NewsBlock } from 'src/news/entities/news-block.entity';
import { NewsCategory } from 'src/news/entities/news-category.entity';
import { News } from 'src/news/entities/news.entity';
import { ConfirmationCode } from 'src/users/entities/confirmation-code.entity';
import { User } from 'src/users/entities/user.entity';
import 'dotenv/config';

export const typeOrmOptions: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'minecraft',
  password: process.env.DB_PASSWORD || 'minecraft_secret',
  database: process.env.DB_NAME || 'minecraft_db',
  entities: [User, ConfirmationCode, News, NewsBlock, NewsCategory],
  autoLoadEntities: true,
  synchronize: process.env.DB_SYNCHRONIZE === 'true' || true,
};
