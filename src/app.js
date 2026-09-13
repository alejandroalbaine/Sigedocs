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

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Demasiados intentos. Espere 15 minutos antes de volver a intentar.' }
});

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
          connectSrc: ["'self'"],
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

  app.get('/api/health', async (_req, res) => {
    const data = await databaseStatus();
    res.status(data.connected ? 200 : 503).json({
      status: data.connected ? 'ok' : 'degraded',
      data
    });
  });

  app.post('/api/auth/login', loginLimiter, async (req, res, next) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const remember = req.body?.remember === true;

      if (!institutionalEmailPattern.test(email) || password.length < 8 || password.length > 128) {
        return res.status(400).json({ message: 'Revise el correo institucional y la contraseña.' });
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
        return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
      }

      await registerSuccessfulLogin({
        userId: user.id,
        attemptedEmail: email,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')?.slice(0, 500)
      });
      const token = createSessionToken(user, remember);
      res.cookie(config.cookieName, token, sessionCookieOptions(remember));

      return res.json({
        message: 'Inicio de sesión correcto.',
        user: { name: user.fullName, role: user.role }
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/auth/me', requireSession, (req, res) => {
    res.json({
      user: {
        id: req.user.sub,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        profile: req.user.profile || {}
      }
    });
  });

  app.post('/api/auth/logout', requireSession, async (req, res) => {
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
    return res.json({ message: 'Sesión cerrada.' });
  });

  app.use(express.static(publicDirectory, { extensions: ['html'] }));

  app.use('/api', (_req, res) => {
    res.status(404).json({ message: 'Recurso no encontrado.' });
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({
      message: config.isProduction
        ? 'No se pudo completar la solicitud. Inténtelo de nuevo.'
        : 'No se pudo completar la solicitud. Revise la configuración del servidor.'
    });
  });

  return app;
}
