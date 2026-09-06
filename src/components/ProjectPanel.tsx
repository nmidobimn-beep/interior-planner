import { useState } from 'react';
import type { UseProjectsResult } from '../hooks/useProjects';

interface ProjectPanelProps {
  projects: UseProjectsResult;
  /** 미저장 변경 보호 공통 함수 — 프로젝트 전환/생성/삭제처럼 현재 도면을 바꿀 수 있는 동작은
   * 이 함수를 통해서만 실행한다(dirty가 아니면 바로 실행됨). */
  confirmUnsavedChanges: (nextAction: () => void) => void;
}

/** 도면 프로젝트 생성/선택/이름 수정/삭제 + 현재 도면 저장·불러오기. 가구 라이브러리와는 완전히 별개다. */
export function ProjectPanel({ projects, confirmUnsavedChanges }: ProjectPanelProps) {
  const { projects: list, activeProjectId, status, errorMessage, selectProject, saveActiveProject, createAndSelect, rename, remove } = projects;
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    confirmUnsavedChanges(() => createAndSelect(name));
    setNewName('');
  };

  return (
    <>
      <div className="side-panel-title">도면 프로젝트</div>

      {list.length === 0 ? (
        <div className="side-panel-placeholder">아직 프로젝트가 없습니다. 아래에서 새 도면을 만드세요.</div>
      ) : (
        <ul className="project-panel-list">
          {list.map((project) =>
            renamingId === project.id ? (
              <li key={project.id} className="project-panel-item">
                <input
                  className="project-panel-new-row-input"
                  style={{ flex: 1 }}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  className="project-panel-item-icon"
                  onClick={() => {
                    if (renameValue.trim()) rename(project.id, renameValue.trim());
                    setRenamingId(null);
                  }}
                  title="이름 저장"
                >
                  ✓
                </button>
                <button type="button" className="project-panel-item-icon" onClick={() => setRenamingId(null)} title="취소">
                  ×
                </button>
              </li>
            ) : (
              <li key={project.id} className="project-panel-item">
                <button
                  type="button"
                  className={`project-panel-item-button${project.id === activeProjectId ? ' is-active' : ''}`}
                  onClick={() => confirmUnsavedChanges(() => selectProject(project.id))}
                  title="이 프로젝트 불러오기"
                >
                  {project.name}
                </button>
                <button
                  type="button"
                  className="project-panel-item-icon"
                  onClick={() => {
                    setRenamingId(project.id);
                    setRenameValue(project.name);
                  }}
                  title="이름 수정"
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="project-panel-item-icon"
                  onClick={() => {
                    // 지금 열려있는(활성) 프로젝트를 지우는 경우에만 미저장 변경 보호가 의미 있다 —
                    // 다른 프로젝트를 지우는 건 현재 작업 중인 도면과 무관하다.
                    if (project.id === activeProjectId) confirmUnsavedChanges(() => remove(project.id));
                    else remove(project.id);
                  }}
                  title="프로젝트 삭제(가구 라이브러리는 유지됨)"
                >
                  ×
                </button>
              </li>
            ),
          )}
        </ul>
      )}

      <div className="project-panel-new-row">
        <input
          type="text"
          placeholder="새 도면 이름"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <button type="button" className="secondary-button" onClick={handleCreate}>
          새 도면
        </button>
      </div>

      {activeProjectId && (
        <button type="button" className="primary-button" style={{ width: '100%', marginTop: 8 }} onClick={saveActiveProject} disabled={status === 'saving'}>
          {status === 'saving' ? '저장 중...' : '현재 도면 저장'}
        </button>
      )}

      {status === 'loading' && <div className="project-panel-status">불러오는 중...</div>}
      {status === 'error' && errorMessage && <div className="project-panel-status is-error">{errorMessage}</div>}
    </>
  );
}
