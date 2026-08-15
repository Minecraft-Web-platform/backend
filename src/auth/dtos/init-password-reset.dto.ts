import { IsNotEmpty, IsString, Length } from 'class-validator';

export class InitPasswordResetDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 30) // Assuming username length limits
  username: string;
}
