import {
  DOCUMENT_KIND_LABEL,
  DOCUMENT_KINDS,
  type DocumentKind,
} from "@/lib/api";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/input";

/** 이력서/자소서 선택. **순수 UI** — 값과 콜백만 받습니다. */
export function KindSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: DocumentKind;
  onChange: (kind: DocumentKind) => void;
  disabled?: boolean;
}) {
  return (
    <Field label="종류" htmlFor={id}>
      <Select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as DocumentKind)}
      >
        {DOCUMENT_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {DOCUMENT_KIND_LABEL[kind]}
          </option>
        ))}
      </Select>
    </Field>
  );
}
