// Debug script to test Paragon OAuth URL formats
const projectId = 'ed25f59d-f4d2-40da-995f-87e875e40865';
const service = 'gmail';
const token = 'test-token'; // This would be the real user token

// Different redirect parameter formats to try
const redirectValue = 'https://passport.useparagon.com/oauth';
const formats = [
    // Try without redirect at all
    {
        name: 'No redirect parameter',
        url: `https://passport.useparagon.com/oauth?projectId=${projectId}&userToken=${token}&integration=${service}`
    },
    // Standard OAuth format
    {
        name: 'redirect_uri (standard OAuth)',
        url: `https://passport.useparagon.com/oauth?projectId=${projectId}&userToken=${token}&integration=${service}&redirect_uri=${encodeURIComponent(redirectValue)}`
    },
    // CamelCase variations
    {
        name: 'redirectUrl (camelCase with URL)',
        url: `https://passport.useparagon.com/oauth?projectId=${projectId}&userToken=${token}&integration=${service}&redirectUrl=${encodeURIComponent(redirectValue)}`
    },
    {
        name: 'redirectUri (camelCase with URI)',
        url: `https://passport.useparagon.com/oauth?projectId=${projectId}&userToken=${token}&integration=${service}&redirectUri=${encodeURIComponent(redirectValue)}`
    },
    // Other variations
    {
        name: 'redirect_url (underscore with URL)',
        url: `https://passport.useparagon.com/oauth?projectId=${projectId}&userToken=${token}&integration=${service}&redirect_url=${encodeURIComponent(redirectValue)}`
    },
    {
        name: 'callbackUrl',
        url: `https://passport.useparagon.com/oauth?projectId=${projectId}&userToken=${token}&integration=${service}&callbackUrl=${encodeURIComponent(redirectValue)}`
    },
    {
        name: 'callback_url',
        url: `https://passport.useparagon.com/oauth?projectId=${projectId}&userToken=${token}&integration=${service}&callback_url=${encodeURIComponent(redirectValue)}`
    }
];

console.log('🔍 Testing different Paragon OAuth URL formats:\n');
console.log('The error says: "Redirect url is missing in query parameters"');
console.log('This suggests Paragon expects a specific parameter name.\n');

formats.forEach(format => {
    console.log(`\n📌 ${format.name}:`);
    console.log(`   ${format.url}`);
    console.log('   Test this URL to see if the error persists.');
});

console.log('\n\n💡 SOLUTION:');
console.log('Based on Paragon documentation and the error message:');
console.log('1. The parameter might be case-sensitive');
console.log('2. Try "redirectUrl" (exact case from error message)');
console.log('3. Or check Paragon dashboard for the exact expected format');
