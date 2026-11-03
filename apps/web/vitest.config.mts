import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * web 테스트는 **순수 로직만** 다룹니다 (포맷터, 에러 매핑, NDJSON 파서).
 * 그래서 jsdom·testing-library 없이 node 환경으로 가볍게 둡니다.
 * 컴포넌트 렌더링 테스트가 필요해지면 그때 jsdom 을 추가하세요.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts"],
  },
});
