import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RequestLogMiddleware } from './monitoring/request-log.middleware.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { InterviewsModule } from './interviews/interviews.module.js';
import { UsageModule } from './usage/usage.module.js';
import { MonitoringModule } from './monitoring/monitoring.module.js';

@Module({
  imports: [
    // apps/api/.env (앱 전용) + 루트 .env (DB 공용) 을 함께 읽습니다.
    // 앞에 있는 파일이 우선이므로 앱 전용 값으로 덮어쓸 수 있습니다.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    AuthModule,
    DocumentsModule,
    ReviewsModule,
    InterviewsModule,
    UsageModule,
    MonitoringModule,
  ],
  controllers: [AppController],
  providers: [AppService, RequestLogMiddleware],
})
export class AppModule implements NestModule {
  /**
   * 요청 기록은 **미들웨어**로 붙입니다 — 가드보다 먼저 실행돼야
   * 인증 실패(401)·권한 없음(404) 요청도 기록에 남습니다.
   * (인터셉터는 가드 뒤라서 거절된 요청을 못 봅니다)
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLogMiddleware).forRoutes({
      // 중괄호로 감싸야 **세그먼트 0개(루트 `/`)도 포함**합니다.
      // `'*path'` 는 1개 이상만 매칭해서 `GET /` 가 기록되지 않습니다.
      // (Express 5 / path-to-regexp v8 문법)
      path: '{*path}',
      method: RequestMethod.ALL,
    });
  }
}
