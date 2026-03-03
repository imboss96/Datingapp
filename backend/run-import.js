import fs from 'fs';
import { spawn } from 'child_process';

// Run the import with stdin automated
const child = spawn('node', ['import-csv.js', './lunesa-test-users-fixed.csv']);

let output = '';
child.stdout.on('data', (data) => {
  output += data.toString();
  process.stdout.write(data);
  
  // If we see the "Do you want to clear" prompt, send 'y'
  if (output.includes('Do you want to clear')) {
    child.stdin.write('y\n');
  }
});

child.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Import completed successfully!');
  } else {
    console.log('\n❌ Import failed with code:', code);
  }
  process.exit(code);
});
