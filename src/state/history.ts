/**
 * 어떤 reducer에도 씌울 수 있는 범용 Undo/Redo 래퍼.
 * "선택 상태 변경"처럼 되돌릴 필요 없는 액션은 isUndoable에서 false를 반환해
 * 히스토리에 쌓이지 않도록(Ctrl+Z 한 번에 선택만 풀리는 등 불필요한 되돌리기 방지) 걸러낸다.
 *
 * 드래그(이동/회전/리사이즈)처럼 한 제스처 안에서 여러 번 중간 갱신되는 작업은
 * 그 중간 갱신들을 isUndoable에서 false로 걸러 History에 쌓지 않고(transient),
 * 제스처가 끝나는 순간 commit()으로 "시작 상태 → 끝 상태" 단 한 건만 기록한다.
 */
export interface HistoryState<S> {
  past: S[];
  present: S;
  future: S[];
}

export const UNDO = { type: '@@history/UNDO' } as const;
export const REDO = { type: '@@history/REDO' } as const;
const RESET_TYPE = '@@history/RESET' as const;
const COMMIT_TYPE = '@@history/COMMIT' as const;

interface ResetAction<S> {
  type: typeof RESET_TYPE;
  payload: S;
}

interface CommitAction<S> {
  type: typeof COMMIT_TYPE;
  before: S;
}

/** 새 문서를 불러오거나 "새로 만들기"할 때 사용 — 히스토리(과거/미래)를 통째로 비우고 새 present로 교체한다. */
export function reset<S>(payload: S): ResetAction<S> {
  return { type: RESET_TYPE, payload };
}

/**
 * 드래그 시작 시점에 캡처해둔 상태(before)를 past에 쌓고, present는 지금 값(드래그 최종 결과)
 * 그대로 둔다. 중간 과정(transient 액션들)은 이미 present만 계속 바꿔왔을 뿐 past/future를
 * 건드리지 않았으므로, 이 한 번의 커밋으로 "드래그 시작 → 드래그 종료"가 History 한 건이 된다.
 * before와 현재 present가 참조상 같다면(=드래그 도중 실제로 아무 것도 갱신되지 않았다면) no-op.
 */
export function commit<S>(before: S): CommitAction<S> {
  return { type: COMMIT_TYPE, before };
}

export type HistoryAction<S, A> = A | typeof UNDO | typeof REDO | ResetAction<S> | CommitAction<S>;

const MAX_HISTORY = 100;

export function createHistoryReducer<S, A extends { type: string }>(
  baseReducer: (state: S, action: A) => S,
  isUndoable: (action: A) => boolean,
) {
  return function historyReducer(state: HistoryState<S>, action: HistoryAction<S, A>): HistoryState<S> {
    if (action.type === UNDO.type) {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] };
    }

    if (action.type === REDO.type) {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return { past: [...state.past, state.present], present: next, future: rest };
    }

    if (action.type === RESET_TYPE) {
      return { past: [], present: (action as ResetAction<S>).payload, future: [] };
    }

    if (action.type === COMMIT_TYPE) {
      const { before } = action as CommitAction<S>;
      if (before === state.present) return state;
      const past = [...state.past, before].slice(-MAX_HISTORY);
      return { past, present: state.present, future: [] };
    }

    const typedAction = action as A;
    const nextPresent = baseReducer(state.present, typedAction);
    if (nextPresent === state.present) return state;

    if (!isUndoable(typedAction)) {
      return { ...state, present: nextPresent };
    }

    const past = [...state.past, state.present].slice(-MAX_HISTORY);
    return { past, present: nextPresent, future: [] };
  };
}
