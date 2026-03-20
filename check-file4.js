const fs = require('fs');
const content = fs.readFileSync('backend/src/services/feituoImport.service.ts', 'utf8');
const lines = content.split('\n');

console.log('Line 1525:', JSON.stringify(lines[1524]));
console.log('Line 1526:', JSON.stringify(lines[1525]));
console.log('Line 1527:', JSON.stringify(lines[1526]));
