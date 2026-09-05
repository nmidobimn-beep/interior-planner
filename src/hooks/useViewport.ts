import { useCallback, useRef, useState } from 'react';
import type { Bounds, ScreenPoint, Size } from '../types/geometry';
import { BUTTON_ZOOM_FACTOR, INITIAL_SCALE, WHEEL_ZOOM_FACTOR } from '../config/constants';
import { fitBounds, panBy, screenToWorld, zoomAt, type Viewport } from '../core/viewport';

const INITIAL_VIEWPORT: Viewport = { scale: INITIAL_SCALE, pan: { x: 0, y: 0 } };

/**
 * 뷰포트(카메라) 상태와 조작 핸들러를 제공하는 훅.
 *
 * 화면 이동(pan)은 마우스 왼쪽/가운데 버튼 드래그로 동작한다.
 * 3단계(가구) 이후 왼쪽 버튼은 객체 선택/이동에 쓰이게 되므로,
 * 그때 가서 pan 트리거를 스페이스바+드래그 또는 가운데 버튼 전용으로 좁히면 된다.
 */
export function useViewport() {
  const [viewport, setViewport] = useState<Viewport>(INITIAL_VIEWPORT);
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(null);
  const isPanning = useRef(false);
  const lastPointer = useRef<ScreenPoint>({ x: 0, y: 0 });

  const zoomAtPoint = useCallback((point: ScreenPoint, factor: number) => {
    setViewport((vp) => zoomAt(vp, point, factor));
  }, []);

  const zoomAtCenter = useCallback(
    (canvasSize: Size, factor: number) => {
      zoomAtPoint({ x: canvasSize.width / 2, y: canvasSize.height / 2 }, factor);
    },
    [zoomAtPoint],
  );

  const onWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const cursor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const factor = e.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;
      zoomAtPoint(cursor, factor);
    },
    [zoomAtPoint],
  );

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.button !== 1) return;
    isPanning.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const updateCursorWorld = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setCursorWorld(screenToWorld(viewport, screen));
    },
    [viewport],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isPanning.current) {
        const dx = e.clientX - lastPointer.current.x;
        const dy = e.clientY - lastPointer.current.y;
        lastPointer.current = { x: e.clientX, y: e.clientY };
        setViewport((vp) => panBy(vp, dx, dy));
      }
      updateCursorWorld(e);
    },
    [updateCursorWorld],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    isPanning.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const onPointerLeave = useCallback(() => {
    setCursorWorld(null);
  }, []);

  const zoomIn = useCallback((canvasSize: Size) => zoomAtCenter(canvasSize, BUTTON_ZOOM_FACTOR), [zoomAtCenter]);
  const zoomOut = useCallback((canvasSize: Size) => zoomAtCenter(canvasSize, 1 / BUTTON_ZOOM_FACTOR), [zoomAtCenter]);

  const fitToView = useCallback((bounds: Bounds, canvasSize: Size) => {
    setViewport(fitBounds(bounds, canvasSize));
  }, []);

  return {
    viewport,
    cursorWorld,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    zoomIn,
    zoomOut,
    fitToView,
  };
}

export type UseViewportResult = ReturnType<typeof useViewport>;
