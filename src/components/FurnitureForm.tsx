import { useState } from 'react';
import type { CloudFurnitureInput } from '../types/cloudFurniture';

const SHAPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'rectangle', label: '사각형' },
  { value: 'circle', label: '원형' },
  { value: 'lshape', label: 'ㄱ자형' },
];

interface FurnitureFormProps {
  initial?: Partial<CloudFurnitureInput>;
  submitLabel: string;
  onSubmit: (input: CloudFurnitureInput) => void | Promise<void>;
  onCancel?: () => void;
}

/** 가구 실측 등록/수정 공용 폼 — 모바일 등록 화면과 PC 가구 라이브러리 패널이 함께 쓴다. */
export function FurnitureForm({ initial, submitLabel, onSubmit, onCancel }: FurnitureFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? '#2f9e6f');
  const [width, setWidth] = useState(String(initial?.width ?? ''));
  const [height, setHeight] = useState(String(initial?.height ?? ''));
  const [shapeType, setShapeType] = useState(initial?.shape_type ?? 'rectangle');
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [saving, setSaving] = useState(false);

  const widthMm = parseFloat(width);
  const heightMm = parseFloat(height);
  const canSubmit = name.trim().length > 0 && widthMm > 0 && heightMm > 0 && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), color, width: widthMm, height: heightMm, shape_type: shapeType, memo: memo.trim() || undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="furniture-form" onSubmit={handleSubmit}>
      <div className="field-row">
        <label htmlFor="furniture-form-name">이름</label>
        <input id="furniture-form-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 침대" />
      </div>
      <div className="field-row">
        <label htmlFor="furniture-form-color">색상</label>
        <input id="furniture-form-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      </div>
      <div className="field-row">
        <label htmlFor="furniture-form-width">가로(mm)</label>
        <input id="furniture-form-width" type="number" min="1" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="1600" />
      </div>
      <div className="field-row">
        <label htmlFor="furniture-form-height">세로(mm)</label>
        <input id="furniture-form-height" type="number" min="1" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="2000" />
      </div>
      <div className="field-row">
        <label htmlFor="furniture-form-shape">도형 종류</label>
        <select id="furniture-form-shape" value={shapeType} onChange={(e) => setShapeType(e.target.value)}>
          {SHAPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field-row field-row--stacked">
        <label htmlFor="furniture-form-memo">메모</label>
        <textarea id="furniture-form-memo" rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>
      <div className="furniture-form-actions">
        {onCancel && (
          <button type="button" className="secondary-button" onClick={onCancel}>
            취소
          </button>
        )}
        <button type="submit" className="primary-button" disabled={!canSubmit}>
          {saving ? '저장 중...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
