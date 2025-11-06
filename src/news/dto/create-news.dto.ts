import { IsArray, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateNewsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  author: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsArray()
  blocks: { type: 'text' | 'image'; content: string }[];
}
