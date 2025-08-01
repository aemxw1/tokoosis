import jwt, { JwtPayload } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

const prisma = new PrismaClient();


declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
    userEmail?: string;
    isAdmin?: boolean;
  }
}

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    if (!decoded || typeof decoded !== 'object' || !decoded.userId) {
       res.status(401).json({ message: 'Invalid token payload' });
       return;
    }

    req.userId = decoded.userId;
    req.userEmail = decoded.email;

   
    prisma.user.findUnique({ where: { id: decoded.userId } }).then((user) => {
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      req.isAdmin = user.isAdmin;
      next(); 
    }).catch((err) => {
      console.error('DB error in middleware:', err);
      res.status(500).json({ message: 'Internal server error' });
    });

  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export default authMiddleware;
