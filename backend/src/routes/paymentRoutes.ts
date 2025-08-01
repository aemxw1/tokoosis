import express, { RequestHandler } from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import authMiddleware from '../middleware/authMiddleware';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

const upload = multer({ storage: multer.memoryStorage() });

const handler: RequestHandler = async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  let userId: string;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    userId = decoded.userId;
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const filename = `${Date.now()}-${randomUUID()}.${file.originalname.split('.').pop()}`;

  const { error } = await supabase.storage
    .from('bukti-transfer')
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600'
    });

  if (error) {
    res.status(500).json({ error: 'Upload failed', detail: error.message });
    return;
  }

  const { data: urlData } = supabase.storage
    .from('bukti-transfer')
    .getPublicUrl(filename);

  const publicUrl = urlData.publicUrl;
  const cartJson = req.body.cartJson;

  await prisma.paymentProof.create({
    data: {
      filename,
      filepath: publicUrl ?? '',
      uploadedAt: new Date(),
      userId,
      cartJson
    }
  });

  res.status(200).json({ message: 'Upload sukses', url: publicUrl });
};

router.post('/confirm-payment', upload.single('proof'), handler);

router.get('/my-orders', authMiddleware, async (req, res) => {
  const userId = req.userId;

  const proofs = await prisma.paymentProof.findMany({
    where: { userId },
    orderBy: { uploadedAt: 'desc' }
  });

  res.json(proofs);
});

export default router;
