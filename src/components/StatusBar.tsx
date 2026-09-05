import type { Viewport } from '../core/viewport';
import type { Point } from '../types/geometry';
import { formatLengthMm, type DisplayUnit } from '../core/units';

interface StatusBarProps {
  viewport: Viewport;
  cursorWorld: Point | null;
  unit: DisplayUnit;
}

/** 하단 상태바. 커서 아래 좌표(선택한 표시 단위)와 축척을 보여줘 좌표 변환이 정확한지 바로 확인할 수 있게 한다. */
export function StatusBar({ viewport, cursorWorld, unit }: StatusBarProps) {
  const mmPerPixel = 1 / viewport.scale;

  return (
    <footer className="status-bar">
      <span>
        커서 위치: {cursorWorld ? `${formatLengthMm(cursorWorld.x, unit)}, ${formatLengthMm(cursorWorld.y, unit)}` : '-'}
      </span>
      <span>축척 1px = {mmPerPixel.toFixed(2)}mm</span>
    </footer>
  );
}
