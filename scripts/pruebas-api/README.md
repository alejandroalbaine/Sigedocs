# Pruebas de humo de la API de usuarios (Python)

Scripts de la biblioteca estándar de Python 3.8+; no requieren instalar nada.

- `probar_usuarios.py`: ejercita `POST /sessions`, `GET /users/current`, `GET /roles`,
  `GET/POST /users`, `PATCH /users/{id}` y `PUT /users/{id}/roles` contra un backend.
- `servidor_simulado.py`: backend **simulado** para probar el script sin el backend real.

```bash
python scripts/pruebas-api/servidor_simulado.py        # terminal 1
python scripts/pruebas-api/probar_usuarios.py --email admin.sistema@uapa.edu.do --password x
```

Contra el backend real: `--base-url http://localhost:3000 --email <cuenta con users.manage> --password '<SEED_PASSWORD>'`.
El script crea un usuario de prueba y lo deja desactivado (el contrato no permite borrar).
