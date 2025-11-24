// Test Daily Email Script
// Run this while logged into your app in the browser
// Usage: node test-daily-email.js

require('dotenv').config({ path: '.env.local' });

const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error('❌ Error: CRON_SECRET environment variable is not set');
  console.log('Please set it in your .env.local file');
  process.exit(1);
}

async function testDailyEmail() {
  console.log('Testing daily email endpoint...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/tasks/daily-email', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ SUCCESS! Daily emails sent to all users with tasks due today.');
    } else {
      console.log('\n❌ FAILED:', data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDailyEmail();
