const https = require('https');

async function testEndpoint(endpoint, method = 'GET', body = null) {
  console.log(`\n🧪 Testing ${method} ${endpoint}`)
  
  const options = {
    hostname: 'www.leviousa.com',
    port: 443,
    path: endpoint,
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer fake.jwt.token'
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      console.log(`📋 Status: ${res.statusCode}`)
      console.log(`📋 Headers:`, res.headers)
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`📋 Raw Response: "${data}"`);
        console.log(`📋 Response Length: ${data.length} characters`);
        
        if (data.length === 0) {
          console.log('❌ Empty response - this explains the JSON parsing error!');
        } else {
          try {
            const parsed = JSON.parse(data);
            console.log('✅ Valid JSON response');
          } catch (e) {
            console.log('❌ Invalid JSON:', e.message);
            console.log('❌ First 200 chars:', data.substring(0, 200));
          }
        }
        resolve(data);
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Request error: ${e.message}`);
      resolve('');
    });

    if (body && method !== 'GET') {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('🔍 DEBUGGING API ENDPOINTS\n');
  
  // Test the endpoints that are failing
  await testEndpoint('/api/referrals/generate-unique', 'POST', {});
  
  await testEndpoint('/api/subscription/checkout', 'POST', { 
    priceId: 'price_1Rya4tDEhmkmCZeoBT9nutJR' 
  });
  
  // Test a working endpoint for comparison
  await testEndpoint('/api/usage/status', 'GET');
  
  console.log('\n🎯 Debug complete!');
}

runTests().catch(console.error);
