import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NewsService } from './news.service';
import { NewsController } from './news.controller';

import { News } from './entities/news.entity';
import { NewsBlock } from './entities/news-block.entity';
import { NewsCategory } from './entities/news-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([News, NewsBlock, NewsCategory])],
  providers: [NewsService],
  controllers: [NewsController],
  exports: [NewsService],
})
export class NewsModule {}
