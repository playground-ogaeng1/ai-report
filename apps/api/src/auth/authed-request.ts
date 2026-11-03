/**
 * SupabaseAuthGuard 를 통과한 요청에 실리는 사용자 정보.
 *
 * express 타입에 의존하지 않도록 필요한 부분만 구조적으로 선언합니다.
 */
export type AuthUser = {
  /** Supabase auth.users.id (UUID). public.users.id 와 같은 값 */
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

export interface AuthedRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthUser;
}
