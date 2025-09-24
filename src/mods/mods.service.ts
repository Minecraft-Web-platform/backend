import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';

export interface ModItem {
  name: string; // "fabric-api-0.92.1"
  file: string; // "fabric-api-0.92.1.jar"
  required: boolean;
  url: string; // link to the CDN
}

@Injectable()
export class ModsService {
  private s3: S3Client;
  private bucketData = {
    url: 'https://pub-65c17ad883be4ef08f4db54610d96f30.r2.dev',
    name: 'mods',
  };

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

  async getAll(): Promise<{ required: ModItem[]; optional: ModItem[] }> {
    const [required, optional] = await Promise.all([this.listMods('required/'), this.listMods('optional/')]);
    return { required, optional };
  }

  async getOptional(): Promise<ModItem[]> {
    return this.listMods('optional/');
  }

  async getModStream(key: string): Promise<Readable> {
    const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucketData.name, Key: key }));
    return res.Body as Readable;
  }

  private async listMods(prefix: string): Promise<ModItem[]> {
    console.log('Connecting to R2:', {
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      bucket: this.bucketData.name,
      key: prefix,
    });
    const res = await this.s3.send(new ListObjectsV2Command({ Bucket: this.bucketData.name, Prefix: prefix }));

    if (!res.Contents) return [];

    return res.Contents.filter((obj) => obj.Key?.endsWith('.jar')).map((obj) => {
      const file = obj.Key!.split('/').pop()!;
      return {
        name: file.replace(/\.jar$/, ''),
        file,
        required: prefix.startsWith('required'),
        url: `${this.bucketData.url}/${obj.Key}`,
      };
    });
  }
}
