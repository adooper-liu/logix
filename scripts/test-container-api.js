const axios = require('axios');

async function testContainerAPI() {
  try {
    console.log('Testing container API...\n');
    
    const response = await axios.get('http://localhost:3001/api/v1/containers/ECMU5381817');
    console.log('✅ Success:', response.data);
  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
      console.log('Stack trace:', error.response.data?.error || 'No stack trace');
    }
  }
}

testContainerAPI();
