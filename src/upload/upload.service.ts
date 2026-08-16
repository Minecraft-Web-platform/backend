import { Injectable, BadRequestException } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as path from 'path';

@Injectable()
export class UploadService {
  private s3: S3Client;

  // Hardcoding based on the user's new consolidated bucket name
  private bucketName = 'khroniki-kraya';
  private publicUrl = 'https://pub-15916e7fa9d140d697cc7c68ff3a9943.r2.dev';

  constructor() {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY!,
        secretAccessKey: process.env.R2_SECRET_KEY!,
      },
    });
  }

  async uploadImage(file: Express.Multer.File, folder: string = 'misc', customFileName?: string): Promise<string> {
    if (!file) throw new BadRequestException('Файл не передан');

    // Only allow images
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
      throw new BadRequestException('Разрешены только форматы JPG, PNG, WEBP, GIF');
    }

    const ext = path.extname(file.originalname);
    const fileName = customFileName ? customFileName : `${randomUUID()}${ext}`;
    const key = `${folder}/${fileName}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `${this.publicUrl}/${key}`;
  }
}
