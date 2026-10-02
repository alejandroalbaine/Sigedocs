#!/usr/bin/env python3
"""Prueba de humo de Usuarios y roles contra el backend de SIGESDOC.

Ejercita los endpoints del contrato (contratos/endpoints.md, sección 2):
  POST /sessions · GET /users/current · GET /roles · GET/POST /users
  PATCH /users/{id} · PUT /users/{id}/roles

Solo usa la biblioteca estándar de Python 3.8+ (no hay que instalar nada).

Uso:
  python probar_usuarios.py --base-url http://localhost:3000 \
      --email admin.sistema@uapa.edu.do --password '<SEED_PASSWORD>'

La cuenta debe tener el permiso users.manage. El script crea un usuario de prueba
(correo único con la hora) y al final lo deja desactivado: el contrato no permite borrar.
Sale con código 0 si todo pasa y 1 si algo falla.
"""
import argparse
import http.cookiejar
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

resultados = []


class Cliente:
    def __init__(self, base_url):
        self.base = base_url.rstrip("/") + "/api/v1"
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )

    def pedir(self, metodo, ruta, cuerpo=None, consulta=None):
        url = self.base + ruta
        if consulta:
            url += "?" + urllib.parse.urlencode({k: v for k, v in consulta.items() if v != ""})
        datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
        req = urllib.request.Request(url, data=datos, method=metodo)
        req.add_header("Accept", "application/json, application/problem+json")
        if datos is not None:
            req.add_header("Content-Type", "application/json")
        try:
            with self.opener.open(req, timeout=10) as resp:
                crudo = resp.read()
                return resp.status, (json.loads(crudo) if crudo else None)
        except urllib.error.HTTPError as err:
            crudo = err.read()
            try:
                return err.code, json.loads(crudo) if crudo else None
            except ValueError:
                return err.code, None


def verificar(nombre, condicion, detalle=""):
    resultados.append(bool(condicion))
    marca = "OK   " if condicion else "FALLA"
    print(f"[{marca}] {nombre}" + (f"  -> {detalle}" if detalle and not condicion else ""))
    return bool(condicion)


def codigo(cuerpo):
    return (cuerpo or {}).get("code") or (cuerpo or {}).get("codigo")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("--base-url", default="http://localhost:3000", help="origen del backend, sin /api/v1")
    ap.add_argument("--email", required=True)
    ap.add_argument("--password", required=True)
    a = ap.parse_args()
    c = Cliente(a.base_url)

    # 1. Sesión
    st, body = c.pedir("POST", "/sessions", {"email": a.email, "password": a.password, "remember": False})
    if not verificar("Iniciar sesión (POST /sessions)", st in (200, 201), f"{st} {codigo(body)}"):
        print("Sin sesión no se puede continuar.")
        return 1
    st, body = c.pedir("GET", "/users/current")
    yo = (body or {}).get("data", {}).get("user", {})
    verificar("Identidad actual (GET /users/current)", st == 200 and yo.get("userId"), st)
    perms = yo.get("permissions", [])
    verificar("La cuenta tiene users.manage", "users.manage" in perms or "usuarios.administrar" in perms, perms)

    # 2. Roles
    st, body = c.pedir("GET", "/roles")
    roles = (body or {}).get("data", [])
    verificar("Listar roles (GET /roles)", st == 200 and len(roles) > 0, st)
    cod = lambda r: r.get("code") or r.get("codigo")
    rol_a = next((cod(r) for r in roles if cod(r) not in ("SCHOOL_DIRECTOR",)), None)
    rol_b = next((cod(r) for r in roles if cod(r) not in ("SCHOOL_DIRECTOR", rol_a)), None)

    # 3. Listar y filtrar
    st, body = c.pedir("GET", "/users", consulta={"limit": 25})
    lista = (body or {}).get("data", [])
    verificar("Listar usuarios (GET /users?limit=25)", st == 200 and isinstance(lista, list), st)
    forma = lista[0] if lista else {}
    verificar("Cada usuario trae userId, name, email, isActive y roles",
              all(k in forma for k in ("userId", "name", "email", "isActive", "roles")) if lista else True,
              sorted(forma))
    st, body = c.pedir("GET", "/users", consulta={"isActive": "true", "limit": 25})
    verificar("Filtrar activos (isActive=true)", st == 200 and all(u["isActive"] for u in (body or {}).get("data", [])), st)
    st, body = c.pedir("GET", "/users", consulta={"isActive": "false", "limit": 25})
    verificar("Filtrar inactivos (isActive=false)", st == 200 and not any(u["isActive"] for u in (body or {}).get("data", [])), st)
    if rol_a:
        st, body = c.pedir("GET", "/users", consulta={"roleCode": rol_a, "limit": 25})
        verificar(f"Filtrar por rol (roleCode={rol_a})", st == 200, st)
    st, body = c.pedir("GET", "/users", consulta={"search": "zzz-no-existe-zzz", "limit": 25})
    verificar("Buscar sin coincidencias devuelve lista vacía", st == 200 and (body or {}).get("data") == [], st)

    # 4. Crear
    sufijo = time.strftime("%Y%m%d%H%M%S")
    correo = f"prueba.{sufijo}@uapa.edu.do"
    nuevo = {"name": f"Prueba Automática {sufijo}", "email": correo, "password": "ClaveSegura1!", "roleCodes": [rol_a]}
    st, body = c.pedir("POST", "/users", nuevo)
    creado = (body or {}).get("data", {})
    ok = verificar("Crear usuario (POST /users)", st == 201 and creado.get("userId"), f"{st} {codigo(body)}")
    if not ok:
        return 1
    uid = creado["userId"]
    verificar("El usuario creado queda activo y con su rol",
              creado.get("isActive") is True and any(cod(r) == rol_a for r in creado.get("roles", [])), creado)
    st, body = c.pedir("POST", "/users", nuevo)
    verificar("Correo duplicado -> 409", st == 409, f"{st} {codigo(body)}")
    st, body = c.pedir("POST", "/users", {**nuevo, "email": "x" + correo, "roleCodes": ["SCHOOL_DIRECTOR"]})
    verificar("SCHOOL_DIRECTOR sin schoolCode -> 422/400", st in (400, 422), f"{st} {codigo(body)}")
    st, body = c.pedir("GET", f"/users/{uid}")
    verificar("Consultar un usuario (GET /users/{id})", st == 200 and (body or {}).get("data", {}).get("email") == correo, st)

    # 5. Editar, desactivar, activar
    st, body = c.pedir("PATCH", f"/users/{uid}", {"name": "Prueba Editada"})
    verificar("Editar nombre (PATCH)", st == 200 and (body or {}).get("data", {}).get("name") == "Prueba Editada", f"{st} {codigo(body)}")
    st, body = c.pedir("PATCH", f"/users/{uid}", {"isActive": False})
    verificar("Desactivar (PATCH isActive=false)", st == 200 and (body or {}).get("data", {}).get("isActive") is False, f"{st} {codigo(body)}")
    st, body = c.pedir("PATCH", f"/users/{uid}", {"isActive": True})
    verificar("Activar (PATCH isActive=true)", st == 200 and (body or {}).get("data", {}).get("isActive") is True, f"{st} {codigo(body)}")

    # 6. Roles
    if rol_b:
        st, body = c.pedir("PUT", f"/users/{uid}/roles", {"roleCodes": [rol_a, rol_b]})
        codes = sorted(cod(r) for r in (body or {}).get("data", {}).get("roles", []))
        verificar("Asignar roles (PUT /users/{id}/roles)", st == 200 and codes == sorted([rol_a, rol_b]), f"{st} {codes}")
        st, body = c.pedir("GET", f"/users/{uid}/roles")
        verificar("Consultar roles del usuario (GET /users/{id}/roles)", st == 200, st)
    if yo.get("userId"):
        st, body = c.pedir("PUT", f"/users/{yo['userId']}/roles", {"roleCodes": [rol_a]})
        verificar("Cambiarse los propios roles -> 403", st == 403, f"{st} {codigo(body)}")

    # 7. Limpieza: el contrato no permite borrar, se deja desactivado.
    st, _ = c.pedir("PATCH", f"/users/{uid}", {"isActive": False})
    verificar("Limpieza: usuario de prueba desactivado", st == 200, st)

    fallos = resultados.count(False)
    print(f"\n{len(resultados) - fallos} de {len(resultados)} comprobaciones correctas.")
    return 0 if fallos == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
