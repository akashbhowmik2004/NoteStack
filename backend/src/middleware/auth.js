import jwt from 'jsonwebtoken';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or invalid format' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentication token missing' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'JWT_SECRET is not configured on server' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    const userId = decoded.sub || decoded.id;

    if (!userId) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    req.user = {
      id: userId.toString(),
      sub: userId.toString(),
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export default authenticate;
