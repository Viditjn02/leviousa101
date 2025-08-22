#!/bin/bash

# Stripe Setup Script for Leviousa
# This script helps you set up Stripe products, prices, and webhooks

echo "🚀 Leviousa Stripe Setup"
echo "======================="
echo ""

# Check if Stripe CLI is available
if ! command -v ./stripe &> /dev/null; then
    echo "❌ Stripe CLI not found. Make sure you've downloaded it to the project directory."
    echo "   You can download it from: https://github.com/stripe/stripe-cli/releases"
    exit 1
fi

echo "✅ Stripe CLI found"
echo ""

# Login to Stripe
echo "🔑 First, you need to log in to Stripe..."
./stripe login

echo ""
echo "📦 Creating Stripe products and prices..."
echo ""

# Create Pro product
echo "Creating Pro subscription product..."
PRO_PRODUCT=$(./stripe products create \
  --name="Leviousa Pro" \
  --description="Unlimited access to all Leviousa features" \
  --format=json | jq -r .id)

if [ "$PRO_PRODUCT" != "null" ] && [ -n "$PRO_PRODUCT" ]; then
    echo "✅ Pro product created: $PRO_PRODUCT"
    
    # Create Pro price (monthly)
    echo "Creating Pro monthly price ($18/month)..."
    PRO_PRICE=$(./stripe prices create \
      --product="$PRO_PRODUCT" \
      --unit-amount=1800 \
      --currency=usd \
      --recurring interval=month \
      --format=json | jq -r .id)
    
    if [ "$PRO_PRICE" != "null" ] && [ -n "$PRO_PRICE" ]; then
        echo "✅ Pro price created: $PRO_PRICE"
        echo ""
        echo "🔧 Add this to your .env file:"
        echo "STRIPE_PRO_PRICE_ID=$PRO_PRICE"
        echo ""
    else
        echo "❌ Failed to create Pro price"
        exit 1
    fi
else
    echo "❌ Failed to create Pro product"
    exit 1
fi

# Set up webhook endpoint
echo "🪝 Setting up webhook endpoint..."
echo ""
echo "Webhook events that will be configured:"
echo "  - checkout.session.completed"
echo "  - customer.subscription.created"
echo "  - customer.subscription.updated" 
echo "  - customer.subscription.deleted"
echo "  - invoice.payment_succeeded"
echo "  - invoice.payment_failed"
echo ""

read -p "Enter your webhook endpoint URL (e.g., https://yourdomain.com/api/stripe/webhook): " WEBHOOK_URL

if [ -n "$WEBHOOK_URL" ]; then
    WEBHOOK=$(./stripe webhooks create \
      --url="$WEBHOOK_URL" \
      --events=checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.payment_failed \
      --format=json | jq -r .id)
    
    if [ "$WEBHOOK" != "null" ] && [ -n "$WEBHOOK" ]; then
        echo "✅ Webhook created: $WEBHOOK"
        
        # Get webhook secret
        WEBHOOK_SECRET=$(./stripe webhooks retrieve "$WEBHOOK" --format=json | jq -r .secret)
        echo ""
        echo "🔧 Add this to your .env file:"
        echo "STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET"
        echo ""
    else
        echo "❌ Failed to create webhook"
    fi
else
    echo "⚠️  Skipping webhook creation (no URL provided)"
fi

echo ""
echo "🎉 Stripe setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Add the environment variables shown above to your .env file"
echo "2. Get your API keys from the Stripe dashboard:"
echo "   - Secret key (sk_test_...): Add as STRIPE_SECRET_KEY"
echo "   - Publishable key (pk_test_...): Add as STRIPE_PUBLISHABLE_KEY"
echo "3. Update your webhook endpoint to handle the events"
echo "4. Test the integration with test cards"
echo ""
echo "🔗 Useful links:"
echo "   - Stripe Dashboard: https://dashboard.stripe.com/"
echo "   - Test Cards: https://stripe.com/docs/testing"
echo "   - Webhook Testing: ./stripe listen --forward-to localhost:3000/api/stripe/webhook"
echo ""



