import { AdminService } from './admin.service.js';
import type { AuthUser } from './authed-request.js';

function makeService(adminEmails: string | undefined) {
  const config = { get: vi.fn(() => adminEmails) };
  return new AdminService(config as never);
}

function makeUser(email: string | null): AuthUser {
  return { id: 'user_1', email, name: null, image: null };
}

describe('AdminService.onModuleInit', () => {
  it('설정이 비어 있으면 경고를 남긴다 — 조용히 전원 차단되면 눈치채기 어렵다', () => {
    const service = makeService(undefined);
    const warn = vi.spyOn(
      (service as unknown as { logger: { warn: (m: string) => void } }).logger,
      'warn',
    );

    service.onModuleInit();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('ADMIN_EMAILS'));
  });

  it('설정됐으면 개수를 남기고 이메일은 찍지 않는다', () => {
    const service = makeService('me@example.com,second@example.com');
    const log = vi.spyOn(
      (service as unknown as { logger: { log: (m: string) => void } }).logger,
      'log',
    );

    service.onModuleInit();

    const message = log.mock.calls[0]?.[0] as string;
    expect(message).toContain('2명');
    expect(message).not.toContain('me@example.com');
  });
});

describe('AdminService.isAdmin', () => {
  it('설정이 비어 있으면 아무도 관리자가 아니다 — 실수로 전원 공개되면 안 된다', () => {
    for (const raw of [undefined, '', '   ', ',,']) {
      const service = makeService(raw);
      expect(service.isAdmin(makeUser('me@example.com'))).toBe(false);
    }
  });

  it('목록에 있는 이메일만 통과한다', () => {
    const service = makeService('me@example.com');

    expect(service.isAdmin(makeUser('me@example.com'))).toBe(true);
    expect(service.isAdmin(makeUser('other@example.com'))).toBe(false);
  });

  it('대소문자와 공백을 가린다', () => {
    const service = makeService('  Me@Example.COM , second@example.com ');

    expect(service.isAdmin(makeUser('me@example.com'))).toBe(true);
    expect(service.isAdmin(makeUser('ME@EXAMPLE.COM'))).toBe(true);
    expect(service.isAdmin(makeUser('second@example.com'))).toBe(true);
  });

  it('이메일이 없는 사용자는 관리자가 아니다', () => {
    const service = makeService('me@example.com');
    expect(service.isAdmin(makeUser(null))).toBe(false);
  });

  it('부분 일치로 통과하지 않는다', () => {
    const service = makeService('me@example.com');

    expect(service.isAdmin(makeUser('notme@example.com'))).toBe(false);
    expect(service.isAdmin(makeUser('me@example.com.evil.com'))).toBe(false);
    expect(service.isAdmin(makeUser('me@example.co'))).toBe(false);
  });
});
