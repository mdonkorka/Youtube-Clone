import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyAccessToken, ACCESS_COOKIE_NAME } from '../lib/tokens.js';
import type { SafeUser } from '../modules/auth/auth.types.js';

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies[ACCESS_COOKIE_NAME];
  if (!token) {
    res.status(401).json({
      error: {
        message: 'Authentication required',
        code: 'UNAUTHENTICATED',
      },
    });
    return;
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    res.status(401).json({
      error: {
        message: 'Authentication required',
        code: 'UNAUTHENTICATED',
      },
    });
    return;
  }

  if (!payload || payload.type !== 'access' || !payload.sub || !/^\d+$/.test(payload.sub)) {
    res.status(401).json({
      error: {
        message: 'Authentication required',
        code: 'UNAUTHENTICATED',
      },
    });
    return;
  }

  try {
    const user = await prisma.users.findUnique({
      where: { id: BigInt(payload.sub) },
    });

    if (!user) {
      res.status(401).json({
        error: {
          message: 'Authentication required',
          code: 'UNAUTHENTICATED',
        },
      });
      return;
    }

    req.user = {
      id: String(user.id),
      firstName: user.first_name,
      surname: user.surname,
      email: user.email,
    };

    next();
  } catch (error) {
    next(error);
  }
}
