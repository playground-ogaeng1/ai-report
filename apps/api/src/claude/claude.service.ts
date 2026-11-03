import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

/** 이 프로젝트가 쓰는 모델. 바꿀 때 여기 한 곳만 고칩니다. */
export const CLAUDE_MODEL = 'claude-opus-5';

/**
 * Anthropic 클라이언트.
 *
 * 키가 없어도 서버는 떠야 하므로(문서 등록 등 다른 기능은 키와 무관)
 * **처음 쓸 때** 만듭니다. 설정이 빠졌으면 그 시점에 503 으로 알려줍니다.
 *
 * 키는 api 전용 `.env` 에만 둡니다 — web 으로 넘기면 브라우저에 노출됩니다.
 */
@Injectable()
export class ClaudeService {
  private client: Anthropic | null = null;

  constructor(private readonly config: ConfigService) {}

  getClient(): Anthropic {
    if (this.client) return this.client;

    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Claude API 키가 설정되지 않았습니다. apps/api/.env 의 ANTHROPIC_API_KEY 를 확인하세요.',
      );
    }

    this.client = new Anthropic({ apiKey });
    return this.client;
  }
}
