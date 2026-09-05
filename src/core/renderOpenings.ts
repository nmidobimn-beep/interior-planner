import type { Point } from '../types/geometry';
import type { Wall } from '../types/wall';
import type { Door, WindowOpening } from '../types/opening';
import type { Outlet } from '../types/outlet';
import { COLORS, OUTLET_ICON_RADIUS_PX } from '../config/constants';
import { worldToScreen, type Viewport } from './viewport';
import { doorSwingGeometry, openingCorners, openingEndpoints } from './openingGeometry';

function toScreenPath(ctx: CanvasRenderingContext2D, viewport: Viewport, points: Point[]) {
  ctx.beginPath();
  points.forEach((p, i) => {
    const s = worldToScreen(viewport, p);
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  });
  ctx.closePath();
}

export function drawDoors(ctx: CanvasRenderingContext2D, viewport: Viewport, doors: Door[], walls: Wall[], selectedId: string | null) {
  for (const door of doors) {
    const wall = walls.find((w) => w.id === door.wallId);
    if (!wall) continue;
    const isSelected = door.id === selectedId;

    const { start: segStart, end: segEnd } = openingEndpoints(wall, door.offsetMm, door.widthMm);
    // 1) 벽 구간을 배경색으로 지워 개구부(gap)를 만든다
    toScreenPath(ctx, viewport, openingCorners(wall, segStart, segEnd));
    ctx.fillStyle = COLORS.background;
    ctx.fill();

    // 2) 문짝(활짝 열린 상태) + 스윙 호
    const swing = doorSwingGeometry(wall, door);
    const hinge = worldToScreen(viewport, swing.hinge);
    const openEnd = worldToScreen(viewport, swing.openEnd);
    const radiusPx = swing.radius * viewport.scale;

    ctx.strokeStyle = isSelected ? COLORS.doorSelected : COLORS.doorLeaf;
    ctx.lineWidth = isSelected ? 2.5 : 2;

    ctx.beginPath();
    ctx.moveTo(hinge.x, hinge.y);
    ctx.lineTo(openEnd.x, openEnd.y);
    ctx.stroke();

    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(hinge.x, hinge.y, radiusPx, swing.startAngle, swing.endAngle, swing.anticlockwise);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export function drawWindows(ctx: CanvasRenderingContext2D, viewport: Viewport, windows: WindowOpening[], walls: Wall[], selectedId: string | null) {
  for (const win of windows) {
    const wall = walls.find((w) => w.id === win.wallId);
    if (!wall) continue;
    const isSelected = win.id === selectedId;

    const { start: segStart, end: segEnd } = openingEndpoints(wall, win.offsetMm, win.widthMm);
    const corners = openingCorners(wall, segStart, segEnd);

    toScreenPath(ctx, viewport, corners);
    ctx.fillStyle = COLORS.windowFill;
    ctx.strokeStyle = isSelected ? COLORS.windowSelected : COLORS.windowGlass;
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.fill();
    ctx.stroke();

    const midStart = worldToScreen(viewport, segStart);
    const midEnd = worldToScreen(viewport, segEnd);
    ctx.beginPath();
    ctx.moveTo(midStart.x, midStart.y);
    ctx.lineTo(midEnd.x, midEnd.y);
    ctx.strokeStyle = COLORS.windowGlass;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export function drawOutlets(ctx: CanvasRenderingContext2D, viewport: Viewport, outlets: Outlet[], selectedIds: ReadonlySet<string>) {
  for (const outlet of outlets) {
    const isSelected = selectedIds.has(outlet.id);
    const center = worldToScreen(viewport, outlet);

    ctx.beginPath();
    ctx.arc(center.x, center.y, OUTLET_ICON_RADIUS_PX, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.outletFill;
    ctx.strokeStyle = isSelected ? COLORS.outletSelected : COLORS.outletStroke;
    ctx.lineWidth = isSelected ? 2 : 1.5;
    ctx.fill();
    ctx.stroke();

    // 콘센트 슬롯 기호 (짧은 두 선)
    ctx.beginPath();
    ctx.moveTo(center.x - 3, center.y - 3);
    ctx.lineTo(center.x - 3, center.y + 3);
    ctx.moveTo(center.x + 3, center.y - 3);
    ctx.lineTo(center.x + 3, center.y + 3);
    ctx.stroke();

    if (outlet.count > 1) {
      ctx.fillStyle = COLORS.outletText;
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText(`×${outlet.count}`, center.x + OUTLET_ICON_RADIUS_PX + 3, center.y + 4);
    }
  }
}
