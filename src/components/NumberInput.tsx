import { useRef, useState } from 'react';

interface NumberInputProps {
  id?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onCommit: (value: number) => void;
}

/**
 * 숫자 입력창 공통 컴포넌트. 길이/스냅 단위/지름/가로/세로/각도 등 모든 숫자 입력이 이걸 쓴다.
 *
 * 문제였던 기존 방식: `value`를 그대로 controlled value로 쓰고 onChange마다 즉시 검증/반영하면,
 * 칸을 완전히 지웠을 때 `Number('')`가 0이 되어버려 즉시 최소값 등으로 스냅되고, 그 값이 다시
 * controlled value로 내려와 입력을 계속할 수 없게 된다.
 *
 * 해결: 편집 중 사용자가 입력한 문자열을 `draftOverride`에 그대로 들고 있다가(null이면 "편집
 * 중이 아님" — 바깥 value를 그대로 보여줌), Enter나 포커스 해제(blur) 시에만 검증한다 — 빈
 * 문자열("")과 숫자 0을 구분해서, 빈 값이나 잘못된 값으로 끝내면 마지막 정상값으로 되돌린다.
 * 커밋 후에는 override를 지워 항상 바깥 value(선택된 객체가 바뀌거나 단위가 바뀐 경우 포함)를
 * 그대로 반영하므로, 별도의 동기화 effect가 필요 없다.
 */
export function NumberInput({ id, value, min, max, step, onCommit }: NumberInputProps) {
  const [draftOverride, setDraftOverride] = useState<string | null>(null);
  // Escape로 취소했을 때, 뒤이은 blur 이벤트가 commit을 수행하지 않도록 막는 플래그.
  const cancelledRef = useRef(false);

  const displayValue = draftOverride ?? String(value);

  const commit = () => {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      setDraftOverride(null);
      return;
    }
    if (draftOverride === null) return; // 편집한 적 없이 포커스만 왔다갔으면 변화 없음

    const trimmed = draftOverride.trim();
    const parsed = Number(trimmed);
    // ""와 0은 반드시 구분한다 — 빈 문자열이면 숫자로 취급하지 않고 이전 값으로 되돌린다.
    if (trimmed === '' || !Number.isFinite(parsed)) {
      setDraftOverride(null);
      return;
    }
    let next = parsed;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    if (next !== value) onCommit(next);
    setDraftOverride(null);
  };

  return (
    <input
      id={id}
      type="number"
      step={step}
      min={min}
      max={max}
      value={displayValue}
      onChange={(e) => setDraftOverride(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur(); // onBlur가 commit을 수행한다
        } else if (e.key === 'Escape') {
          // 입력 중이던 값을 버리고 마지막 정상값으로 되돌린다. 전역 ESC(cancelCurrentOperation)
          // 로 이벤트가 번지지 않도록 여기서 멈춘다(입력창 안에서의 취소는 이 입력만의 일이다).
          e.preventDefault();
          e.stopPropagation();
          cancelledRef.current = true;
          e.currentTarget.blur(); // blur가 commit을 부르지만 cancelledRef가 막아준다
        }
      }}
    />
  );
}
