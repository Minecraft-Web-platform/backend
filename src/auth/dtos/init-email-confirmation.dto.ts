import { IsEmail } from 'class-validator';

export class initEmailConfirmationDto {
  @IsEmail()
  email: string;
}
