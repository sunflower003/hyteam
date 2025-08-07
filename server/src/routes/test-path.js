const path = require('path');

console.log('Current __dirname:', __dirname);
console.log('Resolved path:', path.join(__dirname, '../../uploads/posts'));
console.log('Does directory exist?');

const fs = require('fs');
const resolvedPath = path.join(__dirname, '../../uploads/posts');
console.log('Full resolved path:', path.resolve(resolvedPath));
console.log('Directory exists:', fs.existsSync(resolvedPath));

// Test creating a file
try {
  const testFile = path.join(resolvedPath, 'test.txt');
  fs.writeFileSync(testFile, 'test content');
  console.log('Test file created successfully');
  fs.unlinkSync(testFile);
  console.log('Test file deleted successfully');
} catch (error) {
  console.error('Error creating test file:', error.message);
}
