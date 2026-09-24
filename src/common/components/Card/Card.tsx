import { useId, type ReactNode } from 'react';
import styles from './Card.module.css';

export interface CardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Card({ title, description, actions, className, children }: CardProps) {
  const titleId = useId();
  return (
    <section
      className={[styles.card, className].filter(Boolean).join(' ')}
      aria-labelledby={title ? titleId : undefined}
    >
      {(title ?? actions) && (
        <div className={styles.header}>
          <div>
            {title && (
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
            )}
            {description && <p className={styles.description}>{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
