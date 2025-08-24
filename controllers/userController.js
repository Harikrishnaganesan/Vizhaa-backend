import userService from '../services/userService.js';

class UserController {
  async getDashboard(req, res) {
    try {
      const dashboardData = await userService.getDashboardData(
        req.user._id, 
        req.user.userType
      );
      
      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching dashboard data'
      });
    }
  }

  async getProfile(req, res) {
    try {
      res.json({
        success: true,
        data: req.user
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching profile'
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const updates = req.body;
      const updatedUser = await userService.updateUser(req.user._id, updates);
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while updating profile'
      });
    }
  }
}

export default new UserController();