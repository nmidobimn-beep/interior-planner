import { useState } from 'react';
import './App.css';
import { FurnitureForm } from './components/FurnitureForm';
import { useCloudFurnitureLibrary } from './hooks/useCloudFurnitureLibrary';

/**
 * 모바일 전용 화면 — 평면도 편집 기능은 없다. 목적은 현장에서 가구를 실측해 빠르게
 * 공용 가구 라이브러리(Cloudflare D1)에 저장하는 것뿐이다. 프로젝트 선택은 필요 없다 —
 * 가구는 특정 도면이 아니라 공용 라이브러리에 저장되기 때문이다.
 */
export function MobileFurnitureApp() {
  const { items, status, errorMessage, create, update, remove } = useCloudFurnitureLibrary();
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="mobile-app">
      <div className="mobile-app-title">가구 실측 등록</div>
      <div className="mobile-app-subtitle">이름, 색상, 가로×세로를 입력하고 저장하면 공용 가구 목록에 즉시 추가됩니다.</div>

      <FurnitureForm submitLabel="저장" onSubmit={async (values) => { await create(values); }} />

      <div className="mobile-app-section-title">공용 가구 목록 {status === 'loading' && '(불러오는 중...)'}</div>
      {status === 'error' && errorMessage && <div className="project-panel-status is-error">{errorMessage}</div>}
      {items.length === 0 && status !== 'loading' && <div className="side-panel-placeholder">아직 등록된 가구가 없습니다.</div>}

      <ul className="mobile-furniture-list">
        {items.map((item) =>
          editingId === item.id ? (
            <li key={item.id} className="mobile-furniture-card" style={{ display: 'block' }}>
              <FurnitureForm
                submitLabel="수정 완료"
                initial={{
                  name: item.name,
                  color: item.color ?? undefined,
                  width: item.width,
                  height: item.height,
                  shape_type: item.shape_type,
                  memo: item.memo ?? undefined,
                }}
                onSubmit={async (values) => {
                  await update(item.id, values);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={item.id} className="mobile-furniture-card">
              <span className="mobile-furniture-card-swatch" style={{ backgroundColor: item.color ?? '#d6862f' }} aria-hidden="true" />
              <div className="mobile-furniture-card-info">
                <div className="mobile-furniture-card-name">{item.name}</div>
                <div className="mobile-furniture-card-size">
                  {item.width} × {item.height} mm
                </div>
              </div>
              <div className="mobile-furniture-card-actions">
                <button type="button" className="project-panel-item-icon" onClick={() => setEditingId(item.id)} title="수정">
                  ✎
                </button>
                <button type="button" className="project-panel-item-icon" onClick={() => remove(item.id)} title="삭제">
                  ×
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
