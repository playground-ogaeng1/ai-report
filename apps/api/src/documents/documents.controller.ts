import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Document } from '@ppp/db';
import type { AuthUser } from '../auth/authed-request.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { RateLimit } from '../usage/rate-limit.decorator.js';
import { RateLimitGuard } from '../usage/rate-limit.guard.js';
import {
  type DocumentSummary,
  DocumentsService,
  MAX_PDF_BYTES,
  type UploadedPdf,
} from './documents.service.js';
import {
  CreateDocumentDto,
  UploadDocumentDto,
} from './dto/create-document.dto.js';

@Controller('documents')
@UseGuards(SupabaseAuthGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<DocumentSummary[]> {
    return this.documents.list(user.id);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<Document> {
    return this.documents.findOne(user.id, id);
  }

  @Get(':id/file')
  createFileUrl(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.documents.createFileUrl(user.id, id);
  }

  @Post()
  createFromText(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDocumentDto,
  ): Promise<Document> {
    return this.documents.createFromText(user, dto);
  }

  /**
   * PDF 업로드. multipart/form-data 로 `file` + `kind` + `title` 을 받습니다.
   *
   * 메모리에 올려두고 바로 처리합니다. 이력서/자소서는 작아서(≤10MB) 괜찮고,
   * 디스크를 거치지 않아 컨테이너 재시작에도 안전합니다.
   */
  @Post('upload')
  // Claude 를 쓰지 않으므로 CostGuard 는 붙이지 않습니다.
  // 다만 PDF 파싱이 CPU 를 쓰므로 빈도는 제한합니다.
  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 20, windowSec: 60 })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_PDF_BYTES } }),
  )
  uploadPdf(
    @CurrentUser() user: AuthUser,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file?: UploadedPdf,
  ): Promise<Document> {
    if (!file) {
      throw new BadRequestException('파일(file)이 없습니다.');
    }
    return this.documents.createFromPdf(user, dto, file);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.documents.remove(user.id, id);
  }
}
