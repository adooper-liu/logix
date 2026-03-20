#!/usr/bin/env ts-node

/**
 * 测试 logger 是否正常工作
 */

import { logger } from '../src/utils/logger';

console.log('Testing logger...');
console.log('Logger object:', logger);
console.log('Logger methods:', Object.keys(logger));

// 测试不同级别的日志
console.log('\nTesting logger.info...');
try {
  logger.info('Test info message');
  console.log('✅ logger.info works');
} catch (error) {
  console.error('❌ logger.info failed:', error);
}

console.log('\nTesting logger.warn...');
try {
  logger.warn('Test warn message');
  console.log('✅ logger.warn works');
} catch (error) {
  console.error('❌ logger.warn failed:', error);
}

console.log('\nTesting logger.error...');
try {
  logger.error('Test error message');
  console.log('✅ logger.error works');
} catch (error) {
  console.error('❌ logger.error failed:', error);
}

console.log('\nTesting logger.debug...');
try {
  logger.debug('Test debug message');
  console.log('✅ logger.debug works');
} catch (error) {
  console.error('❌ logger.debug failed:', error);
}

console.log('\nLogger test completed!');
