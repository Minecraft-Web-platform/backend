import { IsEmail, IsString } from 'class-validator';

export class TicketDTO {
  @IsString()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  topic: string;

  @IsString()
  content: string;
}
