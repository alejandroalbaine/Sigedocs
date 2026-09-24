import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import styles from './TextField.module.css';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  icon?: ReactNode;
  /** Botón dentro del campo, p. ej. mostrar u ocultar la contraseña. */
  action?: ReactNode;
  help?: string | undefined;
  error?: string | undefined;
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

export function TextField({
  label,
  icon,
  action,
  help,
  error,
  invalid = false,
  ref,
  ...inputProps
}: TextFieldProps) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;
  const isInvalid = invalid || Boolean(error);

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={[styles.control, isInvalid ? styles.invalid : ''].join(' ')}>
        {icon && (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          className={styles.input}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          {...inputProps}
        />
        {action}
      </div>
      {help && (
        <small id={helpId} className={styles.help}>
          {help}
        </small>
      )}
      {error && (
        <small id={errorId} className={styles.error}>
          {error}
        </small>
      )}
    </div>
  );
}
