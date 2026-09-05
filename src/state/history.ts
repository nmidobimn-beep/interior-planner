/**
 * 어떤 reducer에도 씌울 수 있는 범용 Undo/Redo 래퍼.
 * "선택 상태 변경"처럼 되돌릴 필요 없는 액션은 isUndoable에서 false를 반환해
 * 히스토리에 쌓이지 않도록(Ctrl+Z 한 번에 선택만 풀리는 등 불필요한 되돌리기 방지) 걸러낸다.
 */
export interface HistoryState<S> {
  past: S[];
  present: S;
  future: S[];
}

export const UNDO = { type: '@@history/UNDO' } as const;
export const REDO = { type: '@@history/REDO' } as const;

export type HistoryAction<A> = A | typeof UNDO | typeof REDO;

const MAX_HISTORY = 100;

export function createHistoryReducer<S, A extends { type: string }>(
  baseReducer: (state: S, action: A) => S,
  isUndoable: (action: A) => boolean,
) {
  return function historyReducer(state: HistoryState<S>, action: HistoryAction<A>): HistoryState<S> {
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
