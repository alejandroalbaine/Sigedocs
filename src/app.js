import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { config } from './config.js';
import { createSessionToken, requireSession, sessionCookieOptions } from './auth.js';
import { databaseStatus, findUserByEmail, registerAuthEvent, registerSuccessfulLogin } from './db.js';
import { dummyPasswordHash } from './users.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.join(currentDirectory, '..', 'public');
const institutionalEmailPattern = /^[^\s@]+@uapa\.edu\.do$/i;

function sendProblem(res, req, {
  status,
  code,
  type,
  title,
  detail,
  errors
}) {
  return res.status(status).type('application/problem+json').json({
    type,
    title,
    status,
    detail,
    instance: req.originalUrl,
    codigo: code,
    ...(errors ? { errores: errors } : {})
  });
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => sendProblem(res, req, {
    status: 429,
    code: 'DEMASIADOS_INTENTOS',
    type: '/problemas/demasiados-intentos',
    title: 'Demasiados intentos',
    detail: 'Demasiados intentos. Intente de nuevo más tarde.'
  })
});

function publicUser(user) {
  return {
    usuarioId: user.id || user.sub,
    correo: user.email,
    nombre: user.fullName || user.name,
    rol: user.role,
    perfil: {
      unidad: user.profile?.unit || '',
      iniciales: user.profile?.initials || ''
    },
    permisos: Array.isArray(user.permissions) ? user.permissions : []
  };
}

function validateCredentials(email, password) {
  const errors = [];
  if (!email) {
    errors.push({ campo: 'email', codigo: 'REQUERIDO', mensaje: 'El correo institucional es obligatorio.' });
  } else if (!institutionalEmailPattern.test(email)) {
    errors.push({ campo: 'email', codigo: 'FORMATO_INVALIDO', mensaje: 'El correo institucional no tiene un formato válido.' });
  }
  if (!password) {
    errors.push({ campo: 'password', codigo: 'REQUERIDO', mensaje: 'La contraseña es obligatoria.' });
  } else if (password.length < 8 || password.length > 128) {
    errors.push({ campo: 'password', codigo: 'LONGITUD_INVALIDA', mensaje: 'La contraseña no cumple la longitud permitida.' });
  }
  return errors;
}

export function createApp() {
  const app = express();
  if (config.isProduction) app.set('trust proxy', 1);

  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", ...(config.apiBaseUrl ? [config.apiBaseUrl] : [])],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          'upgrade-insecure-requests': config.isProduction ? [] : null
        }
      }
    })
  );
  app.use(express.json({ limit: '20kb' }));
  app.use(cookieParser());

  app.get('/runtime-config.js', (_req, res) => {
    const publicConfig = JSON.stringify({ API_BASE_URL: config.apiBaseUrl }).replaceAll('<', '\\u003c');
    res.type('application/javascript').send(
      `globalThis.SIGESDOC_CONFIG = Object.freeze(${publicConfig});`
    );
  });

  app.get('/api/v1/status', async (_req, res) => {
    const status = await databaseStatus();
    res.status(status.connected ? 200 : 503).json({
      data: {
        status: status.connected ? 'ok' : 'degraded',
        service: 'sigesdoc',
        mode: status.mode,
        connected: status.connected
      }
    });
  });

  app.post('/api/v1/sessions', loginLimiter, async (req, res, next) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const remember = req.body?.remember === true;
      const errors = validateCredentials(email, password);

      if (errors.length > 0) {
        return sendProblem(res, req, {
          status: 422,
          code: 'VALIDACION_FALLIDA',
          type: '/problemas/validacion',
          title: 'Datos no válidos',
          detail: 'Uno o más campos no cumplen el contrato.',
          errors
        });
      }

      const user = await findUserByEmail(email);
      const validPassword = await bcrypt.compare(password, user?.passwordHash || dummyPasswordHash);

      if (!user || !validPassword || !user.isActive) {
        await registerAuthEvent({
          userId: user?.id,
          attemptedEmail: email,
          eventType: 'login_failure',
          ipAddress: req.ip,
          userAgent: req.get('user-agent')?.slice(0, 500)
        });
        return sendProblem(res, req, {
          status: 401,
          code: 'CREDENCIALES_INVALIDAS',
          type: '/problemas/credenciales-invalidas',
          title: 'Credenciales inválidas',
          detail: 'Las credenciales proporcionadas no son válidas.'
        });
      }

      await registerSuccessfulLogin({
        userId: user.id,
        attemptedEmail: email,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')?.slice(0, 500)
      });
      res.cookie(config.cookieName, createSessionToken(user, remember), sessionCookieOptions(remember));
      return res.json({ data: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/v1/users/current', requireSession, (req, res) => {
    res.json({ data: publicUser(req.user) });
  });

  app.delete('/api/v1/sessions/current', requireSession, async (req, res) => {
    try {
      await registerAuthEvent({
        userId: req.user.sub,
        attemptedEmail: req.user.email,
        eventType: 'logout',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')?.slice(0, 500)
      });
    } catch (error) {
      console.error('No se pudo registrar el cierre de sesión:', error.message);
    }
    res.clearCookie(config.cookieName, sessionCookieOptions(false));
    return res.status(204).send();
  });

  app.use(express.static(publicDirectory, { extensions: ['html'] }));

  app.use('/api', (req, res) => sendProblem(res, req, {
    status: 404,
    code: 'RECURSO_NO_ENCONTRADO',
    type: '/problemas/recurso-no-encontrado',
    title: 'Recurso no encontrado',
    detail: 'El recurso solicitado no existe.'
  }));

  app.use((error, req, res, _next) => {
    console.error(error);
    return sendProblem(res, req, {
      status: 500,
      code: 'ERROR_INTERNO',
      type: '/problemas/error-interno',
      title: 'Error interno del servidor',
      detail: 'Ocurrió un error inesperado al procesar la solicitud.'
    });
  });

  return app;
}
