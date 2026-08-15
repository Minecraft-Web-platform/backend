import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { Currency } from './entities/currency.entity';
import { CreditCard } from './entities/credit-card.entity';
import { Transfer } from './entities/transfer.entity';
import { Company } from './entities/company.entity';
import { CompanyShare } from './entities/company-share.entity';
import { CompanySharePriceHistory } from './entities/company-share-price-history.entity';
import { WithdrawnShare } from './entities/withdrawn-share.entity';
import { Property } from './entities/property.entity';
import { IpoRequest } from './entities/ipo-request.entity';
import { StateEntity } from '../states/entities/state.entity';
import { CityEntity } from '../states/entities/city.entity';
import { StateTreasuryItemEntity } from '../states/entities/state-treasury-item.entity';
import { User } from '../users/entities/user.entity';
import { EconomyService } from './services/economy.service';
import { CurrenciesService } from './services/currencies.service';
import { CompaniesService } from './services/companies.service';
import { StockExchangeService } from './services/stock-exchange.service';
import { EconomyController } from './controllers/economy.controller';
import { CurrenciesController } from './controllers/currencies.controller';
import { CompaniesController } from './controllers/companies.controller';
import { StockExchangeController } from './controllers/stock-exchange.controller';
import { TreasuryModController } from './controllers/treasury-mod.controller';
import { StockModController } from './controllers/stock-mod.controller';
import { PropertyController } from './controllers/property.controller';
import { PropertyService } from './services/property.service';
import { CompanyServicesService } from './services/company-services.service';
import { CompanyServicesController } from './controllers/company-services.controller';
import { OwnJwtModule } from '../own-jwt/own-jwt.module';
import { UsersModule } from '../users/users.module';
import { MinecraftRconModule } from '../minecraft-rcon/minecraft-rcon.module';
import { StatesModule } from '../states/states.module';
import { NewsModule } from '../news/news.module';

import { AccountTreasuryItemEntity } from './entities/account-treasury-item.entity';
import { CompanyService } from './entities/company-service.entity';
import { CompanyServiceSubItem } from './entities/company-service-sub-item.entity';
import { CompanyOrder } from './entities/company-order.entity';
import { CompanyOrderItem } from './entities/company-order-item.entity';
import { CompanyOrderStatusHistory } from './entities/company-order-status-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Account,
      Currency,
      CreditCard,
      Transfer,
      Company,
      CompanyShare,
      CompanySharePriceHistory,
      StateEntity,
      CityEntity,
      StateTreasuryItemEntity,
      User,
      AccountTreasuryItemEntity,
      WithdrawnShare,
      Property,
      IpoRequest,
      CompanyService,
      CompanyServiceSubItem,
      CompanyOrder,
      CompanyOrderItem,
      CompanyOrderStatusHistory,
    ]),
    OwnJwtModule,
    UsersModule,
    MinecraftRconModule,
    StatesModule,
    NewsModule,
  ],
  providers: [
    EconomyService,
    CurrenciesService,
    CompaniesService,
    StockExchangeService,
    PropertyService,
    CompanyServicesService,
  ],
  controllers: [
    EconomyController,
    CurrenciesController,
    CompaniesController,
    StockExchangeController,
    TreasuryModController,
    StockModController,
    PropertyController,
    CompanyServicesController,
  ],
  exports: [
    EconomyService,
    CurrenciesService,
    CompaniesService,
    StockExchangeService,
    PropertyService,
    CompanyServicesService,
  ],
})
export class EconomyModule {}
