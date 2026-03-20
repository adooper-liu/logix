const fs = require('fs');
const content = fs.readFileSync('backend/src/services/feituoImport.service.ts', 'utf8');
const lines = content.split('\n');
console.log('Total lines:', lines.length);

// Check for unpaired quotes
let inString = false;
let stringChar = '';
let lineNum = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (!inString && (char === '"' || char === "'" || char === '`')) {
      inString = true;
      stringChar = char;
      lineNum = i + 1;
    } else if (inString && char === stringChar && line[j-1] !== '\\') {
      inString = false;
      stringChar = '';
    }
  }
}

if (inString) {
  console.log('Unterminated string starting around line:', lineNum);
} else {
  console.log('No unterminated strings found');
}

// Also check for template literal issues
console.log('\nChecking for template literals...');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const backtickCount = (line.match(/`/g) || []).length;
  if (backtickCount % 2 !== 0) {
    console.log(`Line ${i + 1} has odd number of backticks: ${backtickCount}`);
  }
}
