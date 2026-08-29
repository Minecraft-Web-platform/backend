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
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this.eventEmitter.on('**', async function (this: { event: string | string[] }, payload: { initiatorUsername?: string, [key: string]: unknown }) {
      const eventName = Array.isArray(this.event) ? this.event.join('.') : this.event;
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
          self.logger.log(
            `Automatically granted achievement "${achievement.title}" to ${username} for event ${eventName}`,
          );
        } catch (err: unknown) {
          const isConflict = err && typeof err === 'object' && 'status' in err && err.status === 409;
          if (!isConflict) {
            // Ignore ConflictException (already has achievement)
            const message = err instanceof Error ? err.message : String(err);
            self.logger.error(`Error granting achievement automatically: ${message}`);
          }
        }
      }
    });
  }
}
