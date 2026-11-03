import { BadRequestException } from '@nestjs/common';
import { extractText, getDocumentProxy } from 'unpdf';

/** PDF 파일은 `%PDF-` 로 시작합니다. 확장자·MIME 는 위조할 수 있으니 실제 바이트를 봅니다. */
export function assertPdf(bytes: Uint8Array): void {
  const header = Buffer.from(bytes.subarray(0, 5)).toString('latin1');

  if (header !== '%PDF-') {
    throw new BadRequestException(
      'PDF 파일이 아닙니다. 확장자만 바꾼 파일은 등록할 수 없습니다.',
    );
  }
}

/**
 * PDF 에서 본문 텍스트를 추출합니다.
 *
 * unpdf 를 쓰는 이유: PDF.js 를 serverless 용으로 빌드해서 canvas 같은
 * 네이티브 의존성이 없습니다. 컨테이너 배포에서 빌드가 깨질 일이 적습니다.
 *
 * 스캔한 이미지 PDF 는 텍스트 레이어가 없어 추출 결과가 비어 있습니다.
 * 그 경우 OCR 이 필요하므로 여기서 걸러 사용자에게 알려줍니다.
 */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  assertPdf(bytes);

  let text: string;
  try {
    const pdf = await getDocumentProxy(bytes);
    const result = await extractText(pdf, { mergePages: true });
    text = result.text;
  } catch (cause) {
    throw new BadRequestException(
      `PDF 를 읽을 수 없습니다: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
  }

  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  if (normalized.length < 10) {
    throw new BadRequestException(
      '텍스트를 추출하지 못했습니다. 스캔 이미지로 된 PDF 는 지원하지 않습니다 — 텍스트로 직접 붙여넣어 주세요.',
    );
  }

  return normalized;
}
