import type { TextLabel } from '../types/label';
import { COLORS, LABEL_FONT_SIZE_PX } from '../config/constants';
import { worldToScreen, type Viewport } from './viewport';

export function drawLabels(ctx: CanvasRenderingContext2D, viewport: Viewport, labels: TextLabel[], selectedIds: ReadonlySet<string>) {
  ctx.font = `600 ${LABEL_FONT_SIZE_PX}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const label of labels) {
    const isSelected = selectedIds.has(label.id);
    const screen = worldToScreen(viewport, label);

    if (isSelected) {
      const metrics = ctx.measureText(label.text);
      const paddingX = 6;
      const paddingY = 4;
      const w = metrics.width + paddingX * 2;
      const h = LABEL_FONT_SIZE_PX + paddingY * 2;
      ctx.strokeStyle = COLORS.labelSelectedBox;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(screen.x - w / 2, screen.y - h / 2, w, h);
      ctx.setLineDash([]);
    }

    ctx.fillStyle = isSelected ? COLORS.labelSelectedText : COLORS.labelText;
    ctx.fillText(label.text, screen.x, screen.y);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
