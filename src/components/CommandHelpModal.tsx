import { CATEGORY_LABEL, type CommandCategory, type CommandDefinition } from '../core/commandDefinitions';
import type { UseCommandSystemResult } from '../hooks/useCommandSystem';

interface CommandHelpModalProps {
  commandSystem: UseCommandSystemResult;
}

const CATEGORY_ORDER: CommandCategory[] = ['DRAW', 'EDIT', 'SYSTEM'];

function groupByCategory(commands: CommandDefinition[]): Record<CommandCategory, CommandDefinition[]> {
  const groups: Record<CommandCategory, CommandDefinition[]> = { DRAW: [], EDIT: [], SYSTEM: [] };
  for (const cmd of commands) groups[cmd.category].push(cmd);
  return groups;
}

/**
 * 명령어 도움말 모달. "?" 버튼이나 "? + Space" 명령으로 연다. 표시하는 내용은 전부
 * Command Registry(core/commandDefinitions.ts)에서 그대로 가져오므로, 새 명령을 등록하면
 * 이 화면에도 자동으로 반영된다.
 */
export function CommandHelpModal({ commandSystem }: CommandHelpModalProps) {
  const { helpOpen, setHelpOpen, helpSearch, setHelpSearch, helpResults } = commandSystem;
  if (!helpOpen) return null;

  const grouped = groupByCategory(helpResults);

  return (
    <div className="command-help-backdrop" onClick={() => setHelpOpen(false)}>
      <div className="command-help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="command-help-header">
          <h2>명령어 도움말</h2>
          <button type="button" className="command-help-close" onClick={() => setHelpOpen(false)} title="닫기">
            ×
          </button>
        </div>

        <input
          type="text"
          className="command-help-search"
          placeholder="명령어 또는 기능 이름으로 검색..."
          value={helpSearch}
          onChange={(e) => setHelpSearch(e.target.value)}
          autoFocus
        />

        <div className="command-help-body">
          {CATEGORY_ORDER.map((category) => {
            const commands = grouped[category];
            if (commands.length === 0) return null;
            return (
              <div key={category} className="command-help-category">
                <div className="command-help-category-title">{CATEGORY_LABEL[category]}</div>
                <table className="command-help-table">
                  <tbody>
                    {commands.map((cmd) => (
                      <tr key={cmd.command}>
                        <td className="command-help-code">{cmd.command}</td>
                        <td className="command-help-name">{cmd.name}</td>
                        <td className="command-help-desc">{cmd.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
          {helpResults.length === 0 && <div className="command-help-empty">일치하는 명령어가 없습니다.</div>}
        </div>

        <div className="command-help-footer">모든 명령어는 대소문자를 구분하지 않으며, 입력 후 Space 또는 Enter로 실행합니다.</div>
      </div>
    </div>
  );
}
