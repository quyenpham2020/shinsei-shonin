const axios = require('axios');

async function testMyAccess() {
  try {
    console.log('\n=== Testing Login and System Access ===\n');

    // 1. Login as user quyet
    console.log('1. Logging in as "quyet"...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      employeeId: 'quyet',
      password: 'quyet', // Assuming this is the password
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful!');
    console.log('User info:', loginResponse.data.user);

    // 2. Get my access
    console.log('\n2. Getting system access...');
    const accessResponse = await axios.get('http://localhost:3001/api/system-access/my-access', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('✅ System access retrieved!');
    console.log('Accessible systems:', accessResponse.data.systems);

    if (accessResponse.data.systems.length === 0) {
      console.log('\n⚠️  User has NO system access assigned!');
      console.log('Please assign system access to this user in the System Access page.');
    } else {
      console.log('\n✅ User has access to the following systems:');
      accessResponse.data.systems.forEach(system => {
        console.log(`  - ${system}`);
      });
    }

  } catch (error) {
    if (error.response) {
      console.error('❌ Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testMyAccess();
