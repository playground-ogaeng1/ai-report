import { ApiError, describeError } from "@/lib/api";
import { Alert } from "@/components/ui/alert";

/**
 * 운영 화면용 에러 표시. **순수 UI** — error 만 받습니다.
 *
 * 관리자가 아니면 api 가 **404** 를 줍니다(엔드포인트 존재를 숨기려고).
 * 그래서 404 는 "없음" 이 아니라 "권한 없음" 으로 안내합니다.
 */
export function AdminError({ error }: { error: unknown }) {
  const forbidden = error instanceof ApiError && error.status === 404;

  if (forbidden) {
    return (
      <Alert tone="warning" title="접근 권한이 없습니다.">
        <code>apps/api/.env</code> 의 <code>ADMIN_EMAILS</code> 에 지금 로그인한
        계정 이메일이 들어 있는지 확인하세요. 값을 바꾼 뒤에는 api 를 재시작해야
        합니다.
      </Alert>
    );
  }

  return (
    <Alert tone="error" title="불러오지 못했습니다.">
      {describeError(error)}
    </Alert>
  );
}
