import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { APP_NAME } from './constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle(`${APP_NAME} API`)
    .setDescription(
      `REST API for managing ${APP_NAME.toLowerCase()} related to orders. This service handles payment history with timestamps and integrates with the main Orders service.`,
    )
    .setVersion('1.0')
    .addTag(APP_NAME)
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(
    `🚀 Application is running on: http://localhost:${port}`,
    APP_NAME,
  );
  Logger.log(
    `📚 Swagger documentation: http://localhost:${port}/api/docs`,
    APP_NAME,
  );
}
bootstrap();
