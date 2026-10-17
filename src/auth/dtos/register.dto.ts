import { IsNotEmpty, IsString, Length, MinLength } from 'class-validator';
export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  username: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 32, { message: 'Длина пароля должна быть от 8 до 32 символов' })
  password: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 32, { message: 'Длина повтора пароля должна быть от 8 до 32 символов' })
  repeatPassword: string;
}
