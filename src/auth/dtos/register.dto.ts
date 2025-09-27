import { IsNotEmpty, IsString, Length, MinLength } from 'class-validator';
export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  username: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 32, { message: 'The length of the password must be between 8 and 32' })
  password: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 32, { message: 'The length of the repeatPassword must be between 8 and 32' })
  repeatPassword: string;
}
