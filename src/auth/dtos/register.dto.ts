import { IsNotEmpty, IsString, Length, Matches, MinLength } from 'class-validator';

const PASSWORD_REGEX = /^[a-zA-Z0-9\-_]+$/;

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  username: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 32, { message: 'The length of the password must be between 8 and 32' })
  @Matches(PASSWORD_REGEX)
  password: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 32, { message: 'The length of the repeatPassword must be between 8 and 32' })
  @Matches(PASSWORD_REGEX)
  repeatPassword: string;
}
