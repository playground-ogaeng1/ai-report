import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import { BufferedConsoleLogger } from './monitoring/buffered-logger.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // 콘솔 출력은 그대로 두고 링 버퍼에도 함께 담습니다.
    // (관리자 화면에서 최근 로그를 보기 위함)
    logger: new BufferedConsoleLogger(),
  });

  // Next.js(:3000) 에서 브라우저로 직접 호출할 수 있게 CORS 허용
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // 예외 메시지를 요청에 얹어 요청 로그에 남기게 합니다.
  // (요청 기록 자체는 AppModule 의 RequestLogMiddleware 가 담당)
  app.useGlobalFilters(
    new AllExceptionsFilter(app.get(HttpAdapterHost).httpAdapter),
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 API ready on http://localhost:${port}`);
}
await bootstrap();
