import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatesService } from './states.service';
import { StatesController } from './states.controller';
import { CitiesController } from './cities.controller';
import { ElectionsController } from './elections.controller';
import { StateEntity } from './entities/state.entity';
import { CityEntity } from './entities/city.entity';
import { StateDiplomacyEntity } from './entities/state-diplomacy.entity';
import { StateDecreeEntity } from './entities/state-decree.entity';
import { CitizenshipRequestEntity } from './entities/citizenship-request.entity';
import { ElectionEntity } from './entities/election.entity';
import { ElectionCandidateEntity } from './entities/election-candidate.entity';
import { ElectionVoteEntity } from './entities/election-vote.entity';
import { User } from '../users/entities/user.entity';
import { Account } from '../economy/entities/account.entity';
import { OwnJwtModule } from '../own-jwt/own-jwt.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StateEntity,
      CityEntity,
      StateDiplomacyEntity,
      StateDecreeEntity,
      CitizenshipRequestEntity,
      ElectionEntity,
      ElectionCandidateEntity,
      ElectionVoteEntity,
      User,
      Account,
    ]),
    OwnJwtModule,
    UsersModule,
  ],
  providers: [StatesService],
  controllers: [StatesController, CitiesController, ElectionsController],
  exports: [StatesService],
})
export class StatesModule {}
