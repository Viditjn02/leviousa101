// Simple test without TypeScript imports

const https = require('https');

async function testEndpointDirect(endpoint, method = 'GET', body = null) {
  console.log(`\n🧪 Testing ${method} ${endpoint}`)
  
  const data = JSON.stringify(body);
  
  const options = {
    hostname: 'www.leviousa.com',
    port: 443,
    path: endpoint,
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJSUzI1NiJ9.eyJ1aWQiOiJ0ZXN0LXVpZCIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSJ9',
      'Content-Length': data ? data.length : 0
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      console.log(`📋 Status: ${res.statusCode}`)
      console.log(`📋 Content-Type: ${res.headers['content-type']}`)
      
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`📋 Response Length: ${responseData.length} characters`);
        
        if (responseData.length === 0) {
          console.log('❌ Empty response!');
        } else if (res.statusCode === 405) {
          console.log('❌ Method not allowed - endpoint may not be deployed');
        } else {
          try {
            const parsed = JSON.parse(responseData);
            console.log('✅ Valid JSON response');
            console.log('📊 Response:', JSON.stringify(parsed, null, 2));
          } catch (e) {
            console.log('❌ Invalid JSON response');
            console.log('📋 Raw response:', responseData.substring(0, 200));
          }
        }
        resolve(responseData);
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Request error: ${e.message}`);
      resolve('');
    });

    if (data && method !== 'GET') {
      req.write(data);
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('🔍 DIRECT ENDPOINT TESTING\n');
  
  // Test the working endpoints first
  console.log('=== WORKING ENDPOINTS ===');
  await testEndpointDirect('/api/usage/status', 'GET');
  
  await testEndpointDirect('/api/referrals/create', 'POST', { 
    referred_email: 'test@example.com' 
  });
  
  console.log('\n=== PROBLEMATIC ENDPOINTS ===');
  
  // Test the failing endpoints  
  await testEndpointDirect('/api/referrals/generate-unique', 'POST', {});
  
  await testEndpointDirect('/api/subscription/checkout', 'POST', { 
    priceId: 'price_1Rya4tDEhmkmCZeoBT9nutJR',
    successUrl: 'https://www.leviousa.com/success',
    cancelUrl: 'https://www.leviousa.com/cancel'
  });
  
  console.log('\n🎯 Direct testing complete!');
}

runTests().catch(console.error);


