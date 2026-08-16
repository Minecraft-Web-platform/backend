import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Achievement } from './entities/achievement.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { CreateAchievementDto, UpdateAchievementDto, GrantAchievementDto } from './dto/achievements.dto';
import { UsersService } from '../users/users.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AchievementsService {
  constructor(
    @InjectRepository(Achievement)
    private achievementRepo: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private userAchievementRepo: Repository<UserAchievement>,
    private usersService: UsersService,
    private eventEmitter: EventEmitter2,
  ) {}

  async getAllAchievements(): Promise<Achievement[]> {
    return this.achievementRepo.find({ order: { createdAt: 'DESC' } });
  }

  async getAchievementsByUsername(username_lower: string): Promise<UserAchievement[]> {
    return this.userAchievementRepo.find({
      where: { user: { username_lower } },
      relations: ['achievement'],
      order: { earnedAt: 'DESC' },
    });
  }

  async createAchievement(dto: CreateAchievementDto): Promise<Achievement> {
    const achievement = this.achievementRepo.create(dto);
    return this.achievementRepo.save(achievement);
  }

  async updateAchievement(id: string, dto: UpdateAchievementDto): Promise<Achievement> {
    const achievement = await this.achievementRepo.findOneBy({ id });
    if (!achievement) {
      throw new NotFoundException('Achievement not found');
    }
    Object.assign(achievement, dto);
    return this.achievementRepo.save(achievement);
  }

  async deleteAchievement(id: string): Promise<void> {
    const res = await this.achievementRepo.delete(id);
    if (res.affected === 0) {
      throw new NotFoundException('Achievement not found');
    }
  }

  async grantAchievement(dto: GrantAchievementDto): Promise<UserAchievement> {
    const user = await this.usersService.getByUsername(dto.username);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const achievement = await this.achievementRepo.findOneBy({ id: dto.achievementId });
    if (!achievement) {
      throw new NotFoundException('Achievement not found');
    }

    const existing = await this.userAchievementRepo.findOne({
      where: { user: { id: user.id }, achievement: { id: achievement.id } },
    });

    if (existing) {
      throw new ConflictException('User already has this achievement');
    }

    const userAchievement = this.userAchievementRepo.create({
      user,
      achievement,
    });

    const saved = await this.userAchievementRepo.save(userAchievement);

    // Emit event for real-time notification via SSE
    this.eventEmitter.emit('achievement.granted', {
      username_lower: user.username_lower,
      achievement,
    });

    return saved;
  }

  async revokeAchievement(dto: GrantAchievementDto): Promise<void> {
    const user = await this.usersService.getByUsername(dto.username);
    if (!user) throw new NotFoundException('User not found');

    const result = await this.userAchievementRepo.delete({
      user: { id: user.id },
      achievement: { id: dto.achievementId },
    });

    if (result.affected === 0) {
      throw new NotFoundException('User does not have this achievement');
    }
  }
}
