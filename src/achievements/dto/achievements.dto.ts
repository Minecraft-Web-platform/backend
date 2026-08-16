import { IsString, IsOptional, IsEnum } from 'class-validator';
import { AchievementRarity } from '../entities/achievement.entity';

export class CreateAchievementDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  iconUrl?: string;

  @IsEnum(AchievementRarity)
  @IsOptional()
  rarity?: AchievementRarity;

  @IsString()
  @IsOptional()
  triggerEvent?: string;
}

export class UpdateAchievementDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  iconUrl?: string;

  @IsEnum(AchievementRarity)
  @IsOptional()
  rarity?: AchievementRarity;

  @IsString()
  @IsOptional()
  triggerEvent?: string;
}

export class GrantAchievementDto {
  @IsString()
  username: string;

  @IsString()
  achievementId: string;
}
