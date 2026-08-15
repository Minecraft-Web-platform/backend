import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, Body, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    if (!file) throw new BadRequestException('Файл не передан');
    
    // Default folder is 'misc', can be overridden (e.g. 'economy', 'news')
    const safeFolder = folder ? folder.replace(/[^a-zA-Z0-9_-]/g, '') : 'misc';
    
    const imageUrl = await this.uploadService.uploadImage(file, safeFolder);
    
    return { url: imageUrl };
  }
}
