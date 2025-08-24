export const USER_TYPES = {
  ORGANIZER: 'organizer',
  SUPPLIER: 'supplier'
};

export const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 10,
  MAX_RETRIES: 3
};

export const JWT = {
  SECRET: process.env.JWT_SECRET || 'your_jwt_secret_here',
  EXPIRES_IN: '24h'
};