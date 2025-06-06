import { IsEmail } from 'class-validator';

export class AddEmailDto {
  @IsEmail()
  email: string;

  @IsEmail()
  repeatEmail: string;
}
