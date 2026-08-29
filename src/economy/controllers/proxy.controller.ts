import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('proxy')
export class ProxyController {
  @Get('image')
  async proxyImage(@Query('url') imageUrl: string, @Res() res: Response) {
    if (!imageUrl) {
      return res.status(400).send('URL is required');
    }
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return res.status(response.status).send('Failed to fetch image');
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      res.set('Content-Type', response.headers.get('content-type') || 'image/webp');
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cache-Control', 'public, max-age=31536000');
      res.send(buffer);
    } catch {
      res.status(500).send('Error proxying image');
    }
  }
}
