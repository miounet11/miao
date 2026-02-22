import { UserModel, UserPublic } from '../models/User';
import { UserConfigModel, UserConfigData } from '../models/UserConfig';

/**
 * User service for user-related operations
 */
export class UserService {
  /**
   * Get user profile
   */
  static getUserProfile(userId: number): UserPublic | null {
    const user = UserModel.findById(userId);
    if (!user) return null;
    return UserModel.toPublic(user);
  }

  /**
   * Save user configuration
   */
  static saveUserConfig(userId: number, config: UserConfigData): UserConfigData {
    // Verify user exists
    const user = UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Save config
    UserConfigModel.upsert(userId, config);

    // Return saved config
    return UserConfigModel.getConfigData(userId)!;
  }

  /**
   * Get user configuration
   */
  static getUserConfig(userId: number): UserConfigData | null {
    // Verify user exists
    const user = UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return UserConfigModel.getConfigData(userId);
  }

  /**
   * Delete user configuration
   */
  static deleteUserConfig(userId: number): boolean {
    return UserConfigModel.delete(userId);
  }

  /**
   * Update user membership
   */
  static updateMembership(
    userId: number,
    membership: 'free' | 'pro' | 'enterprise'
  ): UserPublic | null {
    const success = UserModel.updateMembership(userId, membership);
    if (!success) return null;
    return this.getUserProfile(userId);
  }
}
