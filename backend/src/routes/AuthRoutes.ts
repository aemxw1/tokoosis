import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto, { verify } from 'crypto';

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const router = Router();

router.post('/sign-up', async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.username === username) {
        res.status(400).json({ message: 'Username already taken' });
        return;
      } else {
        res.status(400).json({ message: 'Email already registered' });
        return;
      }
    }

    const hashedPassword = bcrypt.hashSync(password, 8);
    const tokenLogin = crypto.randomUUID();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'sma@triratnaschool.com',
        pass: process.env.app_key
      }
    });

    await transporter.sendMail({
      from: 'SMATRIRATNA <sma@triratnaschool.com>',
      to: email,
      subject: 'Verify your email',
      html: `<a href="http://localhost:3002/verify?token=${tokenLogin}">Click to verify</a>`
    });

    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        verifyCode: tokenLogin,
        isVerified: false
      }
    });

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error creating user:', error);
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    res.status(400).json({ message: 'User does not exists' });
    return;
  }

  try {
    const passwordIsValid = bcrypt.compareSync(password, user.password);

    if (!passwordIsValid) {
      res.status(401).json({ message: 'Invalid Password' });
      return;
    }

    if (!user.isVerified) {
      res.status(401).json({ message: 'Please verify your email first' });
      return;
    }

    if (user) {
      const JWT_SECRET = process.env.JWT_SECRET!;
      const token = jwt.sign(
        {
          email: user.email,
          userId: user.id,
          username: user.username
        },
        JWT_SECRET,
        { expiresIn: '3d' }
      );

      res.status(201).json({ message: 'success', token });
    }
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

router.post('/request-reset-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: 'Email is required' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(400).json({ success: true });
      return;
    }

    const resetToken = crypto.randomUUID();

    await prisma.user.update({
      where: { id: user.id },
      data: { verifyCode: resetToken }
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'sma@triratnaschool.com',
        pass: process.env.app_key
      }
    });

    await transporter.sendMail({
      from: 'SMATRIRATNA <sma@triratnaschool.com>',
      to: email,
      subject: 'Reset your password',
      html: `<a href="http://localhost:3002/reset-password?token=${resetToken}">Click here to reset your password</a>`
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending reset email:', error);
    res.status(500).json({ message: 'Error sending reset email' });
  }
});

export default router;
