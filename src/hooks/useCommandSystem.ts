import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Point } from '../types/geometry';
import type { SelectionItem, AddManyEntry } from '../state/floorPlanReducer';
import type { UseFloorPlanResult } from './useFloorPlan';
import type { UsePlanInteractionResult } from './usePlanInteraction';
import type { Viewport } from '../core/viewport';
import {
  COMMAND_REGISTRY,
  findCommand,
  searchCommands,
  type CommandDefinition,
  type CommandLogKind,
  type CommandRuntimeContext,
} from '../core/commandDefinitions';
import { planWallMerge } from '../core/wallMerge';
import { hitTestWalls, wallDirectionUnit, wallLengthMm } from '../core/wallGeometry';
import { clampOpeningOffset } from '../core/openingGeometry';
import { snapAngleDeg, snapPoint } from '../core/snap';
import { collectSnapCandidates } from '../core/snapPoints';
import { boundsCenter, computeSelectionBounds, rotatePointAround } from '../core/multiSelectGeometry';
import { createId } from '../core/id';
import { MIN_POLYGON_VERTICES, WALL_HIT_TOLERANCE_PX } from '../config/constants';

const MAX_LOG_ENTRIES = 200;

/** DRAW 카테고리 명령이 켜는 도구 — 사용자가 명령 대신 툴바를 직접 눌러 다른 도구로 바꿔도
 * 이 매핑과 어긋나면 명령 상태를 함께 정리한다(툴바와 명령어 두 입력 방식이 서로 어긋나지
 * 않도록 — 요청 19번). */
const TOOL_FOR_DRAW_COMMAND: Record<string, string> = {
  L: 'wall',
  B: 'rectangle',
  C: 'circle',
  EL: 'lshape',
  MU: 'polygon',
  D: 'door',
  WIN: 'window',
  CON: 'outlet',
  SL: 'path',
  T: 'label',
};

export interface CommandLogEntry {
  id: string;
  text: string;
  kind: CommandLogKind;
}

export interface ActiveCommandState {
  command: string;
  name: string;
  category: CommandDefinition['category'];
}

/** M(이동)/CO(복사)/R(회전) 명령이 클릭 두 번을 기다리는 동안의 중간 상태. */
interface ClickStep {
  basePoint: Point;
  startAngleDeg?: number;
}

interface UseCommandSystemArgs {
  interaction: UsePlanInteractionResult;
  floorPlan: UseFloorPlanResult;
  viewport: Viewport;
}

function isTextEditingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

/**
 * CAD 스타일 명령어 입력 체계(Command System). 툴바/마우스로 하던 조작을 키보드 명령어로도
 * 실행할 수 있게 한다 — 새 기능을 만드는 게 아니라, 이미 있는 도구/함수를 "명령어 입력 →
 * Space → 실행"이라는 또 다른 입구로 호출하는 구조다(usePlanInteraction.setActiveTool 등을
 * 그대로 재사용). 명령 목록은 core/commandDefinitions.ts의 Command Registry 하나로 관리되며,
 * 실행/자동완성/도움말이 모두 그 배열에서 자동으로 나온다.
 */
export function useCommandSystem({ interaction, floorPlan, viewport }: UseCommandSystemArgs) {
  const [buffer, setBuffer] = useState('');
  const [log, setLog] = useState<CommandLogEntry[]>([]);
  const [activeCommand, setActiveCommand] = useState<ActiveCommandState | null>(null);
  const [clickStep, setClickStep] = useState<ClickStep | null>(null);
  const [mergeWallCandidates, setMergeWallCandidates] = useState<Set<string>>(new Set());
  const [lastRepeatableCommand, setLastRepeatableCommand] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpSearch, setHelpSearch] = useState('');
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);

  const appendLog = useCallback((text: string, kind: CommandLogKind = 'info') => {
    setLog((prev) => {
      const next = [...prev, { id: createId(), text, kind }];
      return next.length > MAX_LOG_ENTRIES ? next.slice(next.length - MAX_LOG_ENTRIES) : next;
    });
  }, []);

  const focusLayerPanel = useCallback(() => {
    const el = document.getElementById('layer-panel');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    el.classList.add('layer-panel-flash');
    window.setTimeout(() => el.classList.remove('layer-panel-flash'), 900);
  }, []);

  // 명령 실행 함수(execute)는 항상 "지금 이 순간의" interaction/floorPlan을 봐야 하므로
  // ref에 최신 값을 담아둔다(키다운 리스너가 재구독되지 않는 사이에도 최신 상태를 읽기 위함).
  // 렌더 도중이 아니라 커밋 이후(effect)에 채워 넣는다 — 실제 사용(이벤트 핸들러) 시점은
  // 항상 그 다음이라 최신성에는 문제가 없다.
  const ctxRef = useRef<CommandRuntimeContext>(null as unknown as CommandRuntimeContext);
  useEffect(() => {
    ctxRef.current = { interaction, floorPlan, viewport, log: appendLog, toggleHelp: () => setHelpOpen((v) => !v), focusLayerPanel };
  });

  const endActiveCommand = useCallback(
    (withLog = true) => {
      setActiveCommand((current) => {
        if (!current) return current;
        interaction.endChain();
        interaction.setKeepToolActive(false);
        if (current.command === 'BL') setMergeWallCandidates(new Set());
        if (current.category === 'DRAW') interaction.setActiveTool('select');
        if (withLog) appendLog('명령 종료');
        return null;
      });
      setClickStep(null);
    },
    [appendLog, interaction],
  );

  // 사용자가 명령어 대신 툴바 버튼을 눌러 도구를 직접 바꾼 경우, 명령 시스템 쪽 상태(활성 명령·
  // "도구 유지" 플래그)가 그대로 남아 어긋나지 않도록 함께 정리한다 — 안 그러면 예를 들어 B
  // 명령으로 반복 배치 모드에 들어간 뒤 툴바에서 다른 도구를 누르면, 다음에 툴바로 가구를 하나
  // 놓아도 "선택" 도구로 자동 전환되지 않는 등 두 입력 방식이 서로 어긋나게 된다.
  useEffect(() => {
    if (!activeCommand) return;
    const matches =
      activeCommand.category === 'DRAW'
        ? TOOL_FOR_DRAW_COMMAND[activeCommand.command] === interaction.activeTool
        : interaction.activeTool === 'select';
    if (matches) return;

    interaction.setKeepToolActive(false);
    setClickStep(null);
    if (activeCommand.command === 'BL') setMergeWallCandidates(new Set());
    setActiveCommand(null);
    // interaction 객체 자체는 매 렌더 새로 생성되므로 deps에서 제외하고, 실제로 이 효과가
    // 반응해야 할 값(도구 변경, 활성 명령)만 추적한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interaction.activeTool, activeCommand]);

  const runCommand = useCallback(
    (cmd: CommandDefinition) => {
      endActiveCommand(false);
      appendLog(`> ${cmd.command}`, 'command');
      const proceed = cmd.execute(ctxRef.current) !== false;
      if (!proceed) return;
      if (cmd.interactive) {
        setActiveCommand({ command: cmd.command, name: cmd.name, category: cmd.category });
        setClickStep(null);
      }
      if (cmd.repeatable) setLastRepeatableCommand(cmd.command);
    },
    [appendLog, endActiveCommand],
  );

  const attemptWallMerge = useCallback(() => {
    const ids = [...mergeWallCandidates];
    if (ids.length < 2) {
      appendLog('병합하려면 벽을 2개 이상 선택하세요.', 'error');
      return;
    }
    const selectedWalls = floorPlan.walls.filter((w) => ids.includes(w.id));
    const result = planWallMerge(selectedWalls, floorPlan.doors, floorPlan.windows);
    if (!result.ok) {
      appendLog(`병합 불가: ${result.reason}`, 'error');
      return; // 명령은 계속 활성 상태로 둔다 — 사용자가 선택을 조정하고 다시 시도할 수 있게.
    }
    const { mergedRunCount, joinedCornerCount, wallPatches } = result.payload;
    const cornerCount = result.payload.resultWallIds.length - 1; // 이 사슬 안의 모서리 개수
    if (mergedRunCount === 0 && wallPatches.length === 0) {
      // 바꿀 데이터가 없다(이미 같은 그룹으로 정확히 맞물려 있음) — Undo 기록 없이 안내만 하고 끝낸다.
      appendLog('이미 모서리가 정확히 맞물려 하나로 합쳐져 있어 추가로 정리할 내용이 없습니다.', 'success');
    } else {
      floorPlan.mergeWalls(result.payload);
      const parts: string[] = [];
      if (mergedRunCount > 0) parts.push(`일직선 구간 ${mergedRunCount}곳을 벽 하나로 합침`);
      if (cornerCount > 0) parts.push(`모서리 ${cornerCount}곳을 하나로 합침${joinedCornerCount > 0 ? ` (끝점 ${joinedCornerCount}곳 정리)` : ''}`);
      appendLog(parts.join(', '), 'success');
    }
    setMergeWallCandidates(new Set());
    endActiveCommand(false);
    appendLog('명령 종료');
  }, [appendLog, endActiveCommand, floorPlan, mergeWallCandidates]);

  /** 선택된 객체들을 delta만큼 옮긴 새 복제본을 만든다(Undo 한 건). 벽/문/창문은 단일 선택일 때만 지원. */
  const duplicateSelection = useCallback(
    (selection: SelectionItem[], delta: Point) => {
      const entries: AddManyEntry[] = [];
      for (const item of selection) {
        switch (item.kind) {
          case 'furniture': {
            const f = floorPlan.furniture.find((x) => x.id === item.id);
            if (f) entries.push({ kind: 'furniture', data: { ...f, id: createId(), x: f.x + delta.x, y: f.y + delta.y } });
            break;
          }
          case 'outlet': {
            const o = floorPlan.outlets.find((x) => x.id === item.id);
            if (o) entries.push({ kind: 'outlet', data: { ...o, id: createId(), x: o.x + delta.x, y: o.y + delta.y } });
            break;
          }
          case 'label': {
            const l = floorPlan.labels.find((x) => x.id === item.id);
            if (l) entries.push({ kind: 'label', data: { ...l, id: createId(), x: l.x + delta.x, y: l.y + delta.y } });
            break;
          }
          case 'path': {
            const p = floorPlan.paths.find((x) => x.id === item.id);
            if (p) {
              entries.push({
                kind: 'path',
                data: {
                  ...p,
                  id: createId(),
                  start: { x: p.start.x + delta.x, y: p.start.y + delta.y },
                  end: { x: p.end.x + delta.x, y: p.end.y + delta.y },
                  controlPoint: p.controlPoint ? { x: p.controlPoint.x + delta.x, y: p.controlPoint.y + delta.y } : undefined,
                },
              });
            }
            break;
          }
          case 'polygon': {
            const poly = floorPlan.polygons.find((x) => x.id === item.id);
            if (poly) {
              entries.push({
                kind: 'polygon',
                data: { ...poly, id: createId(), points: poly.points.map((pt) => ({ x: pt.x + delta.x, y: pt.y + delta.y })) },
              });
            }
            break;
          }
          case 'dimension': {
            const dim = floorPlan.dimensions.find((x) => x.id === item.id);
            if (dim) {
              entries.push({
                kind: 'dimension',
                data: {
                  ...dim,
                  id: createId(),
                  start: { x: dim.start.x + delta.x, y: dim.start.y + delta.y },
                  end: { x: dim.end.x + delta.x, y: dim.end.y + delta.y },
                },
              });
            }
            break;
          }
          case 'wall': {
            const w = floorPlan.walls.find((x) => x.id === item.id);
            if (w) {
              entries.push({
                kind: 'wall',
                data: {
                  ...w,
                  id: createId(),
                  start: { x: w.start.x + delta.x, y: w.start.y + delta.y },
                  end: { x: w.end.x + delta.x, y: w.end.y + delta.y },
                },
              });
            }
            break;
          }
          case 'door': {
            const d = floorPlan.doors.find((x) => x.id === item.id);
            const wall = d && floorPlan.walls.find((w) => w.id === d.wallId);
            if (d && wall) {
              const dir = wallDirectionUnit(wall);
              const shift = delta.x * dir.x + delta.y * dir.y;
              const offsetMm = clampOpeningOffset(d.offsetMm + shift, d.widthMm, wallLengthMm(wall));
              entries.push({ kind: 'door', data: { ...d, id: createId(), offsetMm } });
            }
            break;
          }
          case 'window': {
            const win = floorPlan.windows.find((x) => x.id === item.id);
            const wall = win && floorPlan.walls.find((w) => w.id === win.wallId);
            if (win && wall) {
              const dir = wallDirectionUnit(wall);
              const shift = delta.x * dir.x + delta.y * dir.y;
              const offsetMm = clampOpeningOffset(win.offsetMm + shift, win.widthMm, wallLengthMm(wall));
              entries.push({ kind: 'window', data: { ...win, id: createId(), offsetMm } });
            }
            break;
          }
        }
      }
      floorPlan.addMany(entries);
    },
    [floorPlan],
  );

  /** 선택된 객체들을 delta만큼 그대로 옮긴다(새 객체를 만들지 않음, Undo 한 건). */
  const moveSelectionByDelta = useCallback(
    (selection: SelectionItem[], delta: Point) => {
      floorPlan.beginTransientEdit();
      for (const item of selection) {
        switch (item.kind) {
          case 'furniture': {
            const f = floorPlan.furniture.find((x) => x.id === item.id);
            if (f) floorPlan.updateFurniture(f.id, { x: f.x + delta.x, y: f.y + delta.y }, true);
            break;
          }
          case 'outlet': {
            const o = floorPlan.outlets.find((x) => x.id === item.id);
            if (o) floorPlan.updateOutlet(o.id, { x: o.x + delta.x, y: o.y + delta.y }, true);
            break;
          }
          case 'label': {
            const l = floorPlan.labels.find((x) => x.id === item.id);
            if (l) floorPlan.updateLabel(l.id, { x: l.x + delta.x, y: l.y + delta.y }, true);
            break;
          }
          case 'path': {
            const p = floorPlan.paths.find((x) => x.id === item.id);
            if (p) {
              floorPlan.updatePath(
                p.id,
                {
                  start: { x: p.start.x + delta.x, y: p.start.y + delta.y },
                  end: { x: p.end.x + delta.x, y: p.end.y + delta.y },
                  controlPoint: p.controlPoint ? { x: p.controlPoint.x + delta.x, y: p.controlPoint.y + delta.y } : undefined,
                },
                true,
              );
            }
            break;
          }
          case 'polygon': {
            const poly = floorPlan.polygons.find((x) => x.id === item.id);
            if (poly) floorPlan.updatePolygon(poly.id, { points: poly.points.map((pt) => ({ x: pt.x + delta.x, y: pt.y + delta.y })) }, true);
            break;
          }
          case 'dimension': {
            const dim = floorPlan.dimensions.find((x) => x.id === item.id);
            if (dim) {
              floorPlan.updateDimension(
                dim.id,
                { start: { x: dim.start.x + delta.x, y: dim.start.y + delta.y }, end: { x: dim.end.x + delta.x, y: dim.end.y + delta.y } },
                true,
              );
            }
            break;
          }
          case 'wall': {
            const w = floorPlan.walls.find((x) => x.id === item.id);
            if (w) {
              floorPlan.updateWall(
                w.id,
                { start: { x: w.start.x + delta.x, y: w.start.y + delta.y }, end: { x: w.end.x + delta.x, y: w.end.y + delta.y } },
                true,
              );
            }
            break;
          }
          case 'door': {
            const d = floorPlan.doors.find((x) => x.id === item.id);
            const wall = d && floorPlan.walls.find((w) => w.id === d.wallId);
            if (d && wall) {
              const dir = wallDirectionUnit(wall);
              const shift = delta.x * dir.x + delta.y * dir.y;
              floorPlan.updateDoor(d.id, { offsetMm: clampOpeningOffset(d.offsetMm + shift, d.widthMm, wallLengthMm(wall)) }, true);
            }
            break;
          }
          case 'window': {
            const win = floorPlan.windows.find((x) => x.id === item.id);
            const wall = win && floorPlan.walls.find((w) => w.id === win.wallId);
            if (win && wall) {
              const dir = wallDirectionUnit(wall);
              const shift = delta.x * dir.x + delta.y * dir.y;
              floorPlan.updateWindow(win.id, { offsetMm: clampOpeningOffset(win.offsetMm + shift, win.widthMm, wallLengthMm(wall)) }, true);
            }
            break;
          }
        }
      }
      floorPlan.commitTransientEdit();
    },
    [floorPlan],
  );

  /** 선택된 객체들을 pivot 기준 deltaDeg만큼 회전한다(Undo 한 건). */
  const rotateSelectionByAngle = useCallback(
    (selection: SelectionItem[], pivot: Point, deltaDeg: number) => {
      floorPlan.beginTransientEdit();
      for (const item of selection) {
        switch (item.kind) {
          case 'furniture': {
            const f = floorPlan.furniture.find((x) => x.id === item.id);
            if (f) {
              const rotated = rotatePointAround({ x: f.x, y: f.y }, pivot, deltaDeg);
              const rotationDeg = ((f.rotationDeg + deltaDeg) % 360 + 360) % 360;
              floorPlan.updateFurniture(f.id, { x: rotated.x, y: rotated.y, rotationDeg }, true);
            }
            break;
          }
          case 'outlet': {
            const o = floorPlan.outlets.find((x) => x.id === item.id);
            if (o) {
              const rotated = rotatePointAround({ x: o.x, y: o.y }, pivot, deltaDeg);
              floorPlan.updateOutlet(o.id, { x: rotated.x, y: rotated.y }, true);
            }
            break;
          }
          case 'label': {
            const l = floorPlan.labels.find((x) => x.id === item.id);
            if (l) {
              const rotated = rotatePointAround({ x: l.x, y: l.y }, pivot, deltaDeg);
              floorPlan.updateLabel(l.id, { x: rotated.x, y: rotated.y }, true);
            }
            break;
          }
          case 'path': {
            const p = floorPlan.paths.find((x) => x.id === item.id);
            if (p) {
              floorPlan.updatePath(
                p.id,
                {
                  start: rotatePointAround(p.start, pivot, deltaDeg),
                  end: rotatePointAround(p.end, pivot, deltaDeg),
                  controlPoint: p.controlPoint ? rotatePointAround(p.controlPoint, pivot, deltaDeg) : undefined,
                },
                true,
              );
            }
            break;
          }
          case 'polygon': {
            const poly = floorPlan.polygons.find((x) => x.id === item.id);
            if (poly) floorPlan.updatePolygon(poly.id, { points: poly.points.map((pt) => rotatePointAround(pt, pivot, deltaDeg)) }, true);
            break;
          }
          case 'dimension': {
            const dim = floorPlan.dimensions.find((x) => x.id === item.id);
            if (dim) {
              floorPlan.updateDimension(
                dim.id,
                { start: rotatePointAround(dim.start, pivot, deltaDeg), end: rotatePointAround(dim.end, pivot, deltaDeg) },
                true,
              );
            }
            break;
          }
          case 'wall': {
            const w = floorPlan.walls.find((x) => x.id === item.id);
            if (w) floorPlan.updateWall(w.id, { start: rotatePointAround(w.start, pivot, deltaDeg), end: rotatePointAround(w.end, pivot, deltaDeg) }, true);
            break;
          }
          default:
            break;
        }
      }
      floorPlan.commitTransientEdit();
    },
    [floorPlan],
  );

  /** 회전 pivot: 다중 선택이면 전체 바운딩 박스 중심, 단일 선택이면 그 객체 바운딩 박스 중심. */
  const computePivot = useCallback((): Point | null => {
    const bounds = computeSelectionBounds(floorPlan.selection, {
      furniture: floorPlan.furniture,
      outlets: floorPlan.outlets,
      paths: floorPlan.paths,
      labels: floorPlan.labels,
      polygons: floorPlan.polygons,
      dimensions: floorPlan.dimensions,
    });
    if (bounds) return boundsCenter(bounds);
    // 벽처럼 다중 선택 대상이 아닌 단일 객체가 선택된 경우: 벽은 중간점을 pivot으로 쓴다.
    if (floorPlan.selectedWall) {
      const w = floorPlan.selectedWall;
      return { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 };
    }
    return null;
  }, [floorPlan]);

  const snappedWorldPoint = useCallback(
    (worldPoint: Point): Point => {
      const candidatePoints = collectSnapCandidates(
        {
          walls: floorPlan.walls,
          furniture: floorPlan.furniture,
          doors: floorPlan.doors,
          windows: floorPlan.windows,
          outlets: floorPlan.outlets,
          paths: floorPlan.paths,
          labels: floorPlan.labels,
          polygons: floorPlan.polygons,
          dimensions: floorPlan.dimensions,
        },
        interaction.snapCategories,
        {},
      );
      return snapPoint(worldPoint, { candidatePoints, scale: viewport.scale, enabled: interaction.snapEnabled }).point;
    },
    [floorPlan, interaction.snapCategories, interaction.snapEnabled, viewport.scale],
  );

  /**
   * PlanCanvas의 pointerdown이 기존 로직(interaction.onPointerDown)으로 넘어가기 전에 먼저
   * 호출된다. M/R/CO/BL처럼 클릭 여러 번으로 진행하는 명령이 활성 상태일 때만 클릭을
   * 가로채 처리하고 true를 반환한다 — 그 외(그리기 명령 등)에는 false를 반환해 기존 로직이
   * 그대로 처리하게 둔다(요청 19번 — 같은 기능을 중복 구현하지 않는다).
   */
  const tryHandlePointerDown = useCallback(
    (worldPoint: Point): boolean => {
      if (!activeCommand) return false;

      if (activeCommand.command === 'BL') {
        const hit = hitTestWalls(worldPoint, floorPlan.walls, WALL_HIT_TOLERANCE_PX / viewport.scale);
        if (hit) {
          setMergeWallCandidates((prev) => {
            const next = new Set(prev);
            if (next.has(hit.id)) next.delete(hit.id);
            else next.add(hit.id);
            return next;
          });
        }
        return true;
      }

      if (activeCommand.command === 'M' || activeCommand.command === 'CO') {
        const point = snappedWorldPoint(worldPoint);
        if (!clickStep) {
          setClickStep({ basePoint: point });
          appendLog(`기준점 지정: (${Math.round(point.x)}, ${Math.round(point.y)})`);
        } else {
          const delta = { x: point.x - clickStep.basePoint.x, y: point.y - clickStep.basePoint.y };
          if (activeCommand.command === 'M') {
            moveSelectionByDelta(floorPlan.selection, delta);
            appendLog(`이동 완료 (Δx ${Math.round(delta.x)}mm, Δy ${Math.round(delta.y)}mm)`, 'success');
          } else {
            duplicateSelection(floorPlan.selection, delta);
            appendLog('복사 완료', 'success');
          }
          endActiveCommand(false);
          appendLog('명령 종료');
        }
        return true;
      }

      if (activeCommand.command === 'R') {
        const pivot = computePivot();
        if (!pivot) {
          appendLog('회전할 객체를 찾을 수 없습니다.', 'error');
          endActiveCommand(false);
          return true;
        }
        const angleDeg = (Math.atan2(worldPoint.y - pivot.y, worldPoint.x - pivot.x) * 180) / Math.PI;
        if (!clickStep) {
          setClickStep({ basePoint: pivot, startAngleDeg: angleDeg });
          appendLog('회전할 각도의 목표 지점을 클릭하세요.');
        } else {
          let deltaDeg = angleDeg - (clickStep.startAngleDeg ?? angleDeg);
          if (interaction.snapEnabled) {
            const normalized = ((deltaDeg % 360) + 360) % 360;
            const snapped = snapAngleDeg(normalized);
            if (snapped !== null) deltaDeg = snapped;
          }
          rotateSelectionByAngle(floorPlan.selection, pivot, deltaDeg);
          appendLog(`회전 완료 (${Math.round(deltaDeg)}°)`, 'success');
          endActiveCommand(false);
          appendLog('명령 종료');
        }
        return true;
      }

      return false;
    },
    [
      activeCommand,
      appendLog,
      clickStep,
      computePivot,
      duplicateSelection,
      endActiveCommand,
      floorPlan.selection,
      floorPlan.walls,
      interaction.snapEnabled,
      moveSelectionByDelta,
      rotateSelectionByAngle,
      snappedWorldPoint,
      viewport.scale,
    ],
  );

  const autocompleteSuggestions = useMemo(() => searchCommands(buffer), [buffer]);
  const selectedAutocompleteIndex = autocompleteSuggestions.length === 0 ? 0 : autocompleteIndex % autocompleteSuggestions.length;

  const handleExecuteKey = useCallback(() => {
    if (buffer.length > 0) {
      const typed = buffer;
      // 정확히 일치하는 명령이 있으면 그것을, 없으면(예: "S"만 입력) 지금 하이라이트된
      // 자동완성 후보를 실행한다 — 방향키로 다른 후보를 고를 수도 있다(요청 14/15번).
      const cmd = findCommand(typed) ?? autocompleteSuggestions[selectedAutocompleteIndex];
      setBuffer('');
      setAutocompleteIndex(0);
      if (!cmd) {
        appendLog(`알 수 없는 명령: ${typed}`, 'error');
        return;
      }
      runCommand(cmd);
      return;
    }

    // 다각형 작성 중(꼭짓점 3개 이상)에는 Space가 "명령 종료"가 아니라 "도형 완성"으로 동작한다
    // (요청 6번 MU 설명 — 작성 중 Space와 명령 종료 Space가 충돌하지 않도록 상태로 구분).
    if (activeCommand?.command === 'MU' && interaction.polygonDraft.length >= MIN_POLYGON_VERTICES) {
      interaction.completePolygonDraft();
      appendLog('다각형 작성 완료 — 계속해서 새 다각형을 그릴 수 있습니다.', 'success');
      return;
    }

    if (activeCommand?.command === 'BL') {
      attemptWallMerge();
      return;
    }

    if (activeCommand) {
      endActiveCommand();
      return;
    }

    // 활성 명령/버퍼가 모두 없으면: 마지막으로 실행한(반복 가치가 있는) 명령을 다시 실행한다.
    if (lastRepeatableCommand) {
      const cmd = COMMAND_REGISTRY.find((c) => c.command === lastRepeatableCommand);
      if (cmd) runCommand(cmd);
    }
  }, [
    activeCommand,
    appendLog,
    attemptWallMerge,
    autocompleteSuggestions,
    buffer,
    endActiveCommand,
    interaction,
    lastRepeatableCommand,
    runCommand,
    selectedAutocompleteIndex,
  ]);

  const runCommandById = useCallback(
    (command: string) => {
      const cmd = findCommand(command);
      if (cmd) runCommand(cmd);
    },
    [runCommand],
  );

  // 전역 키보드 리스너 — input/textarea 등 텍스트 편집 중에는 아무 것도 하지 않는다.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isTextEditingTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return; // 기존 Ctrl+C/V/Z/Y 등과 충돌하지 않게 그대로 통과

      if (e.key === 'Escape') {
        if (buffer) {
          setBuffer('');
          return;
        }
        if (activeCommand) {
          e.preventDefault();
          endActiveCommand();
          return;
        }
        interaction.endChain();
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleExecuteKey();
        return;
      }

      if (e.key === 'Backspace') {
        if (buffer.length > 0) {
          e.preventDefault();
          setBuffer((b) => b.slice(0, -1));
        }
        return;
      }

      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && autocompleteSuggestions.length > 0) {
        e.preventDefault();
        const dir = e.key === 'ArrowDown' ? 1 : -1;
        setAutocompleteIndex((i) => (i + dir + autocompleteSuggestions.length) % autocompleteSuggestions.length);
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setBuffer((b) => (b.length < 16 ? b + '?' : b));
        return;
      }

      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        setBuffer((b) => (b.length < 16 ? b + e.key.toUpperCase() : b));
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCommand, autocompleteSuggestions.length, buffer, endActiveCommand, handleExecuteKey, interaction]);

  const helpResults = useMemo(() => {
    const q = helpSearch.trim().toUpperCase();
    if (!q) return COMMAND_REGISTRY;
    return COMMAND_REGISTRY.filter(
      (cmd) =>
        cmd.command.includes(q) ||
        cmd.aliases.some((a) => a.includes(q)) ||
        cmd.name.includes(helpSearch.trim()) ||
        cmd.description.includes(helpSearch.trim()),
    );
  }, [helpSearch]);

  const prompt = useMemo(() => {
    if (!activeCommand) return '';
    switch (activeCommand.command) {
      case 'L':
        return interaction.chainStart ? '다음 점을 클릭하세요. (Space/Esc: 종료)' : '벽 시작점을 클릭하세요. (Space/Esc: 종료)';
      case 'SL':
        return interaction.chainStart ? '동선 끝점을 클릭하세요.' : '동선 시작점을 클릭하세요.';
      case 'MU':
        return interaction.polygonDraft.length === 0
          ? '다각형 첫 꼭짓점을 클릭하세요.'
          : `꼭짓점 ${interaction.polygonDraft.length}개 입력됨 — 계속 클릭, 첫 점 재클릭/Enter/Space로 완성.`;
      case 'B':
      case 'C':
      case 'EL':
        return '배치할 위치를 클릭하세요. (반복 가능, Space/Esc: 종료)';
      case 'D':
        return '문을 놓을 벽을 클릭하세요.';
      case 'WIN':
        return '창문을 놓을 벽을 클릭하세요.';
      case 'CON':
        return '콘센트를 놓을 위치를 클릭하세요.';
      case 'T':
        return '텍스트를 놓을 위치를 클릭하세요.';
      case 'M':
        return clickStep ? '이동할 위치를 클릭하세요.' : '이동 기준점을 클릭하세요.';
      case 'CO':
        return clickStep ? '복사할 위치를 클릭하세요.' : '복사 기준점을 클릭하세요.';
      case 'R':
        return clickStep ? '회전할 각도의 목표 지점을 클릭하세요.' : '회전 기준각 지점을 클릭하세요.';
      case 'BL':
        return `병합할 벽을 클릭해 선택하세요 (현재 ${mergeWallCandidates.size}개). 완료: Space, 취소: Esc.`;
      default:
        return '';
    }
  }, [activeCommand, clickStep, interaction.chainStart, interaction.polygonDraft.length, mergeWallCandidates.size]);

  return {
    buffer,
    log,
    activeCommand,
    activeCommandLabel: activeCommand ? `${activeCommand.name} [${activeCommand.command}]` : null,
    prompt,
    mergeWallCandidates,
    collapsed,
    toggleCollapsed: () => setCollapsed((v) => !v),
    helpOpen,
    setHelpOpen,
    helpSearch,
    setHelpSearch,
    helpResults,
    autocompleteSuggestions,
    autocompleteIndex: selectedAutocompleteIndex,
    runCommandById,
    cancelActiveCommand: () => endActiveCommand(),
    tryHandlePointerDown,
  };
}

export type UseCommandSystemResult = ReturnType<typeof useCommandSystem>;
