import { BadRequestException } from '@nestjs/common';
import { assertPdf, extractPdfText } from './pdf-text.js';

/** 텍스트 한 줄이 들어간 최소 PDF 를 만듭니다. */
function makePdf(text: string): Uint8Array {
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
  ];

  const stream = `BT /F1 14 Tf 20 120 Td (${text}) Tj ET`;
  objects.push(
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
  );
  objects.push(
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  );

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return new Uint8Array(Buffer.from(pdf, 'latin1'));
}

describe('assertPdf', () => {
  it('%PDF- 로 시작하면 통과한다', () => {
    expect(() => assertPdf(makePdf('hello'))).not.toThrow();
  });

  it('확장자만 바꾼 파일은 거부한다 — MIME 는 위조할 수 있으므로 바이트를 본다', () => {
    const notPdf = new Uint8Array(Buffer.from('PK zip 입니다'));
    expect(() => assertPdf(notPdf)).toThrow(BadRequestException);
  });

  it('빈 파일도 거부한다', () => {
    expect(() => assertPdf(new Uint8Array())).toThrow(BadRequestException);
  });
});

describe('extractPdfText', () => {
  it('텍스트 레이어가 있으면 추출한다', async () => {
    const text = await extractPdfText(makePdf('Backend Engineer Resume'));
    expect(text).toContain('Backend Engineer');
  });

  it('스캔 이미지 PDF(텍스트 없음)는 안내와 함께 거부한다', async () => {
    // 텍스트 오브젝트가 없는 PDF — OCR 이 필요한 경우입니다.
    // 조용히 빈 문서를 만들면 나중 첨삭이 이상하게 동작합니다.
    await expect(extractPdfText(makePdf(''))).rejects.toThrow(
      /스캔 이미지/,
    );
  });

  it('PDF 가 아니면 읽기 전에 거부한다', async () => {
    const notPdf = new Uint8Array(Buffer.from('그냥 텍스트 파일'));
    await expect(extractPdfText(notPdf)).rejects.toThrow(BadRequestException);
  });
});
