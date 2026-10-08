#!/usr/bin/env python3
"""Crea expedientes de prueba y verifica filtros y paginación por cursor de GET /dossiers.

Ejercita: POST /sessions · POST /dossiers · GET /dossiers (limit, cursor, currentState,
academicLevel, schoolCode, search). Sirve para pasar de 25 expedientes (una página) y
comprobar la paginación de Gestión y Búsqueda contra el backend real.

Solo usa la biblioteca estándar de Python 3.8+ (no hay que instalar nada).

Uso:
  python crear_expedientes.py --base-url http://localhost:3000 \
      --email coord.programa@uapa.edu.do --password '<SEED_PASSWORD>' [--cantidad 30]

La cuenta debe tener dossiers.create. Cada título lleva una marca única de la ejecución. El
contrato no permite borrar expedientes: usar una base de desarrollo/pruebas descartable.
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
            with self.opener.open(req, timeout=15) as resp:
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


def siguiente(cuerpo):
    pag = ((cuerpo or {}).get("meta") or {}).get("pagination") or {}
    return pag.get("next") or pag.get("nextCursor")


def recorrer(c, consulta):
    """Sigue el cursor hasta agotarlo. Devuelve (páginas, expedientes) o None si algo falla."""
    paginas, items, vistos, cursor = 0, [], set(), ""
    while True:
        st, body = c.pedir("GET", "/dossiers", consulta={**consulta, "limit": 25, "cursor": cursor})
        if st != 200:
            return None
        paginas += 1
        items.extend((body or {}).get("data", []))
        cursor = siguiente(body) or ""
        if not cursor:
            return paginas, items
        if cursor in vistos or paginas > 200:
            return None
        vistos.add(cursor)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("--base-url", default="http://localhost:3000", help="origen del backend, sin /api/v1")
    ap.add_argument("--email", required=True)
    ap.add_argument("--password", required=True)
    ap.add_argument("--cantidad", type=int, default=30, help="expedientes a crear (más de 25)")
    ap.add_argument("--school-code", default="ESC-ING")
    ap.add_argument("--program-code", default="ISW")
    a = ap.parse_args()
    c = Cliente(a.base_url)

    st, body = c.pedir("POST", "/sessions", {"email": a.email, "password": a.password, "remember": False})
    if not verificar("Iniciar sesión (POST /sessions)", st in (200, 201), f"{st} {codigo(body)}"):
        print("Sin sesión no se puede continuar.")
        return 1

    st, antes = c.pedir("GET", "/dossiers", consulta={"limit": 1})
    verificar("Consultar expedientes (GET /dossiers)", st == 200, f"{st} {codigo(antes)}")

    marca = time.strftime("%Y%m%d%H%M%S")
    creados = {"associate": 0, "bachelor": 0}
    for i in range(a.cantidad):
        nivel = "associate" if i % 3 == 0 else "bachelor"
        st, body = c.pedir("POST", "/dossiers", {
            "title": f"Prueba paginación {marca} #{i + 1:02d}",
            "academicLevel": nivel,
            "schoolCode": a.school_code,
            "degreeProgramCode": a.program_code,
            "subjectCode": f"PAG-{marca[-6:]}-{i + 1:02d}",
        })
        if st == 201:
            creados[nivel] += 1
        else:
            verificar(f"Crear expediente {i + 1} (POST /dossiers)", False, f"{st} {codigo(body)}")
            return 1
    verificar(f"Crear {a.cantidad} expedientes (POST /dossiers)", sum(creados.values()) == a.cantidad)

    # Paginación: con más de 25 expedientes debe haber más de una página.
    todo = recorrer(c, {})
    if not verificar("Recorrer GET /dossiers con el cursor hasta agotarlo", todo is not None):
        return 1
    paginas, items = todo
    ids = [d["dossierId"] for d in items]
    verificar("Hay más de una página (más de 25 expedientes visibles)", paginas > 1 and len(items) > 25, f"{paginas} páginas, {len(items)} expedientes")
    verificar("El cursor no repite expedientes entre páginas", len(ids) == len(set(ids)), f"{len(ids)} vs {len(set(ids))}")
    propios = [d for d in items if marca in d["title"]]
    verificar("Aparecen todos los expedientes creados", len(propios) == a.cantidad, f"{len(propios)} de {a.cantidad}")

    st, body = c.pedir("GET", "/dossiers", consulta={"limit": 25})
    verificar("La primera página trae 25 y un cursor siguiente",
              st == 200 and len((body or {}).get("data", [])) == 25 and bool(siguiente(body)), st)

    # Filtros del servidor.
    for nivel in ("associate", "bachelor"):
        res = recorrer(c, {"academicLevel": nivel})
        verificar(f"Filtrar academicLevel={nivel}",
                  res is not None and res[1] and all(d["academicLevel"] == nivel for d in res[1]),
                  None if res is None else {d["academicLevel"] for d in res[1]})
        if res:
            n = sum(1 for d in res[1] if marca in d["title"])
            verificar(f"  · conserva los {creados[nivel]} creados de nivel {nivel}", n == creados[nivel], n)
    estado = propios[0]["currentState"]["code"] if propios else "RECEIVED"
    res = recorrer(c, {"currentState": estado})
    verificar(f"Filtrar currentState={estado}",
              res is not None and res[1] and all(d["currentState"]["code"] == estado for d in res[1]))
    res = recorrer(c, {"currentState": "ESTADO_INEXISTENTE"})
    verificar("Un estado inexistente no devuelve expedientes (o se rechaza)",
              res is None or res[1] == [])
    res = recorrer(c, {"schoolCode": a.school_code})
    verificar(f"Filtrar schoolCode={a.school_code}",
              res is not None and res[1] and all(d["schoolCode"] == a.school_code for d in res[1]))
    res = recorrer(c, {"search": marca})
    verificar("Buscar por la marca de la ejecución (search)",
              res is not None and len(res[1]) == a.cantidad, None if res is None else len(res[1]))
    res = recorrer(c, {"search": marca, "academicLevel": "associate"})
    verificar("Combinar search + academicLevel",
              res is not None and len(res[1]) == creados["associate"], None if res is None else len(res[1]))

    fallos = resultados.count(False)
    print(f"\n{len(resultados) - fallos} de {len(resultados)} comprobaciones correctas.")
    return 0 if fallos == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
