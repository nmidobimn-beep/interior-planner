import { useState } from 'react';
import type { CloudFurnitureItem } from '../types/cloudFurniture';
import type { UseCloudFurnitureLibraryResult } from '../hooks/useCloudFurnitureLibrary';
import { FurnitureForm } from './FurnitureForm';

interface CloudFurnitureLibraryPanelProps {
  library: UseCloudFurnitureLibraryResult;
  onPlace: (item: CloudFurnitureItem) => void;
}

/**
 * Cloudflare D1에 저장된 공용 가구 라이브러리. 도면 프로젝트와 무관하게 항상 같은 목록을
 * 보여준다 — 모바일에서 실측 등록한 가구도 여기서 "새로고침"하면 바로 보인다.
 */
export function CloudFurnitureLibraryPanel({ library, onPlace }: CloudFurnitureLibraryPanelProps) {
  const { items, status, errorMessage, refresh, create, update, remove } = library;
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSearch = (value: string) => {
    setQuery(value);
    refresh(value || undefined);
  };

  return (
    <>
      <div className="side-panel-title">공용 가구 라이브러리 (클라우드)</div>
      <input
        className="cloud-library-search"
        type="search"
        placeholder="가구 검색"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
      />

      {status === 'error' && <div className="project-panel-status is-error">{errorMessage}</div>}

      {items.length === 0 && status !== 'loading' && (
        <div className="side-panel-placeholder">등록된 가구가 없습니다. 모바일에서 실측 등록하거나 아래에서 추가하세요.</div>
      )}

      <ul className="library-item-list">
        {items.map((item) =>
          editingId === item.id ? (
            <li key={item.id} className="library-item" style={{ display: 'block' }}>
              <FurnitureForm
                submitLabel="수정 완료"
                initial={{ name: item.name, color: item.color ?? undefined, width: item.width, height: item.height, shape_type: item.shape_type, memo: item.memo ?? undefined }}
                onSubmit={async (values) => {
                  await update(item.id, values);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={item.id} className="library-item">
              <button type="button" className="library-item-button" onClick={() => onPlace(item)} title={`클릭해서 "${item.name}" 현재 도면에 배치`}>
                <span className="library-item-swatch" style={{ backgroundColor: item.color ?? '#d6862f' }} aria-hidden="true" />
                {item.name} ({item.width}×{item.height})
              </button>
              <button type="button" className="library-item-delete" onClick={() => setEditingId(item.id)} title="수정" aria-label={`${item.name} 수정`}>
                ✎
              </button>
              <button
                type="button"
                className="library-item-delete"
                onClick={() => remove(item.id)}
                title="라이브러리에서 삭제(배치된 객체는 유지됨)"
                aria-label={`${item.name} 삭제`}
              >
                ×
              </button>
            </li>
          ),
        )}
      </ul>

      {adding ? (
        <FurnitureForm
          submitLabel="추가"
          onSubmit={async (values) => {
            await create(values);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button type="button" className="secondary-button" style={{ marginTop: 8, width: '100%' }} onClick={() => setAdding(true)}>
          + 가구 추가
        </button>
      )}
    </>
  );
}
