import { ConsoleLogger } from '@nestjs/common';
import { logBuffer, type LogLevel } from './log-buffer.js';

/** NestJS 로거는 마지막 인자에 컨텍스트(클래스명)를 넣어 호출합니다. */
function splitContext(params: unknown[]): {
  context: string | null;
  rest: unknown[];
} {
  if (params.length > 0 && typeof params.at(-1) === 'string') {
    return { context: params.at(-1) as string, rest: params.slice(0, -1) };
  }
  return { context: null, rest: params };
}

function stringify(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return `${value.name}: ${value.message}`;

  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * 콘솔에 그대로 쓰면서 **링 버퍼에도 함께 담는** 로거.
 *
 * 터미널 출력을 바꾸지 않는 게 중요합니다 — 기존 개발 흐름(`pnpm dev` 로그
 * 보기)이 그대로 유지돼야 합니다.
 */
export class BufferedConsoleLogger extends ConsoleLogger {
  private record(level: LogLevel, message: unknown, params: unknown[]): void {
    const { context, rest } = splitContext(params);
    const parts = [stringify(message), ...rest.map(stringify)].filter(Boolean);

    logBuffer.pushLog(level, parts.join(' '), context);
  }

  override log(message: unknown, ...params: unknown[]): void {
    this.record('log', message, params);
    super.log(message as string, ...(params as string[]));
  }

  override warn(message: unknown, ...params: unknown[]): void {
    this.record('warn', message, params);
    super.warn(message as string, ...(params as string[]));
  }

  override error(message: unknown, ...params: unknown[]): void {
    this.record('error', message, params);
    super.error(message as string, ...(params as string[]));
  }

  override debug(message: unknown, ...params: unknown[]): void {
    this.record('debug', message, params);
    super.debug(message as string, ...(params as string[]));
  }

  override verbose(message: unknown, ...params: unknown[]): void {
    this.record('verbose', message, params);
    super.verbose(message as string, ...(params as string[]));
  }
}
