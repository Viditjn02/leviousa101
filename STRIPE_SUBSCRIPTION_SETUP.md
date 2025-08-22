# Stripe Subscription & Referral System Setup Guide

This guide will help you set up the complete subscription and referral system for Leviousa.

## 🎯 What's Implemented

### Subscription Tiers
- **Free Plan**: 10 minutes daily of cmd+L and browser features, default model only, unlimited everything else
- **Pro Plan**: Everything unlimited, $18/month, all models available

### Referral System
- **Normal Referrals**: Referred person gets 30 min daily, referrer gets 60 min daily (24h reset)
- **Special Referrals** (`viditjn02@gmail.com`, `viditjn@berkeley.edu`, `shreyabhatia63@gmail.com`): Referred person gets 1 day free trial
- **Pro Upgrade Bonus**: When referred person joins Pro, referrer gets 50% off first month (14 days to claim)

## 🚀 Setup Steps

### 1. Environment Variables

Add these to your `.env` file in the project root:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_PRO_PRICE_ID=price_your_pro_price_id_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Web URL for referral links
LEVIOUSA_WEB_URL=https://www.leviousa.com
```

### 2. Stripe CLI Setup

```bash
# Make setup script executable
chmod +x stripe-setup.sh

# Run the setup script
./stripe-setup.sh
```

This script will:
- Create the Pro subscription product in Stripe
- Set up the monthly pricing ($18/month)
- Configure webhook endpoints
- Provide you with the required environment variables

### 3. Manual Stripe Configuration

If you prefer to set up manually:

1. **Create Products in Stripe Dashboard**:
   - Go to https://dashboard.stripe.com/products
   - Create "Leviousa Pro" product
   - Add monthly price of $18.00

2. **Set up Webhooks**:
   - Go to https://dashboard.stripe.com/webhooks
   - Add endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

### 4. Database Migration

The new database schema includes these tables:
- `subscriptions` - User subscription data
- `usage_tracking` - Daily usage limits and tracking
- `referrals` - Referral relationships
- `referral_bonuses` - Bonus minutes from referrals

Run your database migration to create these tables.

### 5. Testing

#### Test Webhook Locally
```bash
# Forward webhooks to local development
./stripe listen --forward-to localhost:3000/api/stripe/webhook
```

#### Test Cards
- **Success**: `4242424242424242`
- **Decline**: `4000000000000002`
- **3D Secure**: `4000002500003155`

## 🏗️ Architecture Overview

### Database Schema

```sql
-- Subscriptions
CREATE TABLE subscriptions (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    current_period_start INTEGER,
    current_period_end INTEGER,
    cancel_at_period_end INTEGER DEFAULT 0,
    created_at INTEGER,
    updated_at INTEGER
);

-- Usage Tracking (daily limits)
CREATE TABLE usage_tracking (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    date TEXT NOT NULL,
    cmd_l_usage_minutes INTEGER DEFAULT 0,
    browser_usage_minutes INTEGER DEFAULT 0,
    cmd_l_limit_minutes INTEGER DEFAULT 10,
    browser_limit_minutes INTEGER DEFAULT 10,
    created_at INTEGER,
    updated_at INTEGER,
    UNIQUE(uid, date)
);

-- Referrals
CREATE TABLE referrals (
    id TEXT PRIMARY KEY,
    referrer_uid TEXT NOT NULL,
    referred_uid TEXT,
    referred_email TEXT NOT NULL,
    referral_code TEXT NOT NULL UNIQUE,
    referral_type TEXT NOT NULL DEFAULT 'normal',
    bonus_applied_to_referred INTEGER DEFAULT 0,
    bonus_applied_to_referrer INTEGER DEFAULT 0,
    referred_joined_pro INTEGER DEFAULT 0,
    discount_code TEXT,
    discount_expires_at INTEGER,
    discount_claimed INTEGER DEFAULT 0,
    created_at INTEGER,
    updated_at INTEGER
);

-- Referral Bonuses
CREATE TABLE referral_bonuses (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    bonus_type TEXT NOT NULL,
    bonus_minutes_cmd_l INTEGER DEFAULT 0,
    bonus_minutes_browser INTEGER DEFAULT 0,
    bonus_expires_at INTEGER,
    applied_at INTEGER,
    referral_id TEXT,
    created_at INTEGER
);
```

### Service Layer

- **SubscriptionService**: Manages Stripe integration, subscription lifecycle
- **ReferralService**: Handles referral creation, bonus application, discount management
- **UsageTrackingRepository**: Tracks daily usage and applies limits

### Repository Pattern

All data access follows the dual SQLite/Firebase pattern:
- Local SQLite for offline users
- Firebase for authenticated users
- Automatic encryption for sensitive data

## 🔌 Integration Points

### Frontend (Next.js Web App)

New pages and components:
- `/settings/billing` - Subscription management
- `/referrals` - Referral program dashboard
- API endpoints for subscription and referral operations

### Electron App Integration

The subscription and referral services need to be integrated into:
- Feature usage checks (cmd+L, browser features)
- Model access restrictions
- Daily usage reset logic

Example integration:
```javascript
// Before allowing cmd+L usage
const usageAllowed = await subscriptionService.checkUsageAllowed('cmd_l');
if (!usageAllowed.allowed) {
    // Show upgrade prompt or usage limit message
    return;
}

// Track usage
await usageTrackingRepository.trackUsage('cmd_l', minutesUsed);
```

## 🎛️ Admin Features

### Usage Analytics
```javascript
// Get user usage statistics
const usage = await usageTrackingRepository.getUserUsageHistory(uid);

// Get subscription analytics
const subscriptions = await subscriptionRepository.getActiveSubscriptions();
```

### Referral Management
```javascript
// Get referral statistics
const stats = await referralService.getUserReferralStats();

// Process bulk referral rewards
const processed = await referralService.processPendingBonuses();
```

## 🔄 Webhook Handling

The system handles these Stripe webhook events:

1. **checkout.session.completed**: User completes subscription purchase
2. **customer.subscription.updated**: Subscription changes (upgrade/downgrade)
3. **customer.subscription.deleted**: Subscription canceled
4. **invoice.payment_succeeded**: Successful payment
5. **invoice.payment_failed**: Failed payment (mark as past due)

## 🚨 Important Notes

### Security
- All Stripe data is encrypted in Firebase
- API keys are stored securely in environment variables
- Webhook signatures are verified

### Rate Limiting
- Usage tracking is reset daily at midnight UTC
- Referral bonuses expire after 24 hours for normal referrals
- Special referral bonuses last exactly 24 hours

### Testing
- Use Stripe test mode for development
- Test all webhook events thoroughly
- Verify usage limits and bonus calculations

## 📱 User Experience

### Free Users
- See usage progress bars in billing page
- Get upgrade prompts when limits reached
- Can create and manage referrals for bonus time

### Pro Users
- Unlimited access to all features
- Can still earn referral bonuses (for potential future use)
- Clear billing information and cancellation options

### Referral Flow
1. User creates referral with email
2. Referral link is generated and shared
3. Referred person signs up with link
4. Bonuses are automatically applied
5. If referred person upgrades to Pro, referrer gets discount

## 🎉 You're All Set!

Once configured, users can:
- ✅ Sign up for Pro subscriptions via Stripe
- ✅ Track their daily usage limits
- ✅ Create and manage referrals
- ✅ Earn bonus usage time
- ✅ Get discounts for successful Pro referrals
- ✅ Cancel and manage subscriptions

The system automatically handles all billing, usage tracking, and referral bonus calculations!



