import express from 'express';
import bodyParser from 'body-parser';

const app = express();

// Raw body logging middleware
app.use((req, res, next) => {
  console.log('[TEST] Headers:', {
    'content-type': req.headers['content-type'],
    'content-length': req.headers['content-length']
  });
  
  let rawBody = '';
  req.setEncoding('utf8');
  req.on('data', chunk => {
    rawBody += chunk;
  });
  req.on('end', () => {
    console.log('[TEST] Raw body:', rawBody);
    req.rawBody = rawBody;
    next();
  });
});

// JSON parser
app.use(express.json());

// Route
app.post('/test', (req, res) => {
  console.log('[TEST] Parsed body:', req.body);
  res.json({ 
    received: req.body,
    success: true
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.log('[TEST ERROR]', err.message);
  res.status(400).json({ 
    error: err.message,
    received: req.rawBody
  });
});

app.listen(5001, () => {
  console.log('Test server on port 5001');
});
