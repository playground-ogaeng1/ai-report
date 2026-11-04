import type { AuthUser } from '../auth/authed-request.js';
import { composeBugReportMail } from './bug-report-mail.js';

const USER: AuthUser = {
  id: 'f7a1c0de-0000-4000-8000-000000000001',
  email: 'reporter@example.com',
  name: '신고자',
  image: null,
};

const AT = new Date('2026-11-04T01:23:45.000Z');

describe('composeBugReportMail', () => {
  it('제목으로 누가 보냈는지 바로 보이게 한다', () => {
    const { subject } = composeBugReportMail(USER, { message: '버튼이 안 눌려요' }, AT);

    expect(subject).toBe('[버그 신고] reporter@example.com');
  });

  it('본문에 신고 내용과 신고자·화면·시각을 담는다', () => {
    const { body } = composeBugReportMail(
      USER,
      { message: '첨삭 버튼을 누르면 아무 일도 안 생깁니다.', path: '/documents/abc' },
      AT,
    );

    expect(body).toContain('첨삭 버튼을 누르면 아무 일도 안 생깁니다.');
    expect(body).toContain('신고자: reporter@example.com (f7a1c0de-0000-4000-8000-000000000001)');
    expect(body).toContain('화면: /documents/abc');
    // UTC 01:23 → KST 10:23
    expect(body).toContain('시각: 2026-11-04 10:23:45 (KST)');
  });

  it('이메일이 없는 계정도 발송할 수 있다', () => {
    const mail = composeBugReportMail(
      { ...USER, email: null },
      { message: '로그인이 자꾸 풀립니다' },
      AT,
    );

    expect(mail.subject).toBe('[버그 신고] (이메일 없음)');
    // 사용자 ID 는 남아 있어야 추적이 됩니다.
    expect(mail.body).toContain(USER.id);
  });

  it('화면 경로가 없으면 비워두지 않고 알 수 없음으로 적는다', () => {
    const { body } = composeBugReportMail(USER, { message: '어디서 났는지 모르겠어요' }, AT);

    expect(body).toContain('화면: (알 수 없음)');
  });

  it('화면 경로에 줄바꿈이 섞여도 꼬리말이 한 줄로 유지된다', () => {
    const { body } = composeBugReportMail(
      USER,
      { message: '경로가 이상합니다', path: '/documents\n시각: 가짜' },
      AT,
    );

    expect(body).toContain('화면: /documents 시각: 가짜');
    // 진짜 시각 줄이 그대로 하나 있어야 합니다.
    expect(body.match(/^시각: /gm)).toHaveLength(1);
  });

  it('신고 내용 앞뒤 공백은 정리한다', () => {
    const { body } = composeBugReportMail(USER, { message: '  공백 많음  \n\n' }, AT);

    expect(body.startsWith('공백 많음\n\n---\n')).toBe(true);
  });
});
