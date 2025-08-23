import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class AddEmailDto {
  @ApiProperty({
    description: 'email of the user',
    example: 'mail@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'email of the user again',
    example: 'mail@example.com',
  })
  @IsEmail()
  repeatEmail: string;
}
