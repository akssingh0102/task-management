import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN as string;

export const generateToken = (userId: string) => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

export const comparePassword = async (
  enteredPassword: string,
  storedHash: string
) => {
  return await bcrypt.compare(enteredPassword, storedHash);
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};
