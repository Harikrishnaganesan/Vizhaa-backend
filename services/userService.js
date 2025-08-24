import User from '../models/User.js';
import { USER_TYPES } from '../config/constant.js';

class UserService {
  async createUser(userData) {
    try {
      console.log('UserService: Creating user with data:', userData);
      
      // Validate required fields
      if (!userData.fullName || !userData.email || !userData.password || !userData.userType || !userData.phone) {
        throw new Error('Missing required fields: fullName, email, password, userType, phone');
      }
      
      const user = new User(userData);
      console.log('UserService: User model created, attempting to save...');
      
      const savedUser = await user.save();
      console.log('UserService: User saved successfully with ID:', savedUser._id);
      
      return savedUser;
    } catch (error) {
      console.error('UserService: Error creating user:', error);
      
      if (error.code === 11000) {
        if (error.keyValue?.email) {
          throw new Error('User with this email already exists');
        }
        if (error.keyValue?.phone) {
          throw new Error('User with this phone number already exists');
        }
        throw new Error('Duplicate key error');
      }
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        throw new Error(`Validation error: ${validationErrors.join(', ')}`);
      }
      
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  async findUserByEmail(email) {
    try {
      return await User.findOne({ email });
    } catch (error) {
      throw new Error(`Error finding user by email: ${error.message}`);
    }
  }

  async findUserByPhone(phone) {
    try {
      return await User.findOne({ phone });
    } catch (error) {
      throw new Error(`Error finding user by phone: ${error.message}`);
    }
  }

  async findUserById(id) {
    try {
      return await User.findById(id);
    } catch (error) {
      throw new Error(`Error finding user by ID: ${error.message}`);
    }
  }

  async verifyUser(userId) {
    try {
      return await User.findByIdAndUpdate(
        userId,
        { isVerified: true },
        { new: true }
      );
    } catch (error) {
      throw new Error(`Error verifying user: ${error.message}`);
    }
  }

  async resetPassword(userId, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      user.password = newPassword;
      return await user.save();
    } catch (error) {
      throw new Error(`Error resetting password: ${error.message}`);
    }
  }

  async validatePassword(user, password) {
    try {
      return await user.comparePassword(password);
    } catch (error) {
      throw new Error(`Error validating password: ${error.message}`);
    }
  }

  async updateUser(userId, updates) {
    try {
      return await User.findByIdAndUpdate(userId, updates, { new: true });
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  async deleteUser(userId) {
    try {
      return await User.findByIdAndDelete(userId);
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }
}

export default new UserService();