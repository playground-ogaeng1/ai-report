import { DocumentKind, InterviewDifficulty } from '@ppp/db';
import {
  buildInterviewSystemPrompt,
  buildKickoffMessage,
  buildSummarySystemPrompt,
  KICKOFF_MESSAGE,
  OPENING_ANGLES,
  OPENING_ANGLES_NO_DOCUMENT,
  pickOpeningAngle,
} from './interview-prompt.js';

const DOCUMENT = {
  kind: DocumentKind.RESUME,
  title: '백엔드 이력서',
  content: '쿠버네티스로 배포 자동화를 했습니다.',
};

const ALL = [
  InterviewDifficulty.EASY,
  InterviewDifficulty.NORMAL,
  InterviewDifficulty.HARD,
];

describe('buildInterviewSystemPrompt — 난이도', () => {
  it('난이도마다 꼬리질문 개수가 다르다', () => {
    // 사용자가 정의한 난이도 차이: 꼬리질문 개수와 깊이
    expect(buildInterviewSystemPrompt(InterviewDifficulty.EASY, DOCUMENT)).toContain(
      '꼬리질문은 **0~1개**',
    );
    expect(
      buildInterviewSystemPrompt(InterviewDifficulty.NORMAL, DOCUMENT),
    ).toContain('꼬리질문은 **1~2개**');
    expect(buildInterviewSystemPrompt(InterviewDifficulty.HARD, DOCUMENT)).toContain(
      '꼬리질문은 **2~3개**',
    );
  });

  it.each([
    [InterviewDifficulty.EASY, '쉬움'],
    [InterviewDifficulty.NORMAL, '보통'],
    [InterviewDifficulty.HARD, '어려움'],
  ])('%s 는 난이도 제목에 "%s" 를 쓴다', (difficulty, label) => {
    expect(buildInterviewSystemPrompt(difficulty, DOCUMENT)).toContain(
      `## 난이도: ${label}`,
    );
  });

  it('세 난이도의 프롬프트가 서로 다르다', () => {
    const prompts = ALL.map((d) => buildInterviewSystemPrompt(d, DOCUMENT));
    expect(new Set(prompts).size).toBe(ALL.length);
  });

  it('어려움만 모순·과장을 짚는다', () => {
    expect(buildInterviewSystemPrompt(InterviewDifficulty.HARD, DOCUMENT)).toContain(
      '모순·과장',
    );
    expect(
      buildInterviewSystemPrompt(InterviewDifficulty.EASY, DOCUMENT),
    ).not.toContain('모순·과장');
  });

  it('어려움도 몰아세우지는 않게 선을 긋는다', () => {
    expect(buildInterviewSystemPrompt(InterviewDifficulty.HARD, DOCUMENT)).toContain(
      '비꼬거나 몰아세우지는 않습니다',
    );
  });
});

describe('buildInterviewSystemPrompt — 공통 규칙', () => {
  it.each(ALL)('%s — 면접 중 평가·칭찬을 금지한다', (difficulty) => {
    // 평가를 섞으면 연습 효과가 떨어지고 총평의 가치도 사라집니다.
    const prompt = buildInterviewSystemPrompt(difficulty, DOCUMENT);
    expect(prompt).toContain('답변을 평가하거나 칭찬하지 마세요');
    expect(prompt).toContain('첨삭하지 마세요');
  });

  it.each(ALL)('%s — 질문은 한 번에 하나만', (difficulty) => {
    expect(buildInterviewSystemPrompt(difficulty, DOCUMENT)).toContain(
      '질문은 한 번에 하나만',
    );
  });

  // 실제로 터진 버그: 면접관이 질문 → 지원자 답변 → 다음 질문까지 혼자
  // 써 내려갔습니다. "질문은 한 번에 하나만" 은 "질문 여러 개를 묶지 마라"
  // 로만 읽혀서 이걸 막지 못합니다 — 그래서 규칙을 따로 둡니다.
  it.each(ALL)('%s — 지원자 답변을 대신 쓰지 못하게 막는다', (difficulty) => {
    const prompt = buildInterviewSystemPrompt(difficulty, DOCUMENT);

    expect(prompt).toContain('면접관의 말만 씁니다');
    expect(prompt).toContain('지원자의 답변을 대신 쓰거나 상상해서 채우지 마세요');
    expect(prompt).toContain('면접관의 발언 하나만');
    expect(prompt).toContain('거기서 멈추고');
  });

  it.each(ALL)('%s — 화자 표시를 금지한다 (대화록을 쓰게 되는 입구)', (difficulty) => {
    expect(buildInterviewSystemPrompt(difficulty, DOCUMENT)).toContain(
      '화자 표시를 붙이지 마세요',
    );
  });

  it('문서가 있으면 본문을 컨텍스트로 넣는다', () => {
    const prompt = buildInterviewSystemPrompt(
      InterviewDifficulty.NORMAL,
      DOCUMENT,
    );

    expect(prompt).toContain('이력서');
    expect(prompt).toContain(DOCUMENT.content);
    expect(prompt).toContain('문서에 없는 내용을 지원자가 말한 것처럼 전제하지 마세요');
  });

  it('문서가 없으면 먼저 준비 직무를 물어보게 한다', () => {
    const prompt = buildInterviewSystemPrompt(InterviewDifficulty.NORMAL, null);

    expect(prompt).toContain('## 제출 문서 없음');
    expect(prompt).toContain('어떤 직무를 준비하는지 물어본 뒤');
    expect(prompt).not.toContain(DOCUMENT.content);
  });
});

describe('KICKOFF_MESSAGE', () => {
  it('고정 문자열이다 — 매 요청 맨 앞에 들어가므로 변하면 프롬프트 캐시가 깨진다', () => {
    expect(KICKOFF_MESSAGE).toBe(
      '면접을 시작해 주세요. 첫 질문 하나만 하고, 제 답변을 기다려 주세요.',
    );
  });

  // "면접을 시작해 주세요." 만 보내면 "모의 면접을 하나 만들어 달라" 는
  // 의뢰로도 읽혀서, 모델이 지원자 답변까지 지어내 대화록을 써 버립니다.
  it('질문 하나만 하고 멈추라고 못 박는다', () => {
    expect(KICKOFF_MESSAGE).toContain('첫 질문 하나만');
    expect(KICKOFF_MESSAGE).toContain('기다려');
  });

  // 지원자가 말하는 턴입니다. 지시문처럼만 쓰면 모델이 "면접 대본을
  // 작성하는 작업" 으로 받아들이기 쉽습니다.
  it('지원자의 목소리로 쓰여 있다 — 턴 주고받기임을 분명히 한다', () => {
    expect(KICKOFF_MESSAGE).toContain('제 답변');
  });
});

describe('첫 질문 다양화', () => {
  // Opus 5 는 temperature 를 받지 않습니다. 같은 문서로 다시 면접을 보면
  // 입력이 바이트 단위로 같아서 첫 질문이 똑같아지므로, 시작 각도를
  // 프롬프트 쪽에서 흔듭니다.
  it('각도 후보가 여러 개이고 서로 다르다', () => {
    expect(OPENING_ANGLES.length).toBeGreaterThanOrEqual(5);
    expect(new Set(OPENING_ANGLES).size).toBe(OPENING_ANGLES.length);
    expect(new Set(OPENING_ANGLES_NO_DOCUMENT).size).toBe(
      OPENING_ANGLES_NO_DOCUMENT.length,
    );
  });

  it('난수 값에 따라 다른 각도를 고른다', () => {
    const first = pickOpeningAngle(true, () => 0);
    const last = pickOpeningAngle(true, () => 0.999);

    expect(first).toBe(OPENING_ANGLES[0]);
    expect(last).toBe(OPENING_ANGLES.at(-1));
    expect(first).not.toBe(last);
  });

  it('난수가 경계값이어도 범위를 벗어나지 않는다', () => {
    for (const value of [0, 0.5, 0.999999, 1]) {
      expect(OPENING_ANGLES).toContain(pickOpeningAngle(true, () => value));
    }
  });

  it('문서가 없으면 문서를 전제하지 않는 각도만 고른다', () => {
    for (const value of [0, 0.3, 0.6, 0.99]) {
      const angle = pickOpeningAngle(false, () => value);
      expect(OPENING_ANGLES_NO_DOCUMENT).toContain(angle);
      // 문서용 각도가 섞여 들어오면 "제출 문서" 를 전제한 질문이 나옵니다.
      expect(OPENING_ANGLES).not.toContain(angle);
    }
  });

  it('첫 턴 메시지는 고정 문구와 각도를 함께 싣는다', () => {
    const angle = OPENING_ANGLES[0]!;
    const message = buildKickoffMessage(angle);

    expect(message).toContain(KICKOFF_MESSAGE);
    expect(message).toContain(angle);
  });
});

describe('buildSummarySystemPrompt', () => {
  it.each([
    [InterviewDifficulty.EASY, '쉬움'],
    [InterviewDifficulty.NORMAL, '보통'],
    [InterviewDifficulty.HARD, '어려움'],
  ])('진행된 난이도(%s → %s)를 알려준다', (difficulty, label) => {
    expect(buildSummarySystemPrompt(difficulty)).toContain(`"${label}"`);
  });

  it('실제로 말한 내용만 근거로 쓰게 한다', () => {
    expect(buildSummarySystemPrompt(InterviewDifficulty.NORMAL)).toContain(
      '실제로 말한 내용만 근거로 쓰세요',
    );
  });

  it('출력 섹션 순서를 고정한다', () => {
    const prompt = buildSummarySystemPrompt(InterviewDifficulty.NORMAL);
    const sections = [
      '### 한 줄 평',
      '### 잘 답한 부분',
      '### 아쉬웠던 부분',
      '### 다시 답해 본다면',
      '### 다음 면접 전에 준비할 것',
    ];

    const positions = sections.map((section) => prompt.indexOf(section));
    expect(positions.every((index) => index >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});
