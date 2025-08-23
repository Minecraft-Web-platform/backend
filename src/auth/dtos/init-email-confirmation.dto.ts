import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class initEmailConfirmationDto {
  @IsEmail()
  @ApiProperty({
    description: 'Email of the user',
    example: 'mail@example.com',
  })
  email: string;
}
