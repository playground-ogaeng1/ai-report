/**
 * 홀로그램 배경. **로그인 화면 전용**입니다.
 *
 * UI_GUIDE.md "장식 요소를 추가하지 않는다" 의 명시적 예외입니다 —
 * 로그인은 하루에 한 번 보는 첫인상 화면이라 예외를 뒀습니다.
 * **작업 화면(문서·면접·운영)에는 쓰지 마세요.**
 *
 * 실제 그림은 globals.css 의 `.hologram-*` 에 있습니다. 색이 길어서
 * 유틸리티 클래스로 적으면 읽을 수 없고, 키프레임도 필요합니다.
 *
 * `fixed` 라서 스크롤해도 따라옵니다. 내용보다 뒤에 깔리려면 **이 컴포넌트를
 * 본문보다 먼저** 두고, 본문에 `relative z-10` 을 주세요.
 */
export function HologramBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="hologram-sheen" />
      <div className="hologram-foil" />
      <div className="hologram-grid" />
    </div>
  );
}
