import { useEffect, useRef } from 'react';
import type { UseCommandSystemResult } from '../hooks/useCommandSystem';

interface CommandWindowProps {
  commandSystem: UseCommandSystemResult;
}

/**
 * 화면 하단 CAD 스타일 명령창. 평소엔 접혀 있다가(작은 "⌵ 명령창" 표시줄) 클릭하면 펼쳐져
 * 최근 명령 로그와 지금 입력 중인 명령어, 활성 명령의 안내 문구를 보여준다. 실제 명령 실행은
 * useCommandSystem의 전역 키보드 리스너가 처리하므로, 이 컴포넌트는 표시 전담이다.
 */
export function CommandWindow({ commandSystem }: CommandWindowProps) {
  const {
    buffer,
    log,
    activeCommandLabel,
    prompt,
    collapsed,
    toggleCollapsed,
    autocompleteSuggestions,
    autocompleteIndex,
    runCommandById,
    setHelpOpen,
  } = commandSystem;
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  if (collapsed) {
    return (
      <button type="button" className="command-window-collapsed" onClick={toggleCollapsed} title="명령창 펼치기">
        ⌃ 명령창{activeCommandLabel ? ` — ${activeCommandLabel}` : ''}
      </button>
    );
  }

  return (
    <div className="command-window">
      <div className="command-window-header">
        <button type="button" className="command-window-toggle" onClick={toggleCollapsed} title="명령창 접기">
          ⌄ 명령창
        </button>
        <button type="button" className="command-window-help-button" onClick={() => setHelpOpen(true)} title="명령어 도움말 (? + Space)">
          ?
        </button>
      </div>

      <div className="command-window-log" ref={logRef}>
        {log.length === 0 && <div className="command-window-log-empty">명령어를 입력해보세요. 예: L (벽), B (사각형), ? (도움말)</div>}
        {log.map((entry) => (
          <div key={entry.id} className={`command-window-log-line command-window-log-line--${entry.kind}`}>
            {entry.text}
          </div>
        ))}
      </div>

      {activeCommandLabel && (
        <div className="command-window-status">
          <span className="command-window-status-label">현재 명령 : {activeCommandLabel}</span>
          <span className="command-window-status-prompt">{prompt}</span>
        </div>
      )}

      <div className="command-window-input-row">
        <span className="command-window-input-label">명령 입력</span>
        <div className="command-window-input-field">
          {buffer}
          <span className="command-window-caret" />
        </div>
      </div>

      {autocompleteSuggestions.length > 0 && (
        <ul className="command-autocomplete-list">
          {autocompleteSuggestions.map((cmd, index) => (
            <li key={cmd.command}>
              <button
                type="button"
                className={`command-autocomplete-item${index === autocompleteIndex ? ' is-active' : ''}`}
                onClick={() => runCommandById(cmd.command)}
              >
                <span className="command-autocomplete-code">{cmd.command}</span>
                <span className="command-autocomplete-name">{cmd.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
