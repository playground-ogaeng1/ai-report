import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** 버그 신고 본문. 길이 상한은 web 의 BUG_REPORT_MAX_LENGTH 와 맞춥니다. */
export class CreateBugReportDto {
  @IsString()
  @MinLength(10)
  @MaxLength(5_000)
  message!: string;

  /**
   * 신고가 난 화면 경로. 브라우저가 채워 보냅니다.
   *
   * 없어도 발송합니다 — 경로를 못 받는 것보다 신고를 놓치는 게 손해입니다.
   * 신고자 이메일은 여기로 받지 않습니다(JWT 클레임에서 가져옵니다).
   */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  path?: string;
}
