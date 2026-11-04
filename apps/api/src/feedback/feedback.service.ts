import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '../auth/authed-request.js';
import { composeBugReportMail } from './bug-report-mail.js';
import type { CreateBugReportDto } from './dto/create-bug-report.dto.js';

/** 메일 서버가 느려도 요청을 붙잡고 있지 않도록 끊습니다. */
const SEND_TIMEOUT_MS = 10_000;

/**
 * 버그 신고를 관리자 메일로 보냅니다.
 *
 * 발송은 **Google Apps Script 웹앱**(`BUG_REPORT_WEBHOOK_URL`)에 맡깁니다 —
 * 메일 라이브러리를 들이지 않으려고 HTTP 한 번으로 끝냅니다.
 * **수신 주소는 그 스크립트가 들고 있습니다.** 여기서 `to` 를 보내면
 * URL 을 아는 누구나 아무 주소로 메일을 쏠 수 있는 중계기가 됩니다.
 *
 * 다른 발송 수단(Resend 등)으로 바꿀 때 고칠 곳은 `send` 하나입니다.
 *
 * URL 이 없어도 서버는 떠야 하므로(신고 기능과 무관한 기능이 대부분)
 * **쓸 때** 확인하고 503 으로 알려줍니다.
 */
@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(private readonly config: ConfigService) {}

  async reportBug(
    user: AuthUser,
    dto: CreateBugReportDto,
  ): Promise<{ sent: true }> {
    const mail = composeBugReportMail(user, dto, new Date());

    await this.send(mail.subject, mail.body);

    // 본문은 남기지 않습니다 — 신고 내용이 로그 버퍼에 복사됩니다.
    this.logger.log(`버그 신고를 발송했습니다 (user ${user.id})`);
    return { sent: true };
  }

  private async send(subject: string, body: string): Promise<void> {
    const url = this.config.get<string>('BUG_REPORT_WEBHOOK_URL');
    if (!url) {
      throw new ServiceUnavailableException(
        '버그 신고 발송이 설정되지 않았습니다. apps/api/.env 의 BUG_REPORT_WEBHOOK_URL 을 확인하세요.',
      );
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
    } catch (cause) {
      // 네트워크 실패/타임아웃. 원인은 로그에만 남기고 사용자에겐 재시도를 안내합니다.
      this.logger.error(
        `버그 신고 발송 실패: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
      throw new ServiceUnavailableException(
        '버그 신고를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
    }

    if (!response.ok) {
      this.logger.error(`버그 신고 발송 실패: ${response.status}`);
      throw new ServiceUnavailableException(
        '버그 신고를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
    }
  }
}
