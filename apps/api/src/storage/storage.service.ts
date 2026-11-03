import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** 원본 파일을 담는 비공개 버킷 */
const BUCKET = 'documents';

/**
 * Supabase Storage 래퍼.
 *
 * **시크릿 키로 접근합니다.** 버킷은 비공개이고 RLS 정책을 두지 않습니다.
 * 소유권 확인은 api 가 JWT 의 사용자 ID 로 수행합니다 (경로에 userId 를 넣고,
 * DB 조회도 userId 조건으로 하므로 남의 파일에 닿을 수 없습니다).
 *
 * 키가 없어도 서버는 떠야 하므로(Phase 1 기능은 키와 무관) 클라이언트를
 * **처음 쓸 때** 만듭니다. 설정이 빠졌으면 그 시점에 503 으로 알려줍니다.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private client: SupabaseClient | null = null;
  private bucketReady = false;

  constructor(private readonly config: ConfigService) {}

  private getClient(): SupabaseClient {
    if (this.client) return this.client;

    const url = this.config.get<string>('SUPABASE_URL');
    const secretKey = this.config.get<string>('SUPABASE_SECRET_KEY');

    if (!url || !secretKey) {
      throw new ServiceUnavailableException(
        '파일 저장소가 설정되지 않았습니다. apps/api/.env 의 SUPABASE_SECRET_KEY 를 확인하세요.',
      );
    }

    this.client = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return this.client;
  }

  /** 버킷이 없으면 만듭니다. 한 번 확인하면 다시 확인하지 않습니다. */
  private async ensureBucket(): Promise<void> {
    if (this.bucketReady) return;

    const { error } = await this.getClient().storage.createBucket(BUCKET, {
      public: false,
    });

    // 이미 있으면 그대로 진행합니다.
    if (error && !/already exists/i.test(error.message)) {
      throw new ServiceUnavailableException(
        `저장소 버킷(${BUCKET}) 준비에 실패했습니다: ${error.message}`,
      );
    }
    if (!error) {
      this.logger.log(`Storage 버킷 '${BUCKET}' 을 생성했습니다.`);
    }
    this.bucketReady = true;
  }

  async upload(
    path: string,
    bytes: Uint8Array | Buffer,
    contentType: string,
  ): Promise<void> {
    await this.ensureBucket();

    const { error } = await this.getClient()
      .storage.from(BUCKET)
      .upload(path, bytes, { contentType, upsert: false });

    if (error) {
      throw new ServiceUnavailableException(
        `파일 업로드에 실패했습니다: ${error.message}`,
      );
    }
  }

  /** 삭제 실패는 치명적이지 않으므로 경고만 남깁니다(고아 객체는 나중에 정리). */
  async remove(path: string): Promise<void> {
    const { error } = await this.getClient().storage.from(BUCKET).remove([path]);

    if (error) {
      this.logger.warn(`파일 삭제 실패 (${path}): ${error.message}`);
    }
  }

  /** 만료 시간이 있는 다운로드 URL. 버킷이 비공개라 이 방법으로만 내려받습니다. */
  async createSignedUrl(path: string, expiresInSeconds = 60): Promise<string> {
    const { data, error } = await this.getClient()
      .storage.from(BUCKET)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data) {
      throw new ServiceUnavailableException(
        `다운로드 URL 생성에 실패했습니다: ${error?.message ?? '알 수 없는 오류'}`,
      );
    }
    return data.signedUrl;
  }
}
