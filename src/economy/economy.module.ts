import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { Currency } from './entities/currency.entity';
import { CreditCard } from './entities/credit-card.entity';
import { Transfer } from './entities/transfer.entity';
import { Company } from './entities/company.entity';
import { CompanyShare } from './entities/company-share.entity';
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
import { OwnJwtModule } from '../own-jwt/own-jwt.module';
import { UsersModule } from '../users/users.module';
import { MinecraftRconModule } from '../minecraft-rcon/minecraft-rcon.module';

import { AccountTreasuryItemEntity } from './entities/account-treasury-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Account,
      Currency,
      CreditCard,
      Transfer,
      Company,
      CompanyShare,
      StateEntity,
      CityEntity,
      StateTreasuryItemEntity,
      User,
      AccountTreasuryItemEntity,
    ]),
    OwnJwtModule,
    UsersModule,
    MinecraftRconModule,
  ],
  providers: [
    EconomyService,
    CurrenciesService,
    CompaniesService,
    StockExchangeService,
  ],
  controllers: [
    EconomyController,
    CurrenciesController,
    CompaniesController,
    StockExchangeController,
    TreasuryModController,
  ],
  exports: [
    EconomyService,
    CurrenciesService,
    CompaniesService,
    StockExchangeService,
  ],
})
export class EconomyModule {}
