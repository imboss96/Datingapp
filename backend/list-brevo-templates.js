import dotenv from 'dotenv';
dotenv.config();

const BREVO_API_URL = 'https://api.brevo.com/v3';

(async () => {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    
    // Check all template IDs
    const templateIds = [1, 2, 3, 6, 7, 8];
    
    console.log('--- CHECKING ALL BREVO TEMPLATES ---\n');
    
    for (const templateId of templateIds) {
      try {
        const response = await fetch(`${BREVO_API_URL}/smtp/templates/${templateId}`, {
          headers: {
            'api-key': apiKey,
            'accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✓ Template ${templateId}:`);
          console.log(`    Name: ${data.name}`);
          console.log(`    Active: ${data.active}`);
          console.log(`    Sender: ${data.sender?.name} <${data.sender?.email}>`);
          console.log('');
        }
      } catch (error) {
        // Skip if template doesn't exist
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
