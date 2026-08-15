import { IsString, IsNotEmpty, IsOptional, IsNumberString, IsNumber } from 'class-validator';

export class CheckStatePermissionsDto {
  @IsString()
  @IsNotEmpty()
  playerUsername: string;
}

export class GetPortfolioDto {
  @IsString()
  @IsNotEmpty()
  playerUsername: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  entityType: string;

  @IsString()
  @IsOptional()
  exchangeStateId?: string;
}

export class GetIdentitiesDto {
  @IsString()
  @IsNotEmpty()
  playerUsername: string;
}

export class GetCompaniesDto {
  @IsString()
  @IsOptional()
  exchangeStateId?: string;
}

export class WithdrawSharesDto {
  @IsString()
  @IsNotEmpty()
  playerUsername: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  entityType: string;

  @IsString()
  @IsNotEmpty()
  companyId: string;

  @IsString()
  @IsNotEmpty()
  sharesCount: string;
}

export class DepositSharesDto {
  @IsString()
  @IsNotEmpty()
  playerUsername: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  entityType: string;

  @IsString()
  @IsNotEmpty()
  certificateId: string;
}

export class BuySharesDto {
  @IsString()
  @IsNotEmpty()
  playerUsername: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  entityType: string;

  @IsString()
  @IsNotEmpty()
  companyId: string;

  @IsString()
  @IsNotEmpty()
  sharesCount: string;
}
