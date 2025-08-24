import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';

const PORT = process.env.PORT || 3001;

// Handle port conflicts
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    console.log(`💡 Try a different port or kill the process using port ${PORT}`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('\n🔄 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});