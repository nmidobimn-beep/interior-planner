import { useState } from 'react';
import type { FurnitureLibraryItem } from '../types/furnitureLibrary';
import type { UseFurnitureLibraryResult } from '../hooks/useFurnitureLibrary';

interface FurnitureLibraryPanelProps {
  furnitureLibrary: UseFurnitureLibraryResult;
  onPlace: (item: FurnitureLibraryItem) => void;
}

/** 카테고리(집/방 등 사용자가 정한 이름)별로 묶어서 보여준다(입력 순서 유지). 카테고리가 없으면 "기타"로 묶인다. */
function groupByCategory(items: FurnitureLibraryItem[]): Map<string, FurnitureLibraryItem[]> {
  const groups = new Map<string, FurnitureLibraryItem[]>();
  for (const item of items) {
    const list = groups.get(item.category);
    if (list) list.push(item);
    else groups.set(item.category, [item]);
  }
  return groups;
}

/** 폴더(카테고리) 접힘 상태 — 도면 자동 저장과는 별개로, 브라우저에 그대로 남아있다. */
const COLLAPSED_CATEGORIES_STORAGE_KEY = 'interior-planner:furniture-library-collapsed';

function loadCollapsedCategories(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSED_CATEGORIES_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

function saveCollapsedCategories(collapsed: Set<string>): void {
  try {
    localStorage.setItem(COLLAPSED_CATEGORIES_STORAGE_KEY, JSON.stringify([...collapsed]));
  } catch {
    // localStorage를 쓸 수 없는 환경(프라이빗 모드 등)에서는 조용히 무시한다.
  }
}

/**
 * 왼쪽 도구 패널 아래 붙는 가구 라이브러리. 저장된 가구/다각형을 카테고리(집/방 등)별로
 * 접었다 펼 수 있는 폴더 형태로 보여주고, 항목을 클릭하면 현재 평면도에 새 독립 객체로
 * 추가한다(원본은 그대로 유지 — "가구로 저장"으로 만든 스냅샷과 평면도의 실제 객체는 서로
 * 연결되지 않는다). 폴더별로 나눠 보여주면 항목이 많아져도 한 번에 다 나열되지 않아 구분하기
 * 쉽다 — 어떤 폴더를 열어뒀는지는 브라우저에 기억된다.
 */
export function FurnitureLibraryPanel({ furnitureLibrary, onPlace }: FurnitureLibraryPanelProps) {
  const { library, deleteFromLibrary } = furnitureLibrary;
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsedCategories);

  const toggleCategory = (category: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      saveCollapsedCategories(next);
      return next;
    });
  };

  if (library.length === 0) {
    return (
      <>
        <div className="side-panel-title">가구 라이브러리</div>
        <div className="side-panel-placeholder">
          가구나 다각형을 선택한 뒤 속성 패널의 "가구로 저장" 버튼을 누르면 여기에 쌓입니다. 저장할 때
          분류(예: "안방", "거실")를 정하면 그 이름의 폴더로 묶여서 보입니다.
        </div>
      </>
    );
  }

  const groups = groupByCategory(library);

  return (
    <>
      <div className="side-panel-title">가구 라이브러리</div>
      {[...groups.entries()].map(([category, items]) => {
        const isOpen = !collapsed.has(category);
        return (
          <div key={category} className="library-category">
            <button
              type="button"
              className="library-category-header"
              onClick={() => toggleCategory(category)}
              aria-expanded={isOpen}
            >
              <span className={`library-category-chevron${isOpen ? ' is-open' : ''}`} aria-hidden="true">
                ▸
              </span>
              <span className="library-category-title">{category}</span>
              <span className="library-category-count">{items.length}</span>
            </button>
            {isOpen && (
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
            )}
          </div>
        );
      })}
    </>
  );
}
