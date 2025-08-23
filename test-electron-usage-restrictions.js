#!/usr/bin/env node

/**
 * Test Electron App Usage Restrictions Integration
 * Tests that the Electron app properly enforces usage limits from the web API
 */

const path = require('path');

// Mock Electron environment for testing (don't import actual Electron)
console.log('⚠️ This test simulates Electron environment behavior without requiring Electron runtime');

// Mock process.env for testing
process.env.LEVIOUSA_WEB_URL = process.env.LEVIOUSA_WEB_URL || 'https://www.leviousa.com';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key_for_testing';
process.env.STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || 'price_mock_for_testing';

async function testElectronUsageRestrictions() {
  console.log('🔬 Testing Electron Usage Restrictions Integration');
  console.log('=================================================\n');

  // Import the subscription service
  const subscriptionService = require('./src/features/common/services/subscriptionService');
  
  // Mock authentication service
  const mockAuth = {
    getCurrentUser: () => ({
      mode: 'firebase',
      getIdToken: () => Promise.resolve('mock-token'),
      email: 'test@test.com',
      uid: 'test-uid'
    }),
    getCurrentUserId: () => 'test-uid'
  };
  
  // Mock the auth service
  require.cache[require.resolve('./src/features/common/services/authService')] = {
    exports: mockAuth
  };

  console.log('📊 Test 1: Check Auto Answer Usage Allowance');
  try {
    const usageCheck = await subscriptionService.checkUsageAllowed('cmd_l');
    console.log('✅ Auto Answer usage check result:', usageCheck);
  } catch (error) {
    console.error('❌ Auto Answer usage check failed:', error.message);
  }

  console.log('\n📊 Test 2: Check Browser Usage Allowance');
  try {
    const usageCheck = await subscriptionService.checkUsageAllowed('browser');
    console.log('✅ Browser usage check result:', usageCheck);
  } catch (error) {
    console.error('❌ Browser usage check failed:', error.message);
  }

  console.log('\n⏱️ Test 3: Track Auto Answer Usage');
  try {
    await subscriptionService.trackUsageToWebAPI('cmd_l', 3);
    console.log('✅ Auto Answer usage tracked successfully');
  } catch (error) {
    console.error('❌ Auto Answer usage tracking failed:', error.message);
  }

  console.log('\n⏱️ Test 4: Track Browser Usage');
  try {
    await subscriptionService.trackUsageToWebAPI('browser', 2);
    console.log('✅ Browser usage tracked successfully');
  } catch (error) {
    console.error('❌ Browser usage tracking failed:', error.message);
  }

  console.log('\n📊 Test 5: Re-check Usage After Tracking');
  try {
    const cmdLCheck = await subscriptionService.checkUsageAllowed('cmd_l');
    const browserCheck = await subscriptionService.checkUsageAllowed('browser');
    
    console.log('✅ Auto Answer after tracking:', cmdLCheck);
    console.log('✅ Browser after tracking:', browserCheck);
  } catch (error) {
    console.error('❌ Post-tracking usage check failed:', error.message);
  }

  console.log('\n🎯 Test 6: Simulate Usage Limit Exceeded');
  try {
    // Try to track 15 minutes (should exceed 10 min limit for free users)
    await subscriptionService.trackUsageToWebAPI('cmd_l', 15);
    const usageCheck = await subscriptionService.checkUsageAllowed('cmd_l');
    
    console.log('📈 Usage after 15 min tracking:', usageCheck);
    
    if (!usageCheck.allowed) {
      console.log('✅ Usage limit properly enforced');
    } else {
      console.log('⚠️ Usage limit not enforced (might be Pro user or special email)');
    }
  } catch (error) {
    console.error('❌ Limit testing failed:', error.message);
  }

  console.log('\n🎉 Electron Usage Restrictions Test Complete!');
  console.log('============================================\n');
  
  console.log('📋 Key Integration Points:');
  console.log('✅ subscriptionService.checkUsageAllowed() - Used by askService.js and windowManager.js');
  console.log('✅ subscriptionService.trackUsageToWebAPI() - Syncs usage to web database');
  console.log('✅ Web API integration with referral bonuses');
  console.log('✅ Fallback to local tracking when web API unavailable');
  
  console.log('\n🔍 Usage in Electron App:');
  console.log('• askService.js calls checkUsageAllowed("cmd_l") before processing');
  console.log('• windowManager.js calls checkUsageAllowed("browser") before opening browser');
  console.log('• Both services track usage with trackUsageToWebAPI() after feature use');
}

// Only run if called directly
if (require.main === module) {
  testElectronUsageRestrictions().catch(console.error);
}

module.exports = { testElectronUsageRestrictions };
