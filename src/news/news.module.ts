import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NewsService } from './news.service';
import { NewsController } from './news.controller';

import { News } from './entities/news.entity';
import { NewsBlock } from './entities/news-block.entity';
import { NewsCategory } from './entities/news-category.entity';
import { OwnJwtModule } from 'src/own-jwt/own-jwt.module';
import { UsersModule } from 'src/users/users.module';
import { NewsCategoryService } from './news-category.service';
import { NewsCategoryController } from './news-category.controller';
import { NewsBlockService } from './news-blocks.service';
import { NewsAdminController } from './news-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([News, NewsBlock, NewsCategory]), OwnJwtModule, UsersModule],
  providers: [NewsService, NewsCategoryService, NewsBlockService],
  controllers: [NewsController, NewsCategoryController, NewsAdminController],
})
export class NewsModule {}
