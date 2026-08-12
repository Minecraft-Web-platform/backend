import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatesService } from './states.service';
import { StatesController } from './states.controller';
import { CitiesController } from './cities.controller';
import { ElectionsController } from './elections.controller';
import { StreetsController } from './controllers/streets.controller';
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
import { User } from '../users/entities/user.entity';
import { Account } from '../economy/entities/account.entity';
import { OwnJwtModule } from '../own-jwt/own-jwt.module';
import { UsersModule } from '../users/users.module';
import { MinecraftRconModule } from '../minecraft-rcon/minecraft-rcon.module';
import { EventsModule } from '../events/events.module';

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
      User,
      Account,
    ]),
    OwnJwtModule,
    UsersModule,
    MinecraftRconModule,
    EventsModule,
  ],
  providers: [StatesService, StreetsService],
  controllers: [StatesController, CitiesController, ElectionsController, StreetsController],
  exports: [StatesService],
})
export class StatesModule {}
