// Test script to debug server startup
console.log('=== Starting test ===');

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

try {
  console.log('Loading server module...');
  require('./dist/backend/src/server.js');
  console.log('Server module loaded (should not reach here if async)');
} catch (error) {
  console.error('Sync Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}

console.log('Test script completed');
