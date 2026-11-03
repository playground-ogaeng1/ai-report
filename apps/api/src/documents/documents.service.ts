import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DocumentSource, type Document } from '@ppp/db';
import type { AuthUser } from '../auth/authed-request.js';
import { ProfileService } from '../auth/profile.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import type { CreateDocumentDto, UploadDocumentDto } from './dto/create-document.dto.js';
import { extractPdfText } from './pdf-text.js';

/**
 * 목록 응답. 본문(content)을 빼는 이유는 자소서 전문이 수만 자일 수 있어서입니다.
 *
 * 타입을 명시하는 이유: Prisma 의 select 추론 타입은 내부 네임스페이스를
 * 참조해서 `declaration: true` 빌드에서 "이름을 붙일 수 없다"고 거부됩니다.
 */
export type DocumentSummary = Pick<
  Document,
  | 'id'
  | 'kind'
  | 'source'
  | 'title'
  | 'fileName'
  | 'fileSize'
  | 'createdAt'
  | 'updatedAt'
>;

const SUMMARY_FIELDS = {
  id: true,
  kind: true,
  source: true,
  title: true,
  fileName: true,
  fileSize: true,
  createdAt: true,
  updatedAt: true,
};

export const MAX_PDF_BYTES = 10 * 1024 * 1024;

/**
 * multer 가 넘겨주는 파일 객체 중 우리가 실제로 쓰는 필드만 선언합니다.
 *
 * `@types/multer` 의 File 타입은 전역 `Express.Multer` 네임스페이스에만 있어서
 * tsconfig 의 `types` 배열에 multer 를 추가해야 보입니다. 전역 타입 범위를
 * 넓히는 대신 필요한 모양만 적었습니다 (auth/authed-request.ts 와 같은 방식).
 */
export type UploadedPdf = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly profiles: ProfileService,
  ) {}

  list(userId: string): Promise<DocumentSummary[]> {
    return this.prisma.client.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: SUMMARY_FIELDS,
    });
  }

  /**
   * 내 문서 1건. 남의 문서는 "없음"으로 응답합니다 —
   * 403 을 주면 해당 ID 가 존재한다는 사실이 새어 나갑니다.
   */
  async findOne(userId: string, id: string): Promise<Document> {
    const document = await this.prisma.client.document.findFirst({
      where: { id, userId },
    });

    if (!document) {
      throw new NotFoundException('문서를 찾을 수 없습니다.');
    }
    return document;
  }

  async createFromText(
    user: AuthUser,
    dto: CreateDocumentDto,
  ): Promise<Document> {
    // documents.userId 는 users 를 참조하므로 프로필이 먼저 있어야 합니다.
    await this.profiles.ensureProfile(user);

    return this.prisma.client.document.create({
      data: {
        userId: user.id,
        kind: dto.kind,
        source: DocumentSource.TEXT,
        title: dto.title,
        content: dto.content,
      },
    });
  }

  async createFromPdf(
    user: AuthUser,
    dto: UploadDocumentDto,
    file: UploadedPdf,
  ): Promise<Document> {
    if (file.size > MAX_PDF_BYTES) {
      throw new BadRequestException(
        `파일이 너무 큽니다. ${MAX_PDF_BYTES / 1024 / 1024}MB 이하만 올릴 수 있습니다.`,
      );
    }

    const bytes = new Uint8Array(file.buffer);
    // 텍스트부터 뽑습니다. 여기서 실패하면 저장소에 쓰레기를 남기지 않습니다.
    const content = await extractPdfText(bytes);

    await this.profiles.ensureProfile(user);

    const path = `${user.id}/${randomUUID()}.pdf`;
    await this.storage.upload(path, file.buffer, 'application/pdf');

    try {
      return await this.prisma.client.document.create({
        data: {
          userId: user.id,
          kind: dto.kind,
          source: DocumentSource.FILE,
          title: dto.title,
          content,
          fileName: file.originalname,
          filePath: path,
          fileSize: file.size,
          mimeType: 'application/pdf',
        },
      });
    } catch (cause) {
      // DB 쓰기가 실패하면 방금 올린 파일은 고아가 되므로 되돌립니다.
      await this.storage.remove(path);
      throw cause;
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    const document = await this.findOne(userId, id);

    if (document.filePath) {
      await this.storage.remove(document.filePath);
    }
    await this.prisma.client.document.delete({ where: { id: document.id } });
  }

  /** 원본 파일 다운로드용 임시 URL. */
  async createFileUrl(userId: string, id: string): Promise<{ url: string }> {
    const document = await this.findOne(userId, id);

    if (!document.filePath) {
      throw new NotFoundException('이 문서에는 원본 파일이 없습니다.');
    }
    return { url: await this.storage.createSignedUrl(document.filePath) };
  }
}
