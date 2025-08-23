const https = require('https');

async function testDevAPI(endpoint, method = 'GET', body = null) {
  console.log(`\n🧪 Testing ${method} ${endpoint}`)
  
  const data = body ? JSON.stringify(body) : null;
  
  const options = {
    hostname: 'leviousa-r1y6zoibl-vidit-jains-projects-5fe154e9.vercel.app',
    port: 443,
    path: endpoint,
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJSUzI1NiJ9.eyJ1aWQiOiJ0ZXN0LXVpZCIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSJ9'
    }
  };

  if (data) {
    options.headers['Content-Length'] = data.length;
  }

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      console.log(`📋 Status: ${res.statusCode}`)
      
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 500) {
          console.log('❌ 500 Internal Server Error - still broken');
          console.log('📋 Response:', responseData.substring(0, 200));
        } else if (res.statusCode === 405) {
          console.log('❌ 405 Method Not Allowed - routing issue');
        } else if (res.statusCode === 200) {
          console.log('✅ SUCCESS! 200 OK');
          try {
            const parsed = JSON.parse(responseData);
            console.log('📊 Response:', JSON.stringify(parsed, null, 2));
          } catch (e) {
            console.log('📋 Non-JSON response:', responseData.substring(0, 100));
          }
        } else {
          console.log(`📋 Status ${res.statusCode}:`, responseData.substring(0, 100));
        }
        resolve(responseData);
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Request error: ${e.message}`);
      resolve('');
    });

    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

async function testDevDeployment() {
  console.log('🧪 TESTING DEVELOPMENT DEPLOYMENT');
  console.log('🔗 URL: https://leviousa-r1y6zoibl-vidit-jains-projects-5fe154e9.vercel.app');
  console.log('');
  
  // Test the key endpoints that were giving 500 errors
  await testDevAPI('/api/usage/status', 'GET');
  await testDevAPI('/api/subscription/checkout', 'POST', { 
    priceId: 'price_1Rya4tDEhmkmCZeoBT9nutJR' 
  });
  await testDevAPI('/api/referrals/create', 'POST', { 
    referred_email: 'test@example.com' 
  });
  
  console.log('\n🎯 Development testing complete!');
}

testDevDeployment().catch(console.error);


