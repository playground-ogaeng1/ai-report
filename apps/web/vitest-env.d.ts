/// <reference types="vitest/globals" />

// vitest 를 `globals: true` 로 쓰므로 describe/it/expect/vi 의 타입이 필요합니다.
//
// tsconfig 의 `compilerOptions.types` 배열에 넣지 않는 이유: 그 배열을 쓰면
// 자동 포함이 **그 목록으로 한정**되어 @types/react 같은 전역 타입이 빠집니다.
// 참조 파일 하나로 필요한 것만 더합니다.
