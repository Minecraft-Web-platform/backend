import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { AppService, HealthData } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  async getRoot(): Promise<string> {
    return this.appService.getRootHtml();
  }

  @Get('healthcheck')
  async getHealthcheck(): Promise<HealthData> {
    return this.appService.getHealthData();
  }

  @Get('helthcheck')
  async getHelthcheck(): Promise<HealthData> {
    return this.appService.getHealthData();
  }

  @Get('bg.jpg')
  getBgImage(@Res() res: Response) {
    const possiblePaths = [
      path.join(__dirname, '..', 'assets', 'bg.jpg'),
      path.join(__dirname, 'assets', 'bg.jpg'),
      path.resolve(process.cwd(), 'assets', 'bg.jpg'),
      path.resolve(process.cwd(), '../frontend/public/png/auth-bg-opt.jpg'),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.sendFile(p);
      }
    }
    return res.status(404).send('Background not found');
  }

  @Get('bg.mp4')
  getBgVideo(@Res() res: Response) {
    const possiblePaths = [
      path.join(__dirname, '..', 'assets', 'bg.mp4'),
      path.join(__dirname, 'assets', 'bg.mp4'),
      path.resolve(process.cwd(), 'assets', 'bg.mp4'),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.sendFile(p);
      }
    }
    return res.status(404).send('Video not found');
  }

  @Get('favicon.ico')
  getFavicon(@Res() res: Response) {
    const possiblePaths = [
      path.join(__dirname, '..', 'assets', 'favicon.ico'),
      path.join(__dirname, 'assets', 'favicon.ico'),
      path.resolve(process.cwd(), 'assets', 'favicon.ico'),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        res.setHeader('Content-Type', 'image/x-icon');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.sendFile(p);
      }
    }
    return res.status(404).send('Favicon not found');
  }

  @Get('favicon.svg')
  getFaviconSvg(@Res() res: Response) {
    const possiblePaths = [
      path.join(__dirname, '..', 'assets', 'favicon.svg'),
      path.join(__dirname, 'assets', 'favicon.svg'),
      path.resolve(process.cwd(), 'assets', 'favicon.svg'),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.sendFile(p);
      }
    }
    return res.status(404).send('Favicon not found');
  }
}
