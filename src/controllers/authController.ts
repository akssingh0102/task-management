import { Request, Response } from 'express';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import logger from '../utils/logger';
import db from '../db';
import { loginSchema, registerSchema } from '../validators/authValidator';
import { z } from 'zod';

export const register = async (req: Request, res: Response) => {
  try {
    logger.info('Register API called');

    const gg = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';`
    );

    logger.info(`All the tables are : ${JSON.stringify(gg)}`);

    const { name, email, password } = registerSchema.parse(req.body);
    logger.info(`Registering new user with email: ${email}`);

    logger.info('Pre query');
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);
    logger.info('Post query');
    if (userCheck.rows.length > 0) {
      logger.warn(
        `Registration failed: User with email ${email} already exists`
      );
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    const hashedPassword = await hashPassword(password);
    logger.info(`Password hashed for user with email: ${email}`);

    const newUser = await db.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashedPassword]
    );
    logger.info(`User with email ${email} registered successfully`);

    const token = generateToken(newUser.rows[0].id);
    logger.info(`JWT generated for user with email: ${email}`);

    res.status(201).json({
      message: 'User registered successfully',
      user: newUser.rows[0],
      token,
    });
  } catch (error: any) {
    logger.error(`Error registering user: ${error.message}`);

    if (error instanceof z.ZodError) {
      logger.warn(
        `Validation error during registration: ${JSON.stringify(error.errors)}`
      );
      res.status(400).json({ error: error.errors });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    logger.info('Login API called');

    const { email, password } = loginSchema.parse(req.body);
    logger.info(`Attempting login for user with email: ${email}`);

    const userQuery = await db.query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);
    if (userQuery.rows.length === 0) {
      logger.warn(`Login failed: User with email ${email} not found`);
      res.status(400).json({ error: 'Invalid email or password' });
      return;
    }

    const user = userQuery.rows[0];
    logger.info(`User with email ${email} found, checking password`);

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      logger.warn(
        `Login failed: Invalid password for user with email ${email}`
      );
      res.status(400).json({ error: 'Invalid email or password' });
      return;
    }

    const token = generateToken(user.id);
    logger.info(`JWT generated for user with email: ${email}`);

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      token,
    });
  } catch (error: any) {
    logger.error(`Error logging in: ${error.message}`);

    if (error instanceof z.ZodError) {
      logger.warn(
        `Validation error during login: ${JSON.stringify(error.errors)}`
      );
      res.status(400).json({ error: error.errors });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
};
