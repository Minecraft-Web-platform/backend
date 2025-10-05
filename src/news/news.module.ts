import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NewsService } from './news.service';
import { NewsController } from './news.controller';

import { News } from './entities/news.entity';
import { NewsBlock } from './entities/news-block.entity';
import { NewsCategory } from './entities/news-category.entity';
import { AuthModule } from 'src/auth/auth.module';
import { OwnJwtModule } from 'src/own-jwt/own-jwt.module';
import { UsersModule } from 'src/users/users.module';
import { NewsCategoryService } from './news-category.service';
import { NewsCategoryController } from './news-category.controller';

@Module({
  imports: [TypeOrmModule.forFeature([News, NewsBlock, NewsCategory]), OwnJwtModule, UsersModule],
  providers: [NewsService, NewsCategoryService],
  controllers: [NewsController, NewsCategoryController],
  exports: [NewsService],
})
export class NewsModule {}
