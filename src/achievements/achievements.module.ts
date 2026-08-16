import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Achievement } from './entities/achievement.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { AchievementsService } from './achievements.service';
import { AchievementsController } from './achievements.controller';
import { AchievementsListener } from './achievements.listener';
import { UsersModule } from '../users/users.module';
import { OwnJwtModule } from '../own-jwt/own-jwt.module';

@Module({
  imports: [TypeOrmModule.forFeature([Achievement, UserAchievement]), UsersModule, OwnJwtModule],
  controllers: [AchievementsController],
  providers: [AchievementsService, AchievementsListener],
  exports: [AchievementsService],
})
export class AchievementsModule {}
