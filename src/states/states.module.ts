import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatesService } from './states.service';
import { StatesController } from './states.controller';
import { CitiesController } from './cities.controller';
import { ElectionsController } from './elections.controller';
import { StreetsController } from './controllers/streets.controller';
import { TerritoriesController } from './controllers/territories.controller';
import { StreetsService } from './services/streets.service';
import { StateEntity } from './entities/state.entity';
import { CityEntity } from './entities/city.entity';
import { StateDiplomacyEntity } from './entities/state-diplomacy.entity';
import { StateDecreeEntity } from './entities/state-decree.entity';
import { StateTreasuryItemEntity } from './entities/state-treasury-item.entity';
import { CitizenshipRequestEntity } from './entities/citizenship-request.entity';
import { ElectionEntity } from './entities/election.entity';
import { ElectionCandidateEntity } from './entities/election-candidate.entity';
import { ElectionVoteEntity } from './entities/election-vote.entity';
import { StreetEntity } from './entities/street.entity';
import { TerritoryEntity } from './entities/territory.entity';
import { User } from '../users/entities/user.entity';
import { Account } from '../economy/entities/account.entity';
import { Company } from '../economy/entities/company.entity';
import { OwnJwtModule } from '../own-jwt/own-jwt.module';
import { UsersModule } from '../users/users.module';
import { MinecraftRconModule } from '../minecraft-rcon/minecraft-rcon.module';
import { EventsModule } from '../events/events.module';
import { NewsModule } from '../news/news.module';

import { CitiesService } from './services/cities.service';
import { ElectionsService } from './services/elections.service';
import { TerritoriesService } from './services/territories.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StateEntity,
      CityEntity,
      StateDiplomacyEntity,
      StateDecreeEntity,
      StateTreasuryItemEntity,
      CitizenshipRequestEntity,
      ElectionEntity,
      ElectionCandidateEntity,
      ElectionVoteEntity,
      StreetEntity,
      TerritoryEntity,
      User,
      Account,
      Company,
    ]),
    OwnJwtModule,
    UsersModule,
    MinecraftRconModule,
    EventsModule,
    NewsModule,
  ],
  providers: [StatesService, StreetsService, CitiesService, ElectionsService, TerritoriesService],
  controllers: [StatesController, CitiesController, ElectionsController, StreetsController, TerritoriesController],
  exports: [StatesService, CitiesService, ElectionsService, TerritoriesService],
})
export class StatesModule {}
