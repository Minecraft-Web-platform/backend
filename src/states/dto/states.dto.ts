import { DiplomacyStatus } from '../entities/state-diplomacy.entity';
import { CitizenshipRequestStatus } from '../entities/citizenship-request.entity';
import { ElectionTargetType } from '../entities/election.entity';
import { IsString, IsOptional, IsNumber, IsIn, IsArray } from 'class-validator';

export class CreateStateDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  flagUrl?: string;

  @IsString()
  @IsOptional()
  coatOfArmsUrl?: string;

  @IsString()
  @IsOptional()
  nationalityMale?: string;

  @IsString()
  @IsOptional()
  nationalityFemale?: string;

  @IsString()
  @IsOptional()
  citizenshipName?: string;

  @IsString()
  @IsOptional()
  leaderUsername?: string;

  @IsString()
  @IsOptional()
  capitalSettlementId?: string;

  @IsNumber()
  @IsOptional()
  playerToPlayerTransferFee?: number;

  @IsNumber()
  @IsOptional()
  playerToCompanyTransferFee?: number;

  @IsNumber()
  @IsOptional()
  ipoFee?: number;

  @IsNumber()
  @IsOptional()
  exchangeTradingFee?: number;

  @IsString()
  @IsOptional()
  treasuryAccountNumber?: string;

  @IsString()
  @IsOptional()
  color?: string;
}

export class UpdateStateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  flagUrl?: string;

  @IsString()
  @IsOptional()
  coatOfArmsUrl?: string;

  @IsString()
  @IsOptional()
  nationalityMale?: string;

  @IsString()
  @IsOptional()
  nationalityFemale?: string;

  @IsString()
  @IsOptional()
  citizenshipName?: string;

  @IsString()
  @IsOptional()
  leaderUsername?: string;

  @IsString()
  @IsOptional()
  capitalSettlementId?: string;

  @IsNumber()
  @IsOptional()
  playerToPlayerTransferFee?: number;

  @IsNumber()
  @IsOptional()
  playerToCompanyTransferFee?: number;

  @IsNumber()
  @IsOptional()
  ipoFee?: number;

  @IsNumber()
  @IsOptional()
  exchangeTradingFee?: number;

  @IsString()
  @IsOptional()
  treasuryAccountNumber?: string;

  @IsString()
  @IsOptional()
  color?: string;
}

export class CreateSettlementDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  flagUrl?: string;

  @IsString()
  @IsOptional()
  mayorUsername?: string;

  @IsString()
  @IsOptional()
  stateId?: string;

  @IsString()
  @IsOptional()
  treasuryAccountNumber?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  centerX?: number;

  @IsNumber()
  @IsOptional()
  centerZ?: number;

  @IsString()
  @IsOptional()
  status?: 'capital' | 'settlement' | 'rural';

  @IsString()
  @IsOptional()
  ruralSubTypeId?: string;
}

export class UpdateSettlementDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  flagUrl?: string;

  @IsString()
  @IsOptional()
  mayorUsername?: string;

  @IsString()
  @IsOptional()
  stateId?: string;

  @IsString()
  @IsOptional()
  treasuryAccountNumber?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  centerX?: number;

  @IsNumber()
  @IsOptional()
  centerZ?: number;

  @IsString()
  @IsOptional()
  status?: 'capital' | 'settlement' | 'rural';

  @IsString()
  @IsOptional()
  ruralSubTypeId?: string;
}

export class SetDiplomacyDto {
  @IsString()
  stateBId: string;

  @IsIn(['ally', 'neutral', 'war'])
  status: DiplomacyStatus;
}

export class CreateDecreeDto {
  @IsString()
  title: string;

  @IsString()
  content: string;
}

export class CreateCitizenshipRequestDto {
  @IsString()
  settlementId: string;
}

export class ReviewCitizenshipRequestDto {
  @IsIn(['pending', 'approved', 'rejected'])
  status: CitizenshipRequestStatus;
}

export class CreateElectionDto {
  @IsIn(['state', 'settlement'])
  targetType: ElectionTargetType;

  @IsString()
  targetId: string;

  @IsString()
  startsAt: string;

  @IsString()
  endsAt: string;
}

export class NominateCandidateDto {
  @IsString()
  @IsOptional()
  programText?: string;
}

export class VoteDto {
  @IsString()
  candidateId: string;
}
