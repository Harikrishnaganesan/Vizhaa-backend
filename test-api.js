import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

const testAPI = async () => {
  try {
    console.log('Testing API endpoints...\n');

    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('Health response:', healthData);
    console.log('Status:', healthResponse.status, '\n');

    // Test database endpoint
    console.log('2. Testing database endpoint...');
    const dbResponse = await fetch(`${BASE_URL}/test-db`);
    const dbData = await dbResponse.json();
    console.log('Database response:', dbData);
    console.log('Status:', dbResponse.status, '\n');

    // Test registration endpoint
    console.log('3. Testing registration endpoint...');
    const registrationData = {
      fullName: 'Test User API',
      email: 'testapi@example.com',
      password: 'password123',
      userType: 'organizer',
      phone: '9876543210'
    };

    const regResponse = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registrationData)
    });

    const regData = await regResponse.json();
    console.log('Registration response:', regData);
    console.log('Status:', regResponse.status, '\n');

    if (regData.success) {
      // Test login endpoint
      console.log('4. Testing login endpoint...');
      const loginData = {
        phone: '9876543210',
        password: 'password123'
      };

      const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
      });

      const loginResult = await loginResponse.json();
      console.log('Login response:', loginResult);
      console.log('Status:', loginResponse.status);
    }

  } catch (error) {
    console.error('API Test Error:', error.message);
    console.error('Make sure the server is running on port 5000');
  }
};

testAPI();