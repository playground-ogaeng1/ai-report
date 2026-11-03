import { InterviewDifficulty } from '@ppp/db';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateInterviewDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsEnum(InterviewDifficulty)
  difficulty!: InterviewDifficulty;

  /** 없으면 문서 없이 진행합니다. */
  @IsOptional()
  @IsString()
  documentId?: string;
}

export class SendMessageDto {
  /**
   * 지원자의 답변.
   *
   * 비워서 보내면 **답변 없이 면접관 턴만 생성**합니다 —
   * 첫 질문(아직 대화가 없을 때)과 실패 후 재시도에 씁니다.
   */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  content?: string;
}
