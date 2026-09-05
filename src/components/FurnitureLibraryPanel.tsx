import type { FurnitureLibraryItem } from '../types/furnitureLibrary';
import type { UseFurnitureLibraryResult } from '../hooks/useFurnitureLibrary';

interface FurnitureLibraryPanelProps {
  furnitureLibrary: UseFurnitureLibraryResult;
  onPlace: (item: FurnitureLibraryItem) => void;
}

/** 카테고리별로 묶어서 보여준다(입력 순서 유지). 카테고리가 없으면 "기타"로 묶인다. */
function groupByCategory(items: FurnitureLibraryItem[]): Map<string, FurnitureLibraryItem[]> {
  const groups = new Map<string, FurnitureLibraryItem[]>();
  for (const item of items) {
    const list = groups.get(item.category);
    if (list) list.push(item);
    else groups.set(item.category, [item]);
  }
  return groups;
}

/**
 * 왼쪽 도구 패널 아래 붙는 가구 라이브러리. 저장된 가구/다각형을 카테고리별로 보여주고,
 * 클릭하면 현재 평면도에 새 독립 객체로 추가한다(원본은 그대로 유지 — "가구로 저장"으로
 * 만든 스냅샷과 평면도의 실제 객체는 서로 연결되지 않는다).
 */
export function FurnitureLibraryPanel({ furnitureLibrary, onPlace }: FurnitureLibraryPanelProps) {
  const { library, deleteFromLibrary } = furnitureLibrary;

  if (library.length === 0) {
    return (
      <>
        <div className="side-panel-title">가구 라이브러리</div>
        <div className="side-panel-placeholder">
          가구나 다각형을 선택한 뒤 속성 패널의 "가구로 저장" 버튼을 누르면 여기에 쌓입니다.
        </div>
      </>
    );
  }

  const groups = groupByCategory(library);

  return (
    <>
      <div className="side-panel-title">가구 라이브러리</div>
      {[...groups.entries()].map(([category, items]) => (
        <div key={category} className="library-category">
          <div className="library-category-title">{category}</div>
          <ul className="library-item-list">
            {items.map((item) => (
              <li key={item.id} className="library-item">
                <button type="button" className="library-item-button" onClick={() => onPlace(item)} title={`클릭해서 "${item.name}" 배치`}>
                  <span
                    className="library-item-swatch"
                    style={{ backgroundColor: item.color ?? '#d6862f' }}
                    aria-hidden="true"
                  />
                  {item.name}
                </button>
                <button
                  type="button"
                  className="library-item-delete"
                  onClick={() => deleteFromLibrary(item.id)}
                  title="라이브러리에서 삭제"
                  aria-label={`${item.name} 삭제`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
