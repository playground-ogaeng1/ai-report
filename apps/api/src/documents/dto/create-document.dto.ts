import { DocumentKind } from '@ppp/db';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

/** 텍스트를 직접 붙여넣어 등록할 때 */
export class CreateDocumentDto {
  @IsEnum(DocumentKind)
  kind!: DocumentKind;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(100_000)
  content!: string;
}

/**
 * 파일 업로드 시 함께 오는 폼 필드.
 * multipart 라서 값이 전부 문자열로 들어옵니다 (content 는 파일에서 추출).
 */
export class UploadDocumentDto {
  @IsEnum(DocumentKind)
  kind!: DocumentKind;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;
}
