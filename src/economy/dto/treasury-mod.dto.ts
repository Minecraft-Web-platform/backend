import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CheckPermissionsDto {
  @IsString()
  @IsNotEmpty()
  playerUsername: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  entityType: string;
}

export class GetAccountsDto {
  @IsString()
  @IsNotEmpty()
  playerUsername: string;
}

class ItemDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsNumber()
  count: number;
}

export class DepositDto {
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
  amount: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items: ItemDto[];
}

export class WithdrawDto {
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
  amount: string;
}

export class GetAccountCurrencyDto {
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  entityType: string;
}
