import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PublicApiModule } from './public-api/public-api.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const openApiConfig = new DocumentBuilder()
    .setTitle('RAILROAD Public API')
    .setDescription(
      'Unofficial read-only API for live Korean railway train and station data.',
    )
    .setVersion('1.0')
    .addServer('/api', 'Public gateway')
    .build();
  const openApiDocument = SwaggerModule.createDocument(app, openApiConfig, {
    include: [PublicApiModule],
  });
  SwaggerModule.setup('docs', app, openApiDocument, {
    jsonDocumentUrl: 'openapi.json',
  });

  await app.listen(configService.getOrThrow<number>('server.port'));
}
void bootstrap();
