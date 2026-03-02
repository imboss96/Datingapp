console.log('About to import moderation...');
try {
  await import('./routes/moderation.js');
  console.log('Successfully imported moderation.js');
} catch (err) {
  console.error('Error importing:', err.message);
  process.exit(1);
}
