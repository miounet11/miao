import { UserModel, User, UserPublic } from '../models/User';
import { hashPassword, comparePassword } from '../utils/hash';
import { generateToken } from '../utils/jwt';

export interface LoginResult {
  token: string;
  user: UserPublic;
}

export interface RegisterInput {
  email: string;
  password: string;
}

/**
 * Authentication service
 */
export class AuthService {
  /**
   * Register a new user
   */
  static async register(input: RegisterInput): Promise<LoginResult> {
    // Check if email already exists
    if (UserModel.emailExists(input.email)) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Create user
    const user = UserModel.create({
      email: input.email,
      password_hash: passwordHash,
      membership: 'free',
    });

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      membership: user.membership,
    });

    return {
      token,
      user: UserModel.toPublic(user),
    };
  }

  /**
   * Login user
   */
  static async login(email: string, password: string): Promise<LoginResult> {
    // Find user by email
    const user = UserModel.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      membership: user.membership,
    });

    return {
      token,
      user: UserModel.toPublic(user),
    };
  }

  /**
   * Verify user exists and return public info
   */
  static getUserById(userId: number): UserPublic | null {
    const user = UserModel.findById(userId);
    if (!user) return null;
    return UserModel.toPublic(user);
  }
}
