import { useId, type ReactNode } from 'react';
import styles from './Field.module.css';

export interface FieldControlProps {
  id: string;
  className: string;
  'aria-describedby'?: string;
}

export interface FieldProps {
  label: string;
  help?: string;
  className?: string;
  /** Recibe id, clase y descripción para el <input>, <select> o <textarea> nativo. */
  children: (control: FieldControlProps) => ReactNode;
}

/** Etiqueta y estilo común para controles nativos (select, textarea, date). */
export function Field({ label, help, className, children }: FieldProps) {
  const id = useId();
  const helpId = `${id}-help`;
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {children({
        id,
        className: styles.control ?? '',
        ...(help ? { 'aria-describedby': helpId } : {}),
      })}
      {help && (
        <small id={helpId} className={styles.help}>
          {help}
        </small>
      )}
    </div>
  );
}
