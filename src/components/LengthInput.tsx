import { displayStep, displayToMm, mmToDisplay, type DisplayUnit } from '../core/units';

interface LengthInputProps {
  id: string;
  valueMm: number;
  unit: DisplayUnit;
  minMm: number;
  maxMm: number;
  onChangeMm: (mm: number) => void;
}

/**
 * mm로 저장되는 길이값을 현재 표시 단위(mm/cm/m)로 보여주고, 입력값도 같은 단위로 해석해
 * 다시 mm로 변환해 저장한다. 내부 데이터는 항상 mm — 이 컴포넌트는 표시/입력 변환만 담당한다.
 */
export function LengthInput({ id, valueMm, unit, minMm, maxMm, onChangeMm }: LengthInputProps) {
  return (
    <input
      id={id}
      type="number"
      step={displayStep(unit)}
      min={mmToDisplay(minMm, unit)}
      max={mmToDisplay(maxMm, unit)}
      value={mmToDisplay(valueMm, unit)}
      onChange={(e) => {
        const raw = Number(e.target.value);
        if (!Number.isFinite(raw)) return;
        const mm = displayToMm(raw, unit);
        onChangeMm(Math.min(maxMm, Math.max(minMm, mm)));
      }}
    />
  );
}
