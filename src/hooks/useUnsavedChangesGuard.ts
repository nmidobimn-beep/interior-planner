import { useCallback, useState } from 'react';
import type { UseFloorPlanResult } from './useFloorPlan';
import type { UseProjectsResult } from './useProjects';

export type UnsavedChangesChoice = 'save' | 'saveAs' | 'discard' | 'cancel';

interface PendingGuard {
  nextAction: () => void;
}

/**
 * 미저장 변경 보호 공통 로직. 현재 도면을 지우거나 다른 도면으로 바꿀 가능성이 있는 모든
 * 동작(새 도면/파일 불러오기/프로젝트 전환·생성·삭제 등)은 반드시 confirmUnsavedChanges를
 * 통해서만 실행한다 — 각 버튼이 저마다 확인 로직을 만들지 않는다.
 */
export function useUnsavedChangesGuard(floorPlan: UseFloorPlanResult, projects: UseProjectsResult) {
  const [pending, setPending] = useState<PendingGuard | null>(null);

  /** dirty가 아니면 바로 실행, dirty면 사용자 선택을 기다렸다가 처리한다. */
  const confirmUnsavedChanges = useCallback(
    (nextAction: () => void) => {
      if (!floorPlan.dirty) {
        nextAction();
        return;
      }
      setPending({ nextAction });
    },
    [floorPlan.dirty],
  );

  const resolveUnsavedChanges = useCallback(
    async (choice: UnsavedChangesChoice) => {
      if (!pending) return;
      const { nextAction } = pending;
      setPending(null);

      if (choice === 'cancel') return;
      if (choice === 'discard') {
        nextAction();
        return;
      }
      if (choice === 'save') {
        if (!projects.activeProjectId) return;
        await projects.saveActiveProject();
        nextAction();
        return;
      }
      if (choice === 'saveAs') {
        const name = window.prompt('새 프로젝트 이름을 입력하세요');
        if (!name || !name.trim()) return; // 취소/빈 값 -> 원래 동작도 취소
        await projects.saveAsNewProject(name.trim());
        nextAction();
      }
    },
    [pending, projects],
  );

  return {
    pendingUnsavedChanges: pending !== null,
    hasActiveProject: projects.activeProjectId !== null,
    confirmUnsavedChanges,
    resolveUnsavedChanges,
  };
}

export type UseUnsavedChangesGuardResult = ReturnType<typeof useUnsavedChangesGuard>;
