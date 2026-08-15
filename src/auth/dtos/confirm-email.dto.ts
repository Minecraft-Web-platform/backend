import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ConfirmEmailDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  confirmationCode: string;
}
