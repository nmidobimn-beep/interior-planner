import type { UseFloorPlanResult } from '../hooks/useFloorPlan';
import type { UsePlanInteractionResult } from '../hooks/usePlanInteraction';
import type { Viewport } from './viewport';

export type CommandCategory = 'DRAW' | 'EDIT' | 'SYSTEM';
export type CommandLogKind = 'command' | 'info' | 'success' | 'error';

/** 명령이 실제로 실행되는 순간에 필요한 것들 — 항상 "지금 렌더된" 최신 값을 담아 호출된다. */
export interface CommandRuntimeContext {
  interaction: UsePlanInteractionResult;
  floorPlan: UseFloorPlanResult;
  viewport: Viewport;
  log: (text: string, kind?: CommandLogKind) => void;
  toggleHelp: () => void;
  focusLayerPanel: () => void;
}

/**
 * 명령어 하나의 정의. 새 명령을 추가하려면 이 배열에 항목 하나만 추가하면 되고,
 * 명령 실행 + 자동완성 + 도움말에 자동으로 반영된다(요청 23번 — Command Registry).
 */
export interface CommandDefinition {
  /** 대표 코드(항상 대문자로 비교됨). 예: 'L' */
  command: string;
  /** 추가로 허용하는 별칭(영문 이름 등). */
  aliases: string[];
  /** 한글 이름. 예: '벽' */
  name: string;
  description: string;
  category: CommandCategory;
  /** 객체 생성 명령처럼, 완료 후에도 같은 명령을 계속 반복 실행할 수 있는지. */
  repeatable: boolean;
  /** 실행 후 마우스 클릭 등 추가 입력을 기다리는 "진행 중" 명령인지. false면 즉시 끝난다. */
  interactive: boolean;
  /** 실행 함수. false를 반환하면 (조건 미충족 등으로) interactive 상태에 들어가지 않고 즉시 종료한다. */
  execute: (ctx: CommandRuntimeContext) => boolean | void;
}

function requireSelection(ctx: CommandRuntimeContext, actionLabel: string): boolean {
  if (ctx.floorPlan.selectionCount === 0) {
    ctx.log(`${actionLabel}할 객체를 먼저 선택하세요.`, 'error');
    return false;
  }
  return true;
}

export const COMMAND_REGISTRY: CommandDefinition[] = [
  // --- 그리기(DRAW) ---
  {
    command: 'L',
    aliases: ['WALL'],
    name: '벽',
    description: '벽 그리기 — 시작점과 끝점을 클릭',
    category: 'DRAW',
    repeatable: true,
    interactive: true,
    execute: (ctx) => {
      ctx.interaction.setKeepToolActive(true);
      ctx.interaction.setActiveTool('wall');
    },
  },
  {
    command: 'B',
    aliases: ['RECT', 'RECTANGLE', 'BOX'],
    name: '사각형',
    description: '사각형 가구 생성 — 위치를 클릭',
    category: 'DRAW',
    repeatable: true,
    interactive: true,
    execute: (ctx) => {
      ctx.interaction.setKeepToolActive(true);
      ctx.interaction.setActiveTool('rectangle');
    },
  },
  {
    command: 'C',
    aliases: ['CIRCLE'],
    name: '원',
    description: '원형 가구 생성 — 위치를 클릭',
    category: 'DRAW',
    repeatable: true,
    interactive: true,
    execute: (ctx) => {
      ctx.interaction.setKeepToolActive(true);
      ctx.interaction.setActiveTool('circle');
    },
  },
  {
    command: 'EL',
    aliases: ['LSHAPE'],
    name: 'ㄱ자형',
    description: 'ㄱ자형 가구 생성 — 위치를 클릭',
    category: 'DRAW',
    repeatable: true,
    interactive: true,
    execute: (ctx) => {
      ctx.interaction.setKeepToolActive(true);
      ctx.interaction.setActiveTool('lshape');
    },
  },
  {
    command: 'MU',
    aliases: ['POLYGON'],
    name: '다각형',
    description: '자유 다각형 생성 — 꼭짓점을 순서대로 클릭, 첫 점 재클릭/Enter/Space로 완성',
    category: 'DRAW',
    repeatable: true,
    interactive: true,
    execute: (ctx) => {
      ctx.interaction.setKeepToolActive(true);
      ctx.interaction.setActiveTool('polygon');
    },
  },
  {
    command: 'D',
    aliases: ['DOOR'],
    name: '문',
    description: '문 배치 — 벽을 클릭',
    category: 'DRAW',
    repeatable: true,
    interactive: true,
    execute: (ctx) => {
      ctx.interaction.setKeepToolActive(true);
      ctx.interaction.setActiveTool('door');
    },
  },
  {
    command: 'WIN',
    aliases: ['WINDOW'],
    name: '창문',
    description: '창문 배치 — 벽을 클릭',
    category: 'DRAW',
    repeatable: true,
    interactive: true,
    execute: (ctx) => {
      ctx.interaction.setKeepToolActive(true);
      ctx.interaction.setActiveTool('window');
    },
  },
  {
    command: 'CON',
    aliases: ['OUTLET'],
    name: '콘센트',
    description: '콘센트 배치 — 위치를 클릭',
    category: 'DRAW',
    repeatable: true,
    interactive: true,
    execute: (ctx) => {
      ctx.interaction.setKeepToolActive(true);
      ctx.interaction.setActiveTool('outlet');
    },
  },
  {
    command: 'SL',
    aliases: ['PATH'],
    name: '동선',
    description: '동선(이동 경로) 작성 — 시작점과 끝점을 클릭',
    category: 'DRAW',
    repeatable: true,
    interactive: true,
    execute: (ctx) => {
      ctx.interaction.setKeepToolActive(true);
      ctx.interaction.setActiveTool('path');
    },
  },
  {
    command: 'T',
    aliases: ['TEXT', 'LABEL'],
    name: '텍스트',
    description: '텍스트 라벨 생성 — 위치를 클릭',
    category: 'DRAW',
    repeatable: true,
    interactive: true,
    execute: (ctx) => {
      ctx.interaction.setKeepToolActive(true);
      ctx.interaction.setActiveTool('label');
    },
  },

  // --- 편집(EDIT) ---
  {
    command: 'M',
    aliases: ['MOVE'],
    name: '이동',
    description: '선택 객체 이동 — 기준점과 이동할 위치를 클릭',
    category: 'EDIT',
    repeatable: false,
    interactive: true,
    execute: (ctx) => {
      if (!requireSelection(ctx, '이동')) return false;
      ctx.log('이동 기준점을 클릭하세요.');
      return true;
    },
  },
  {
    command: 'R',
    aliases: ['ROTATE'],
    name: '회전',
    description: '선택 객체 회전 — 기준각 지점과 목표 각도 지점을 클릭',
    category: 'EDIT',
    repeatable: false,
    interactive: true,
    execute: (ctx) => {
      if (!requireSelection(ctx, '회전')) return false;
      ctx.log('회전 기준각 지점을 클릭하세요.');
      return true;
    },
  },
  {
    command: 'CO',
    aliases: ['COPY'],
    name: '복사',
    description: '선택 객체 복사 배치 — 기준점과 복사할 위치를 클릭',
    category: 'EDIT',
    repeatable: false,
    interactive: true,
    execute: (ctx) => {
      if (!requireSelection(ctx, '복사')) return false;
      ctx.log('복사 기준점을 클릭하세요.');
      return true;
    },
  },
  {
    command: 'DEL',
    aliases: ['DELETE', 'ERASE'],
    name: '삭제',
    description: '선택 객체 삭제',
    category: 'EDIT',
    repeatable: false,
    interactive: false,
    execute: (ctx) => {
      if (!requireSelection(ctx, '삭제')) return false;
      const count = ctx.floorPlan.selectionCount;
      ctx.floorPlan.deleteSelected();
      ctx.log(`객체 ${count}개 삭제 완료`, 'success');
    },
  },
  {
    command: 'BL',
    aliases: ['MERGE', 'MERGEWALLS'],
    name: '벽 합치기',
    description: '선택한 벽들을 하나로 병합 — 벽을 순서대로 클릭 후 Space',
    category: 'EDIT',
    repeatable: false,
    interactive: true,
    execute: (ctx) => {
      ctx.log('병합할 벽을 순서대로 클릭하세요. 완료하려면 Space, 취소하려면 Esc.');
      return true;
    },
  },

  // --- 시스템(SYSTEM) ---
  {
    command: 'SNAP',
    aliases: [],
    name: '스냅',
    description: '스냅 ON/OFF 전환',
    category: 'SYSTEM',
    repeatable: false,
    interactive: false,
    execute: (ctx) => {
      const next = !ctx.interaction.snapEnabled;
      ctx.interaction.setSnapEnabled(next);
      ctx.log(`SNAP : ${next ? 'ON' : 'OFF'}`);
    },
  },
  {
    command: 'Z',
    aliases: ['UNDO'],
    name: '실행 취소',
    description: '최근 작업 되돌리기',
    category: 'SYSTEM',
    repeatable: false,
    interactive: false,
    execute: (ctx) => {
      if (!ctx.floorPlan.canUndo) {
        ctx.log('되돌릴 작업이 없습니다.', 'error');
        return;
      }
      ctx.floorPlan.undo();
      ctx.log('실행 취소');
    },
  },
  {
    command: 'RE',
    aliases: ['REDO'],
    name: '다시 실행',
    description: '취소한 작업 다시 실행',
    category: 'SYSTEM',
    repeatable: false,
    interactive: false,
    execute: (ctx) => {
      if (!ctx.floorPlan.canRedo) {
        ctx.log('다시 실행할 작업이 없습니다.', 'error');
        return;
      }
      ctx.floorPlan.redo();
      ctx.log('다시 실행');
    },
  },
  {
    command: 'LA',
    aliases: ['LAYER'],
    name: '레이어',
    description: '레이어 패널로 이동',
    category: 'SYSTEM',
    repeatable: false,
    interactive: false,
    execute: (ctx) => {
      ctx.focusLayerPanel();
      ctx.log('레이어 패널로 이동했습니다.');
    },
  },
  {
    command: 'NL',
    aliases: ['NEWLAYER'],
    name: '새 레이어',
    description: '새 레이어 생성',
    category: 'SYSTEM',
    repeatable: false,
    interactive: false,
    execute: (ctx) => {
      const layer = ctx.floorPlan.addLayer();
      ctx.log(`새 레이어 생성: ${layer.name}`, 'success');
    },
  },
  {
    command: '?',
    aliases: ['HELP'],
    name: '도움말',
    description: '명령어 도움말 열기',
    category: 'SYSTEM',
    repeatable: false,
    interactive: false,
    execute: (ctx) => {
      ctx.toggleHelp();
      ctx.log('명령어 도움말을 엽니다.');
    },
  },
];

/** 명령 코드(대소문자 무관, 별칭 포함)로 정의를 찾는다. */
export function findCommand(input: string): CommandDefinition | undefined {
  const normalized = input.trim().toUpperCase();
  if (!normalized) return undefined;
  return COMMAND_REGISTRY.find(
    (cmd) => cmd.command === normalized || cmd.aliases.some((alias) => alias === normalized),
  );
}

/** 자동완성 후보 — 입력한 접두사로 시작하는 명령들(대표 코드 기준으로 하나씩만). */
export function searchCommands(prefix: string): CommandDefinition[] {
  const normalized = prefix.trim().toUpperCase();
  if (!normalized) return [];
  return COMMAND_REGISTRY.filter(
    (cmd) => cmd.command.startsWith(normalized) || cmd.aliases.some((alias) => alias.startsWith(normalized)),
  );
}

export const CATEGORY_LABEL: Record<CommandCategory, string> = {
  DRAW: '그리기',
  EDIT: '편집',
  SYSTEM: '시스템',
};
