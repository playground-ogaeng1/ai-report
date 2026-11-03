import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DocumentKind } from '@ppp/db';
import {
  DocumentsService,
  MAX_PDF_BYTES,
  type UploadedPdf,
} from './documents.service.js';

function makeService(found: unknown = null) {
  const prisma = {
    client: {
      document: {
        findFirst: vi.fn().mockResolvedValue(found),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 'doc_new' }),
        delete: vi.fn().mockResolvedValue({}),
      },
    },
  };
  const storage = {
    upload: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    createSignedUrl: vi.fn().mockResolvedValue('https://signed.example/x'),
  };
  const profiles = { ensureProfile: vi.fn() };

  const service = new DocumentsService(
    prisma as never,
    storage as never,
    profiles as never,
  );

  return { service, prisma, storage, profiles };
}

const USER = {
  id: '00000000-0000-4000-8000-000000000000',
  email: null,
  name: null,
  image: null,
};

describe('DocumentsService.findOne', () => {
  it('남의 문서는 404 — 403 을 주면 그 ID 가 있다는 사실이 새어 나간다', async () => {
    const { service } = makeService(null);

    await expect(service.findOne(USER.id, 'doc_1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('조회는 항상 userId 조건을 함께 건다', async () => {
    const { service, prisma } = makeService({ id: 'doc_1' });

    await service.findOne(USER.id, 'doc_1');

    expect(prisma.client.document.findFirst).toHaveBeenCalledWith({
      where: { id: 'doc_1', userId: USER.id },
    });
  });
});

describe('DocumentsService.list', () => {
  it('목록에는 본문(content)을 싣지 않는다 — 자소서 전문이 수만 자일 수 있다', async () => {
    const { service, prisma } = makeService();

    await service.list(USER.id);

    const call = prisma.client.document.findMany.mock.calls[0]?.[0] as {
      select: Record<string, boolean>;
      where: Record<string, unknown>;
    };
    expect(call.where).toEqual({ userId: USER.id });
    expect(call.select).not.toHaveProperty('content');
    expect(call.select).toHaveProperty('title', true);
  });
});

describe('DocumentsService.createFromText', () => {
  it('문서를 만들기 전에 프로필을 보장한다 — users 외래키 때문', async () => {
    const { service, profiles, prisma } = makeService();

    await service.createFromText(USER, {
      kind: DocumentKind.RESUME,
      title: '제목',
      content: '열 자 이상의 본문입니다.',
    });

    expect(profiles.ensureProfile).toHaveBeenCalledWith(USER);
    expect(prisma.client.document.create).toHaveBeenCalled();
  });
});

describe('DocumentsService.createFromPdf', () => {
  function makeFile(size: number, bytes = '%PDF-1.4 ...'): UploadedPdf {
    return {
      originalname: 'resume.pdf',
      mimetype: 'application/pdf',
      size,
      buffer: Buffer.from(bytes, 'latin1'),
    };
  }

  it('용량 초과는 PDF 를 파싱하기 전에 거부한다', async () => {
    const { service, storage } = makeService();

    await expect(
      service.createFromPdf(
        USER,
        { kind: DocumentKind.RESUME, title: '제목' },
        makeFile(MAX_PDF_BYTES + 1),
      ),
    ).rejects.toThrow(BadRequestException);

    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('텍스트 추출이 실패하면 저장소에 아무것도 올리지 않는다', async () => {
    // 추출을 먼저 하는 설계의 핵심 — 실패 시 고아 객체가 남지 않습니다.
    const { service, storage } = makeService();

    await expect(
      service.createFromPdf(
        USER,
        { kind: DocumentKind.RESUME, title: '제목' },
        makeFile(100, 'PK 이건 zip 입니다'),
      ),
    ).rejects.toThrow(BadRequestException);

    expect(storage.upload).not.toHaveBeenCalled();
  });
});

describe('DocumentsService.createFileUrl', () => {
  it('원본 파일이 없는 문서(텍스트 등록)는 404', async () => {
    const { service } = makeService({ id: 'doc_1', filePath: null });

    await expect(service.createFileUrl(USER.id, 'doc_1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('파일이 있으면 만료되는 URL 을 돌려준다', async () => {
    const { service, storage } = makeService({
      id: 'doc_1',
      filePath: `${USER.id}/x.pdf`,
    });

    const result = await service.createFileUrl(USER.id, 'doc_1');

    expect(storage.createSignedUrl).toHaveBeenCalledWith(`${USER.id}/x.pdf`);
    expect(result.url).toBe('https://signed.example/x');
  });
});

describe('DocumentsService.remove', () => {
  it('파일이 있으면 저장소 객체도 함께 지운다', async () => {
    const { service, storage, prisma } = makeService({
      id: 'doc_1',
      filePath: `${USER.id}/x.pdf`,
    });

    await service.remove(USER.id, 'doc_1');

    expect(storage.remove).toHaveBeenCalledWith(`${USER.id}/x.pdf`);
    expect(prisma.client.document.delete).toHaveBeenCalledWith({
      where: { id: 'doc_1' },
    });
  });
});
