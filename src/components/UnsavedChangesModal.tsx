import type { UnsavedChangesChoice } from '../hooks/useUnsavedChangesGuard';

interface UnsavedChangesModalProps {
  open: boolean;
  hasActiveProject: boolean;
  onResolve: (choice: UnsavedChangesChoice) => void;
}

/** 미저장 변경이 있는 상태에서 도면을 지우거나 바꾸려 할 때 뜨는 공통 확인창. */
export function UnsavedChangesModal({ open, hasActiveProject, onResolve }: UnsavedChangesModalProps) {
  if (!open) return null;

  return (
    <div className="confirm-modal-backdrop" onClick={() => onResolve('cancel')}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <h2>저장하지 않은 변경 사항이 있습니다</h2>
        <p>계속 진행하면 지금까지 작업한 내용을 잃을 수 있습니다. 어떻게 할까요?</p>
        <div className="confirm-modal-actions">
          {hasActiveProject && (
            <button type="button" className="primary-button" onClick={() => onResolve('save')}>
              현재 프로젝트에 저장
            </button>
          )}
          <button type="button" className="secondary-button" onClick={() => onResolve('saveAs')}>
            다른 이름으로 저장
          </button>
          <button type="button" className="danger-button" onClick={() => onResolve('discard')}>
            저장하지 않고 진행
          </button>
          <button type="button" className="secondary-button" onClick={() => onResolve('cancel')}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
