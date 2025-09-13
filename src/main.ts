import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['log', 'error', 'fatal', 'warn'] });

  app.enableCors({
    origin: [
      'https://khroniki-kraya.com',
      'https://www.khroniki-kraya.com',
      'https://frontend-bay-eight-67.vercel.app',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Minecraft website API')
    .setDescription('The APIs of all services')
    .setVersion('1.0')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, documentFactory);

  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
