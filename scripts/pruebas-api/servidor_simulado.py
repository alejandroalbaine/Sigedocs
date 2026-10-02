#!/usr/bin/env python3
"""Backend SIMULADO de SIGESDOC (solo para probar probar_usuarios.py sin el backend real).

  python servidor_simulado.py          # escucha en http://localhost:3000
  python probar_usuarios.py --email admin.sistema@uapa.edu.do --password cualquiera
"""
import json, re, uuid
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

R = [{"roleId": "r1", "code": "ADMIN_SISTEMA", "name": "Administrador del sistema"},
     {"roleId": "r2", "code": "ESPECIALISTA_CURRICULAR", "name": "Especialista curricular"},
     {"roleId": "r3", "code": "VRA", "name": "Vicerrectoría Académica"},
     {"roleId": "r4", "code": "SCHOOL_DIRECTOR", "name": "Director de escuela"}]
YO = str(uuid.uuid4())
U = {YO: {"userId": YO, "name": "Admin del Sistema", "email": "admin.sistema@uapa.edu.do", "isActive": True,
          "schoolCode": None, "roles": [R[0]], "createdAt": "2026-09-25T14:00:00Z"}}
roles_de = lambda codes: [r for r in R if r["code"] in codes]


class H(BaseHTTPRequestHandler):
    def responder(self, st, data=None, problema=None):
        cuerpo = json.dumps(problema if problema else {"data": data}).encode() if (problema or data is not None) else b""
        self.send_response(st)
        self.send_header("Content-Type", "application/problem+json" if problema else "application/json")
        self.send_header("Set-Cookie", "sid=1; Path=/; HttpOnly")
        self.end_headers(); self.wfile.write(cuerpo)

    def manejar(self, m):
        u = urlparse(self.path); p = u.path.replace("/api/v1", ""); q = parse_qs(u.query)
        n = int(self.headers.get("Content-Length") or 0)
        b = json.loads(self.rfile.read(n)) if n else {}
        if p == "/sessions" and m == "POST":
            return self.responder(200, {"sessionState": "active", "expiresAt": "2026-12-31T00:00:00Z", "user": self.yo()})
        if p == "/users/current": return self.responder(200, {"user": self.yo()})
        if p == "/roles": return self.responder(200, R)
        if p == "/users" and m == "GET":
            s = q.get("search", [""])[0].lower(); a = q.get("isActive", [""])[0]; rc = q.get("roleCode", [""])[0]
            l = [x for x in U.values() if (not s or s in (x["name"] + x["email"]).lower())
                 and (not a or str(x["isActive"]).lower() == a) and (not rc or any(r["code"] == rc for r in x["roles"]))]
            return self.responder(200, l)
        if p == "/users" and m == "POST":
            if any(x["email"] == b.get("email") for x in U.values()): return self.responder(409, problema={"code": "CONFLICT"})
            if "SCHOOL_DIRECTOR" in b.get("roleCodes", []) and not b.get("schoolCode"):
                return self.responder(422, problema={"code": "VALIDATION_FAILED", "errors": [{"field": "schoolCode", "code": "REQUIRED"}]})
            i = str(uuid.uuid4())
            U[i] = {"userId": i, "name": b["name"], "email": b["email"], "isActive": True, "schoolCode": b.get("schoolCode"),
                    "roles": roles_de(b["roleCodes"]), "createdAt": "2026-10-02T00:00:00Z"}
            return self.responder(201, U[i])
        mm = re.match(r"^/users/([^/]+)(/roles)?$", p)
        if mm and mm[1] in U:
            x = U[mm[1]]
            if mm[2] and m == "GET": return self.responder(200, x["roles"])
            if mm[2] and m == "PUT":
                if x["userId"] == YO: return self.responder(403, problema={"code": "FORBIDDEN"})
                x["roles"] = roles_de(b["roleCodes"])
            if not mm[2] and m == "PATCH": x.update({k: v for k, v in b.items() if k in ("name", "isActive", "schoolCode")})
            return self.responder(200, x)
        return self.responder(404, problema={"code": "NOT_FOUND"})

    def yo(self):
        return {"userId": YO, "name": "Admin del Sistema", "email": "admin.sistema@uapa.edu.do", "unit": None,
                "roles": ["ADMIN_SISTEMA"], "permissions": ["users.manage", "roles.manage"]}

    do_GET = lambda s: s.manejar("GET"); do_POST = lambda s: s.manejar("POST")
    do_PATCH = lambda s: s.manejar("PATCH"); do_PUT = lambda s: s.manejar("PUT")
    log_message = lambda *a: None


if __name__ == "__main__":
    print("Backend simulado en http://localhost:3000 (Ctrl+C para detener)")
    HTTPServer(("127.0.0.1", 3000), H).serve_forever()
