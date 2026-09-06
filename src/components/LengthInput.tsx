import { displayStep, displayToMm, mmToDisplay, type DisplayUnit } from '../core/units';
import { NumberInput } from './NumberInput';

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
 * 실제 입력창의 편집 중 상태(칸을 비웠을 때 0으로 튀지 않기, Enter/blur에서만 검증, 빈 값/잘못된
 * 값이면 이전 값으로 복원) 는 공용 NumberInput이 처리한다.
 */
export function LengthInput({ id, valueMm, unit, minMm, maxMm, onChangeMm }: LengthInputProps) {
  return (
    <NumberInput
      id={id}
      value={mmToDisplay(valueMm, unit)}
      min={mmToDisplay(minMm, unit)}
      max={mmToDisplay(maxMm, unit)}
      step={displayStep(unit)}
      onCommit={(displayValue) => {
        const mm = displayToMm(displayValue, unit);
        onChangeMm(Math.min(maxMm, Math.max(minMm, mm)));
      }}
    />
  );
}
