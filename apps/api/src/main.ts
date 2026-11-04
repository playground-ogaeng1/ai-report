import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import { BufferedConsoleLogger } from './monitoring/buffered-logger.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // 콘솔 출력은 그대로 두고 링 버퍼에도 함께 담습니다.
    // (관리자 화면에서 최근 로그를 보기 위함)
    logger: new BufferedConsoleLogger(),
  });

  // 브라우저가 api 를 직접 호출하므로(web 에 프록시가 없습니다) CORS 가 필수 경로입니다.
  // 쉼표로 여러 개를 받습니다 — 로컬 + 배포 도메인 + 필요하면 브랜치별 URL.
  // ⚠️ 커밋마다 해시가 바뀌는 Vercel 프리뷰 URL 은 여기에 넣을 수 없습니다.
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  });

  // 기본값(100kB)은 CreateDocumentDto 가 허용하는 content 100,000자보다 작습니다.
  // 한글은 UTF-8 로 글자당 3바이트라 긴 자소서가 413 으로 막혔습니다.
  app.useBodyParser('json', { limit: '1mb' });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // 예외 메시지를 요청에 얹어 요청 로그에 남기게 합니다.
  // (요청 기록 자체는 AppModule 의 RequestLogMiddleware 가 담당)
  app.useGlobalFilters(
    new AllExceptionsFilter(app.get(HttpAdapterHost).httpAdapter),
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API ready on http://localhost:${port}`);
}
await bootstrap();
