// Test Daily Email Script
// Run this while logged into your app in the browser

const CRON_SECRET = 'a0d3b1d481fea75f326ef7c697ec44c9e5eeec2c21519536bc9d8ee54927064f';

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
