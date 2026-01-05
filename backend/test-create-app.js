const axios = require('axios');

async function testCreateApplication() {
  try {
    // Login as quyet
    console.log('1. Login as quyet...');
    const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
      employeeId: 'quyet',
      password: 'quyet'
    });

    const token = loginRes.data.token;
    console.log('✓ Login successful');
    console.log('Token:', token.substring(0, 50) + '...');
    console.log('User:', loginRes.data.user);

    // Try to create application
    console.log('\n2. Creating new application...');
    const createRes = await axios.post('http://localhost:3001/api/applications', {
      title: 'Test Application from quyet',
      type: 'Vacation Leave',
      description: 'Test description',
      amount: 0,
      isDraft: false
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✓ Application created successfully!');
    console.log('Response:', createRes.data);

  } catch (error) {
    console.error('\n❌ Error occurred:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Message:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testCreateApplication();
