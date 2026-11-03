import {
  INTERVIEW_DIFFICULTIES,
  INTERVIEW_DIFFICULTY_HINT,
  INTERVIEW_DIFFICULTY_LABEL,
  type InterviewDifficulty,
} from "@/lib/api";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/input";

/** 면접 난이도 선택. **순수 UI** — 값과 콜백만 받습니다. */
export function DifficultySelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: InterviewDifficulty;
  onChange: (difficulty: InterviewDifficulty) => void;
  disabled?: boolean;
}) {
  return (
    <Field label="난이도" htmlFor={id} hint={INTERVIEW_DIFFICULTY_HINT[value]}>
      <Select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value as InterviewDifficulty)
        }
      >
        {INTERVIEW_DIFFICULTIES.map((difficulty) => (
          <option key={difficulty} value={difficulty}>
            {INTERVIEW_DIFFICULTY_LABEL[difficulty]}
          </option>
        ))}
      </Select>
    </Field>
  );
}
