import jwt from 'jsonwebtoken';
import { config } from './config.js';

export function createSessionToken(user, remember) {
  return jwt.sign(
    {
      email: user.email,
      name: user.fullName,
      role: user.role,
      profile: user.profile
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
  if (!token) return res.status(401).json({ message: 'Debe iniciar sesión.' });

  try {
    req.user = readSessionToken(token);
    return next();
  } catch {
    res.clearCookie(config.cookieName, { path: '/' });
    return res.status(401).json({ message: 'La sesión expiró. Inicie sesión nuevamente.' });
  }
}

export function sessionCookieOptions(remember = false) {
  const options = {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/'
  };
  if (remember) options.maxAge = 30 * 24 * 60 * 60 * 1000;
  return options;
}
