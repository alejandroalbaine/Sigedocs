# Base de datos inicial de SIGESDOC

## Propósito

La base inicial cubre únicamente autenticación, perfil básico y trazabilidad del acceso. No modela todavía expedientes curriculares, documentos, versiones ni workflows.

## Tabla users

| Columna | Tipo | Regla |
|---|---|---|
| `id` | UUID | Clave primaria generada por PostgreSQL |
| `email` | VARCHAR(180) | Único, obligatorio y almacenado en minúsculas |
| `password_hash` | VARCHAR(255) | Hash bcrypt; nunca contraseña en texto plano |
| `full_name` | VARCHAR(160) | Nombre mostrado en la interfaz |
| `role` | VARCHAR(80) | Uno de los cuatro roles iniciales |
| `is_active` | BOOLEAN | Bloquea autenticación sin eliminar el usuario |
| `profile` | JSONB | Objeto de atributos variables como unidad e iniciales |
| `last_login_at` | TIMESTAMPTZ | Último acceso correcto |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Actualizada automáticamente por trigger |

Ejemplo de `profile`:

```json
{
  "unit": "Archivo Central",
  "initials": "MP",
  "permissions": ["expedientes:consultar", "trazabilidad:consultar"]
}
```

`JSONB` no sustituye relaciones. En esta fase temporal contiene atributos de
perfil y permisos efectivos. Cuando Backend entregue su modelo definitivo, los
permisos deberán proceder de sus relaciones de autorización y no inferirse del rol.

## Tabla auth_events

| Columna | Tipo | Regla |
|---|---|---|
| `id` | BIGSERIAL | Clave primaria secuencial |
| `user_id` | UUID | Referencia opcional a `users` |
| `attempted_email` | VARCHAR(180) | Correo usado en el intento |
| `event_type` | VARCHAR(30) | `login_success`, `login_failure` o `logout` |
| `ip_address` | INET | Dirección observada por el servidor |
| `user_agent` | VARCHAR(500) | Cliente declarado, limitado a 500 caracteres |
| `event_data` | JSONB | Objeto reservado para metadatos no sensibles |
| `occurred_at` | TIMESTAMPTZ | Momento del evento |

La tabla no debe almacenar contraseñas, cookies, JWT ni secretos. La retención y el acceso a estos eventos deben acordarse con seguridad, asuntos jurídicos y archivo institucional antes de producción.

## Índices

- `users.email`: índice único implícito para autenticación.
- `users_active_role_idx`: consulta de usuarios activos por rol.
- `auth_events_user_time_idx`: historial reciente por usuario.
- `auth_events_type_time_idx`: análisis por tipo y fecha.

No se añadió un índice GIN a los campos JSONB porque el sistema todavía no ejecuta filtros sobre ellos. Deberá agregarse únicamente cuando una consulta real y su plan de ejecución lo justifiquen.

## Integridad y concurrencia

- El correo es único y debe permanecer en minúsculas.
- Los objetos JSONB se validan como objetos, no listas ni valores escalares.
- El registro del último acceso y su evento de auditoría se ejecutan dentro de una transacción.
- La inicialización utiliza `ON CONFLICT DO NOTHING` para no sobrescribir contraseñas ni cuentas existentes.

## Próxima evolución

Cuando se incorporen permisos y módulos, separar `role` en tablas `roles`, `permissions`, `user_roles` y `role_permissions`. La decisión debe basarse en la matriz institucional de roles y permisos aprobada, no en supuestos del equipo técnico.
