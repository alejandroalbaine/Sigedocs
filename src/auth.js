import jwt from 'jsonwebtoken';
import { config } from './config.js';

export function createSessionToken(user, remember) {
  return jwt.sign(
    {
      email: user.email,
      name: user.fullName,
      role: user.role,
      profile: user.profile,
      permissions: user.permissions || []
    },
    config.jwtSecret,
    {
      subject: user.id,
      expiresIn: remember ? '30d' : '8h',
      issuer: config.issuer,
      audience: config.audience
    }
  );
}

export function readSessionToken(token) {
  return jwt.verify(token, config.jwtSecret, {
    issuer: config.issuer,
    audience: config.audience
  });
}

export function requireSession(req, res, next) {
  const token = req.cookies[config.cookieName];
  if (!token) {
    return res.status(401).type('application/problem+json').json({
      type: '/problemas/no-autenticado',
      title: 'No autenticado',
      status: 401,
      detail: 'Debe iniciar sesión para acceder a este recurso.',
      instance: req.originalUrl,
      codigo: 'NO_AUTENTICADO'
    });
  }

  try {
    req.user = readSessionToken(token);
    return next();
  } catch {
    res.clearCookie(config.cookieName, { path: '/' });
    return res.status(401).type('application/problem+json').json({
      type: '/problemas/no-autenticado',
      title: 'No autenticado',
      status: 401,
      detail: 'La sesión expiró. Inicie sesión nuevamente.',
      instance: req.originalUrl,
      codigo: 'NO_AUTENTICADO'
    });
  }
}

export function sessionCookieOptions(remember = false) {
  const options = {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.cookieSameSite,
    path: '/'
  };
  if (remember) options.maxAge = 30 * 24 * 60 * 60 * 1000;
  return options;
}
