#!/bin/bash

echo "🚀 Setting up Leviousa Referral System"
echo "====================================="
echo ""

# Check if we're in the right directory
if [ ! -f "./stripe" ]; then
    echo "❌ Stripe CLI not found. Please run this from the Leviousa101 root directory."
    exit 1
fi

echo "✅ Found Stripe CLI"
echo ""

# Create webhook endpoint for production
echo "🪝 Setting up Stripe webhook endpoint..."
echo ""

read -p "Enter your domain (e.g., www.leviousa.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    DOMAIN="www.leviousa.com"
fi

WEBHOOK_URL="https://${DOMAIN}/api/stripe/webhook"

echo "Creating webhook endpoint: $WEBHOOK_URL"

WEBHOOK_ID=$(./stripe webhooks create \
  --url="$WEBHOOK_URL" \
  --events=checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.payment_failed,promotion_code.created \
  --description="Leviousa Referral System Webhook" \
  | grep '"id":' | cut -d'"' -f4)

if [ -n "$WEBHOOK_ID" ]; then
    echo "✅ Webhook created successfully: $WEBHOOK_ID"
    
    # Get webhook secret
    echo "🔑 Getting webhook secret..."
    WEBHOOK_SECRET=$(./stripe webhooks retrieve "$WEBHOOK_ID" | grep '"secret":' | cut -d'"' -f4)
    
    echo ""
    echo "🔧 Environment Variables Needed:"
    echo "================================"
    echo ""
    echo "Add these to your .env.local file:"
    echo ""
    echo "# Firebase Configuration"
    echo "FIREBASE_PROJECT_ID=leviousa-101"
    echo "NEXT_PUBLIC_FIREBASE_PROJECT_ID=leviousa-101"
    echo "GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json"
    echo ""
    echo "# Stripe Configuration" 
    echo "STRIPE_SECRET_KEY=sk_test_..." # Replace with your actual key
    echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_..." # Replace with your actual key
    echo "STRIPE_PRO_PRICE_ID=price_1Ryl0VDEhmkmCZeo5IicBVT2"
    echo "STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET"
    echo ""
    echo "# Leviousa Configuration"
    echo "LEVIOUSA_WEB_URL=https://$DOMAIN"
    echo ""
    echo "# Special Referral Emails"
    echo "SPECIAL_REFERRAL_EMAILS=viditjn02@gmail.com,viditjn@berkeley.edu,shreyabhatia63@gmail.com"
    echo ""
else
    echo "❌ Failed to create webhook"
    exit 1
fi

echo "📋 Setup Summary:"
echo "=================="
echo ""
echo "✅ Stripe coupons created:"
echo "   - FRIEND50: 50% off for normal referrals"
echo "   - VIDIT3DAYS: 100% off for special email trials"
echo ""
echo "✅ Webhook endpoint configured:"
echo "   - URL: $WEBHOOK_URL"
echo "   - Events: subscription and checkout events"
echo ""
echo "✅ Referral system features:"
echo "   - Normal referrals: 30 min daily for referred, 60 min for referrer"
echo "   - Special emails: 3 day Pro trial"
echo "   - Pro upgrade rewards: 50% off first month for referrer"
echo ""
echo "🎯 Next Steps:"
echo "1. Add the environment variables shown above to your .env.local"
echo "2. Deploy your Next.js app with the new webhook endpoint"
echo "3. Test the referral flow with test users"
echo "4. Monitor webhook events in Stripe dashboard"
echo ""
echo "🔗 Useful Commands:"
echo "   Test webhook locally: ./stripe listen --forward-to localhost:3000/api/stripe/webhook"
echo "   Test comprehensive system: node test-comprehensive-referral-system.js"
echo ""

echo "🎉 Referral system setup complete!"


