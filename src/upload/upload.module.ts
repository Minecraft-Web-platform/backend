import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { OwnJwtModule } from 'src/own-jwt/own-jwt.module';

@Module({
  imports: [OwnJwtModule],
  providers: [UploadService],
  controllers: [UploadController],
  exports: [UploadService],
})
export class UploadModule {}
