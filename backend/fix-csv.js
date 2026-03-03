import fs from 'fs';
import { parse } from 'csv-parse/sync';

// Read the broken CSV file
const fileContent = fs.readFileSync('./lunesa-test-users.csv', 'utf-8');

// Try to parse with relaxed settings
const records = parse(fileContent, {
  columns: false,
  skip_empty_lines: true,
  relax: true,
  relax_quotes: true,
  relax_column_count: true,
});

console.log(`📊 Parsed ${records.length} lines`);
console.log('🔍 Header:', records[0]);
console.log('🔍 First data row length:', records[1].length);

// The header is the first row
const headers = records[0];
console.log(`📋 Expected ${headers.length} columns`);

// Process data rows and normalize them
const normalizedRecords = [];

for (let i = 1; i < records.length; i++) {
  const row = records[i];
  
  if (!row[0]) continue; // Skip empty rows
  
  // Create object with correct column count
  const normalizedRow = {};
  
  if (row.length === headers.length) {
    // Perfect fit
    for (let j = 0; j < headers.length; j++) {
      normalizedRow[headers[j]] = row[j] || '';
    }
  } else if (row.length > headers.length) {
    // Too many columns - location field probably has unescaped comma
    // Columns 0-4 are ID, Email, Name, Username, Age
    // Column 5 should be Location but it got split
    for (let j = 0; j < 5; j++) {
      normalizedRow[headers[j]] = row[j] || '';
    }
    
    // Merge the extra location columns (location is split by commas)
    const extraCols = row.length - headers.length + 1;
    const locationParts = [];
    for (let k = 5; k < 5 + extraCols; k++) {
      if (row[k]) locationParts.push(row[k].trim());
    }
    normalizedRow[headers[5]] = locationParts.join(', ');
    
    // Rest of the columns
    const offset = 5 + extraCols - 1;
    for (let j = 6; j < headers.length; j++) {
      normalizedRow[headers[j]] = row[offset + j - 5] || '';
    }
  } else {
    // Too few columns - keep as is
    for (let j = 0; j < Math.min(headers.length, row.length); j++) {
      normalizedRow[headers[j]] = row[j] || '';
    }
  }
  
  normalizedRecords.push(normalizedRow);
}

console.log(`✅ Normalized ${normalizedRecords.length} records`);
console.log('🔍 Sample record:', normalizedRecords[0]);

// Write the fixed CSV manually
let csvContent = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';

for (const record of normalizedRecords) {
  const row = headers.map(h => {
    let val = record[h] || '';
    // Escape quotes and wrap in quotes if contains comma
    val = String(val).replace(/"/g, '""');
    if (val.includes(',') || val.includes('\n') || val.includes('"')) {
      val = `"${val}"`;
    }
    return val;
  });
  csvContent += row.join(',') + '\n';
}

fs.writeFileSync('./lunesa-test-users-fixed.csv', csvContent);

console.log('💾 Fixed CSV saved to lunesa-test-users-fixed.csv');
console.log(`📝 Total records written: ${normalizedRecords.length}`);
