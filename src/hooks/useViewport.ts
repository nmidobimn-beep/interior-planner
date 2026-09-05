import { useCallback, useState } from 'react';
import type { Bounds, ScreenPoint, Size } from '../types/geometry';
import { BUTTON_ZOOM_FACTOR, INITIAL_SCALE, WHEEL_ZOOM_FACTOR } from '../config/constants';
import { fitBounds, panBy as panByAmount, zoomAt, type Viewport } from '../core/viewport';

const INITIAL_VIEWPORT: Viewport = { scale: INITIAL_SCALE, pan: { x: 0, y: 0 } };

/**
 * 뷰포트(카메라) 상태와 확대/축소/이동 조작을 제공하는 훅.
 *
 * 이 훅은 카메라만 다루고, "언제 화면을 이동시킬지"는 다루지 않는다 — 그 판단(빈 캔버스
 * 드래그는 이동, 벽 클릭은 선택/드래그 등)은 usePlanInteraction이 담당하고 여기 panBy를 호출한다.
 */
export function useViewport() {
  const [viewport, setViewport] = useState<Viewport>(INITIAL_VIEWPORT);

  const zoomAtPoint = useCallback((point: ScreenPoint, factor: number) => {
    setViewport((vp) => zoomAt(vp, point, factor));
  }, []);

  const zoomAtCenter = useCallback(
    (canvasSize: Size, factor: number) => {
      zoomAtPoint({ x: canvasSize.width / 2, y: canvasSize.height / 2 }, factor);
    },
    [zoomAtPoint],
  );

  // 네이티브 DOM 이벤트로 직접 연결해서 쓴다(React의 onWheel prop). 최신 React는 성능을 위해
  // wheel 리스너를 passive로 등록해 그 안에서 preventDefault()가 씹히므로, 캔버스에 직접
  // addEventListener({ passive: false })로 붙여야 한다 — 그래서 이벤트 객체 대신 필요한 값만 받는다.
  const onWheel = useCallback(
    (clientX: number, clientY: number, deltaY: number, rect: DOMRect) => {
      const cursor = { x: clientX - rect.left, y: clientY - rect.top };
      const factor = deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;
      zoomAtPoint(cursor, factor);
    },
    [zoomAtPoint],
  );

  const panBy = useCallback((dx: number, dy: number) => {
    setViewport((vp) => panByAmount(vp, dx, dy));
  }, []);

  const zoomIn = useCallback((canvasSize: Size) => zoomAtCenter(canvasSize, BUTTON_ZOOM_FACTOR), [zoomAtCenter]);
  const zoomOut = useCallback((canvasSize: Size) => zoomAtCenter(canvasSize, 1 / BUTTON_ZOOM_FACTOR), [zoomAtCenter]);

  const fitToView = useCallback((bounds: Bounds, canvasSize: Size) => {
    setViewport(fitBounds(bounds, canvasSize));
  }, []);

  return { viewport, onWheel, panBy, zoomIn, zoomOut, fitToView };
}

export type UseViewportResult = ReturnType<typeof useViewport>;
