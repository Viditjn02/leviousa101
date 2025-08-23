// Test the endpoint functions directly to identify issues

// Mock the Next.js API environment
const mockRequest = (method, body = {}) => ({
  method,
  body,
  headers: {
    authorization: 'Bearer fake.jwt.token'
  }
});

const mockResponse = () => {
  const res = {
    statusCode: 200,
    headers: {},
    responseBody: null,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(body) {
      this.responseBody = body;
      console.log(`📋 Response ${this.statusCode}:`, JSON.stringify(body, null, 2));
      return this;
    },
    setHeader: function(name, value) {
      this.headers[name] = value;
      return this;
    }
  };
  return res;
};

async function testGenerateUnique() {
  console.log('\n🧪 Testing generate-unique locally...');
  
  // Set up environment for testing  
  process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_fake_for_testing';
  process.env.STRIPE_REFERRAL_COUPON_50_OFF = 'SX0SGRUm';
  
  try {
    // Import and test the generate-unique handler
    const { default: generateUniqueHandler } = await import('./leviousa_web/pages/api/referrals/generate-unique.ts');
    
    const req = mockRequest('POST', {});
    const res = mockResponse();
    
    await generateUniqueHandler(req, res);
    
    if (res.responseBody) {
      console.log('✅ generate-unique works locally!');
    } else {
      console.log('❌ generate-unique failed locally - no response body');
    }
  } catch (error) {
    console.error('❌ generate-unique error:', error.message);
  }
}

async function testCheckout() {
  console.log('\n🧪 Testing checkout locally...');
  
  // Set up environment for testing
  process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_fake_for_testing';
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO = 'price_1Rya4tDEhmkmCZeoBT9nutJR';
  
  try {
    // Import and test the checkout handler
    const { default: checkoutHandler } = await import('./leviousa_web/pages/api/subscription/checkout.ts');
    
    const req = mockRequest('POST', {
      priceId: 'price_1Rya4tDEhmkmCZeoBT9nutJR',
      successUrl: 'https://www.leviousa.com/success',
      cancelUrl: 'https://www.leviousa.com/cancel'
    });
    const res = mockResponse();
    
    await checkoutHandler(req, res);
    
    if (res.responseBody) {
      console.log('✅ checkout works locally!');
    } else {
      console.log('❌ checkout failed locally - no response body');
    }
  } catch (error) {
    console.error('❌ checkout error:', error.message);
  }
}

async function runLocalTests() {
  console.log('🔧 TESTING ENDPOINTS LOCALLY\n');
  
  await testGenerateUnique();
  await testCheckout();
  
  console.log('\n🎯 Local testing complete!');
}

runLocalTests().catch(console.error);


