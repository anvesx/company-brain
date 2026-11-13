/**
 * Form field with label and error.
 */

import type { FC } from "hono/jsx";

export interface FormFieldProps {
  /** Field label. */
  label: string;
  /** Input name. */
  name: string;
  /** Input type. */
  type?: "text" | "email" | "password" | "url" | "tel";
  /** Current value. */
  value?: string;
  /** Placeholder text. */
  placeholder?: string;
  /** Error message. */
  error?: string;
  /** Required field. */
  required?: boolean;
  /** Autocomplete attribute. */
  autocomplete?: string;
}

/** Form field with label and inline error. */
export const FormField: FC<FormFieldProps> = ({ label, name, type = "text", value, placeholder, error, required, autocomplete }) => {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div class="field">
      <label for={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={errorId}
        required={required}
        autocomplete={autocomplete}
      />
      {error && (
        <p id={errorId} class="field-error">
          {error}
        </p>
      )}
    </div>
  );
};
