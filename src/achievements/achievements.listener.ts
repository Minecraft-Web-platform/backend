import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Achievement } from './entities/achievement.entity';
import { AchievementsService } from './achievements.service';

@Injectable()
export class AchievementsListener implements OnModuleInit {
  private readonly logger = new Logger(AchievementsListener.name);

  constructor(
    @InjectRepository(Achievement)
    private achievementRepo: Repository<Achievement>,
    private achievementsService: AchievementsService,
    private eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    const self = this;
    this.eventEmitter.on('**', async function (this: any, payload: any) {
      const eventName = this.event;
      if (!eventName || !payload || !payload.initiatorUsername) {
        return;
      }

      const username = payload.initiatorUsername;
      
      // Find achievements that trigger on this event
      const achievements = await self.achievementRepo.find({
        where: { triggerEvent: eventName },
      });

      for (const achievement of achievements) {
        try {
          await self.achievementsService.grantAchievement({
            username,
            achievementId: achievement.id,
          });
          self.logger.log(`Automatically granted achievement "${achievement.title}" to ${username} for event ${eventName}`);
        } catch (err: any) {
          if (err.status !== 409) { // Ignore ConflictException (already has achievement)
            self.logger.error(`Error granting achievement automatically: ${err.message}`);
          }
        }
      }
    });
  }
}
