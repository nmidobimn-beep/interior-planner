import type { UseViewportResult } from '../hooks/useViewport';

interface StatusBarProps {
  viewportApi: UseViewportResult;
}

/** 하단 상태바. 커서 아래 mm 좌표와 축척을 표시해 좌표 변환이 정확한지 바로 확인할 수 있게 한다. */
export function StatusBar({ viewportApi }: StatusBarProps) {
  const { viewport, cursorWorld } = viewportApi;
  const mmPerPixel = 1 / viewport.scale;

  return (
    <footer className="status-bar">
      <span>
        커서 위치:{' '}
        {cursorWorld ? `${Math.round(cursorWorld.x)}mm, ${Math.round(cursorWorld.y)}mm` : '-'}
      </span>
      <span>축척 1px = {mmPerPixel.toFixed(2)}mm</span>
    </footer>
  );
}
