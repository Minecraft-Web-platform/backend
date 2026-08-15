import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { News } from './entities/news.entity';
import { NewsCategory } from './entities/news-category.entity';
import { UsersService } from 'src/users/users.service';
import { NewsBlockService } from './news-blocks.service';

@Injectable()
export class AutoNewsService {
  private readonly logger = new Logger(AutoNewsService.name);

  constructor(
    @InjectRepository(News)
    private readonly newsRepo: Repository<News>,
    @InjectRepository(NewsCategory)
    private readonly categoryRepo: Repository<NewsCategory>,
    private readonly usersService: UsersService,
    private readonly blockService: NewsBlockService,
  ) {}

  private async getOrCreateCategory(name: string, description: string): Promise<NewsCategory> {
    let category = await this.categoryRepo.findOne({ where: { name } });
    if (!category) {
      category = this.categoryRepo.create({
        name,
        description,
        publish_permission: 'admins', // normal players shouldn't post here
      });
      category = await this.categoryRepo.save(category);
    }
    return category;
  }

  private async publishAutomaticNews(
    categoryName: string,
    categoryDescription: string,
    title: string,
    content: string,
    initiatorUsername: string,
  ) {
    try {
      const category = await this.getOrCreateCategory(categoryName, categoryDescription);
      
      let author = await this.usersService.getByUsername(initiatorUsername);
      if (!author) {
        // Fallback if no valid author is found, though we should always have one
        author = await this.usersService.getByUsername('Admin'); 
        if (!author) {
          this.logger.warn(`Could not find initiator ${initiatorUsername} or fallback Admin for auto news.`);
          return;
        }
      }

      const news = this.newsRepo.create({
        title,
        author: author.username,
        authorId: author.id,
        category,
        isApproved: true, // Auto news is always approved
      });

      const savedNews = await this.newsRepo.save(news);

      await this.blockService.create({
        newsId: savedNews.id,
        type: 'text',
        content,
        order: 0,
      });

      this.logger.log(`Published auto-news "${title}" in category "${categoryName}"`);
    } catch (error) {
      this.logger.error(`Failed to publish auto-news "${title}": ${error.message}`);
    }
  }

  public async publishStateCreatedNews(stateName: string, creatorUsername: string) {
    const title = `Создано новое государство: ${stateName}`;
    const content = `В мире появилось новое независимое государство — ${stateName}!\n\nОснователь и первый правитель: ${creatorUsername}.\n\nЖелаем новому государству процветания и великих свершений!`;
    
    await this.publishAutomaticNews(
      'Государства',
      'Официальные новости о создании, изменении и жизни государств.',
      title,
      content,
      creatorUsername,
    );
  }

  public async publishIpoNews(companyName: string, sharesCount: number, ipoPrice: number, initiatorUsername: string) {
    const capitalization = sharesCount * ipoPrice;
    const title = `Компания ${companyName} вышла на IPO!`;
    const content = `Историческое событие на фондовом рынке!\n\nКомпания "${companyName}" успешно провела первичное размещение акций (IPO).\n\nВыпущено акций: ${sharesCount} шт.\nНачальная цена за акцию: ${ipoPrice}\nСтартовая капитализация: ${capitalization}\n\nАкции уже доступны для торгов на Национальной Бирже!`;
    
    await this.publishAutomaticNews(
      'IPO',
      'Новости о выходе компаний на биржу и первичных размещениях акций.',
      title,
      content,
      initiatorUsername,
    );
  }

  public async publishCurrencyNews(currencyName: string, currencyCode: string, stateName: string, initiatorUsername: string) {
    const title = `Учреждена новая валюта: ${currencyName}`;
    const content = `Экономика развивается!\n\nГосударство ${stateName} учредило свою национальную валюту — ${currencyName} (${currencyCode.toUpperCase()}).\n\nТеперь эта валюта может использоваться для торговли, инвестиций и расчетов. Центральный банк ${stateName} начал её эмиссию.`;
    
    await this.publishAutomaticNews(
      'Учреждение валюты',
      'Новости о создании новых национальных валют и изменениях в финансовой системе.',
      title,
      content,
      initiatorUsername,
    );
  }
}
