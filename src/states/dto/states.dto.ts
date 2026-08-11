import { DiplomacyStatus } from '../entities/state-diplomacy.entity';
import { CitizenshipRequestStatus } from '../entities/citizenship-request.entity';
import { ElectionTargetType } from '../entities/election.entity';

export class CreateStateDto {
  name: string;
  description?: string;
  flagUrl?: string;
  coatOfArmsUrl?: string;
  nationalityMale?: string;
  nationalityFemale?: string;
  citizenshipName?: string;
  leaderUsername?: string;
  capitalCityId?: string;
  playerToPlayerTransferFee?: number;
  playerToCompanyTransferFee?: number;
  ipoFee?: number;
  exchangeTradingFee?: number;
  treasuryAccountNumber?: string;
}

export class UpdateStateDto {
  name?: string;
  description?: string;
  flagUrl?: string;
  coatOfArmsUrl?: string;
  nationalityMale?: string;
  nationalityFemale?: string;
  citizenshipName?: string;
  leaderUsername?: string;
  capitalCityId?: string;
  playerToPlayerTransferFee?: number;
  playerToCompanyTransferFee?: number;
  ipoFee?: number;
  exchangeTradingFee?: number;
  treasuryAccountNumber?: string;
}

export class CreateCityDto {
  name: string;
  description?: string;
  flagUrl?: string;
  mayorUsername?: string;
  stateId?: string;

  treasuryAccountNumber?: string;
}

export class UpdateCityDto {
  name?: string;
  description?: string;
  flagUrl?: string;
  mayorUsername?: string;
  stateId?: string;

  treasuryAccountNumber?: string;
}

export class SetDiplomacyDto {
  stateBId: string;
  status: DiplomacyStatus;
}

export class CreateDecreeDto {
  title: string;
  content: string;
}

export class CreateCitizenshipRequestDto {
  cityId: string;
}

export class ReviewCitizenshipRequestDto {
  status: CitizenshipRequestStatus;
}

export class CreateElectionDto {
  targetType: ElectionTargetType;
  targetId: string;
  startsAt: string;
  endsAt: string;
}

export class NominateCandidateDto {
  programText?: string;
}

export class VoteDto {
  candidateId: string;
}
