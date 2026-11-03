import { DocumentKind } from '@ppp/db';
import {
  buildReviewSystemPrompt,
  buildReviewUserPrompt,
} from './review-prompt.js';

const ALL_KINDS = [
  DocumentKind.RESUME,
  DocumentKind.COVER_LETTER,
  DocumentKind.PORTFOLIO,
];

describe('buildReviewSystemPrompt', () => {
  it('문서 종류마다 다른 기준을 넣는다', () => {
    const prompts = ALL_KINDS.map((kind) => buildReviewSystemPrompt(kind));

    expect(prompts[0]).toContain('이력서를 봅니다');
    expect(prompts[1]).toContain('자기소개서를 봅니다');
    expect(prompts[2]).toContain('포트폴리오를 봅니다');
    // 서로 다른 내용이어야 합니다 (enum 추가 시 복붙 실수 방지)
    expect(new Set(prompts).size).toBe(ALL_KINDS.length);
  });

  it.each(ALL_KINDS)(
    '%s — 사실을 만들어내지 말라는 규칙이 반드시 들어간다',
    (kind) => {
      // 이 서비스에서 가장 위험한 실패입니다. 모델이 빈 수치를 채우면
      // 지원자가 그대로 제출해 거짓이 됩니다.
      expect(buildReviewSystemPrompt(kind)).toContain(
        '쓰지 않은 사실을 만들어내지 마세요',
      );
    },
  );

  it.each(ALL_KINDS)('%s — 출력 섹션 순서를 고정한다', (kind) => {
    const prompt = buildReviewSystemPrompt(kind);
    const sections = [
      '### 한 줄 평',
      '### 잘된 점',
      '### 고쳐야 할 점',
      '### 문장 고쳐 쓰기',
      '### 추가로 채워야 할 것',
    ];

    const positions = sections.map((section) => prompt.indexOf(section));
    expect(positions.every((index) => index >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('포트폴리오는 본인 기여 구분을 가장 먼저 본다', () => {
    const prompt = buildReviewSystemPrompt(DocumentKind.PORTFOLIO);
    expect(prompt).toContain('본인이 무엇을 했는지 구분되는가');
  });
});

describe('buildReviewUserPrompt', () => {
  it.each([
    [DocumentKind.RESUME, '이력서'],
    [DocumentKind.COVER_LETTER, '자기소개서'],
    [DocumentKind.PORTFOLIO, '포트폴리오'],
  ])('%s 는 "%s" 로 지칭한다', (kind, label) => {
    const prompt = buildReviewUserPrompt({
      kind,
      title: '제목',
      content: '본문',
    });
    expect(prompt).toContain(`다음 ${label}를 첨삭해 주세요`);
  });

  it('제목과 본문을 모두 싣는다', () => {
    const prompt = buildReviewUserPrompt({
      kind: DocumentKind.RESUME,
      title: '백엔드 이력서',
      content: '본문 내용입니다',
    });

    expect(prompt).toContain('백엔드 이력서');
    expect(prompt).toContain('본문 내용입니다');
  });
});
