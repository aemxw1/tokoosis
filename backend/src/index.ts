import express from 'express';
import path from 'path';
import bcrypt from 'bcryptjs';
import AuthRoutes from './routes/AuthRoutes';
import { PrismaClient } from '@prisma/client';
import PaymentRoutes from './routes/paymentRoutes';
import dotenv from 'dotenv';
import adminroutes from './routes/AdminRoutes';
import { Request, Response } from 'express';
import router from './routes/AuthRoutes';

dotenv.config();

const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend/build')));
app.use('/auth', AuthRoutes);
app.use('/api', PaymentRoutes);
app.use('/api/admin', adminroutes);
app.get('/search', async (req, res) => {
  const query = req.query.q?.toString().trim() || '';

  const products = await prisma.product.findMany({
    where: {
      name: {
        contains: query,
        mode: 'insensitive'
      }
    }
  });

  res.status(200).json({ products });
});

app.use(router);

app.post('/reset-password', async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || newPassword.length < 6) {
    res.status(400).json({ message: 'Invalid request' });
    return;
  }

  try {
    const user = await prisma.user.findFirst({
      where: { verifyCode: token }
    });

    if (!user) {
      res.status(400).json({ message: 'Invalid or expired token' });
      return;
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 8);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        verifyCode: null
      }
    });

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.query.token as string;

    if (!token) {
      res.status(400).json({ message: 'Missing verification token' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { verifyCode: token }
    });

    if (!user) {
      res.status(400).json({ message: 'Invalid verification token' });
      return;
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true, verifyCode: null }
      });

      res.redirect('/');
      return;
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
