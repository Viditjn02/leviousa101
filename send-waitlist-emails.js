#!/usr/bin/env node

/**
 * Send delay + password setup emails to waitlist users
 * Uses the working test-delay-email API
 */

const axios = require('axios');

// Test waitlist emails (you can add real ones)
const testEmails = [
  'viditjn02@gmail.com',
  // Add more test emails here if you want
];

async function sendWaitlistEmails() {
  console.log('📧 SENDING WAITLIST EMAILS');
  console.log('==========================\n');

  let successful = 0;
  let failed = 0;

  for (const email of testEmails) {
    try {
      console.log(`📤 Sending to: ${email}`);
      
      const response = await axios.post('https://www.leviousa.com/api/test-delay-email', {
        email: email,
        adminKey: 'test123'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        console.log(`✅ Sent successfully to: ${email}`);
        successful++;
      } else {
        console.log(`❌ Failed to send to: ${email} - ${response.data.message}`);
        failed++;
      }

      // Rate limiting - wait 1 second between emails
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.log(`❌ Error sending to: ${email} - ${error.response?.data?.message || error.message}`);
      failed++;
    }
  }

  console.log('\n📊 EMAIL SENDING COMPLETE');
  console.log('=========================');
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📧 Total: ${successful + failed}`);
}

console.log('🚀 Ready to send waitlist emails!');
console.log('📧 This will send to test emails first');
console.log('🔄 You can modify the testEmails array to include real waitlist addresses\n');

sendWaitlistEmails().catch(console.error);
