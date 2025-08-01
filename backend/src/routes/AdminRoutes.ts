import { PrismaClient } from '@prisma/client';
import authMiddleware from '../middleware/authMiddleware';
import express from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

router.get('/users', authMiddleware, async (req, res) => {
  try {
    if (!req.isAdmin) {
      res.status(403).json({ message: 'Admins only' });
      return;
    }

    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, isAdmin: true }
    });

    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/users/:id/toggle-admin', authMiddleware, async (req, res) => {
  try {
    if (!req.isAdmin) {
      res.status(403).json({ message: 'Admins only' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isAdmin: !user.isAdmin }
    });

    res.json(updated);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/transfer-proofs', authMiddleware, async (req, res) => {
  if (!req.userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const proofs = await prisma.paymentProof.findMany({
    include: {
      user: { select: { username: true, email: true } }
    },
    orderBy: { uploadedAt: 'desc' }
  });

  res.json(proofs);
});

router.post('/products', authMiddleware, upload.single('image'), async (req, res) => {
  if (!req.isAdmin) {
    res.status(403).json({ error: 'Admin access only' });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No image uploaded' });
    return;
  }

  const { name, seller, sellerPhone, price } = req.body;

  if (!name || !seller || !sellerPhone || !price) {
    res.status(400).json({ error: 'Missing fields' });
    return;
  }

  const filename = `${Date.now()}-${randomUUID()}.${file.originalname.split('.').pop()}`;
  const { error } = await supabase.storage
    .from('product-images')
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600'
    });

  if (error) {
    console.error(error);
    res.status(500).json({ error: 'Image upload failed', detail: error.message });
    return;
  }

  const { data: urlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(filename);

  try {
    const product = await prisma.product.create({
      data: {
        name,
        seller,
        sellerPhone,
        price: parseFloat(price),
        image: urlData.publicUrl
      }
    });

    res.status(201).json({ message: 'Product created', product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save product' });
  }
});

router.delete('/products/:id', authMiddleware, async (req, res) => {
  if (!req.isAdmin) {
    res.status(403).json({ message: 'Admins only' });
    return;
  }

  const productId = req.params.id;

  try {
    const existing = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!existing) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    await prisma.product.delete({
      where: { id: productId }
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ message: 'Server error while deleting product' });
  }
});

router.patch('/transfer-proofs/:id', authMiddleware, async (req, res) => {
  const { status } = req.body;

  if (!req.isAdmin) {
    res.status(403).json({ message: 'Admins only' });
    return;
  }

  const updated = await prisma.paymentProof.update({
    where: { id: Number(req.params.id) },
    data: { status }
  });

  res.json(updated);
});

export default router;
