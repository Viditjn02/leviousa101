const Stripe = require('stripe');
const subscriptionRepository = require('../repositories/subscription');
const usageTrackingRepository = require('../repositories/usageTracking');
const authService = require('./authService');

class SubscriptionService {
    constructor() {
        // Initialize Stripe with secret key from environment (conditional)
        this.stripe = null;
        if (process.env.STRIPE_SECRET_KEY) {
            try {
                this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
                console.log('[SubscriptionService] ✅ Stripe initialized for payment processing');
            } catch (error) {
                console.warn('[SubscriptionService] ⚠️ Stripe initialization failed:', error.message);
            }
        } else {
            console.log('[SubscriptionService] ℹ️ Stripe not configured - payment processing disabled, plan checking enabled');
        }
        
        // Subscription plans configuration
        this.plans = {
            free: {
                name: 'Free',
                price: 0,
                cmd_l_daily_minutes: 3,  // Reduced from 10 to 3 minutes
                browser_daily_minutes: 10,
                features: {
                    default_model_only: true,
                    integrations_unlimited: false, // ❌ NO INTEGRATIONS FOR FREE USERS
                    summaries_unlimited: true,
                    transcripts_unlimited: true
                }
            },
            pro: {
                name: 'Pro',
                price: 18,
                stripe_price_id: process.env.STRIPE_PRO_PRICE_ID,
                cmd_l_daily_minutes: -1, // -1 means unlimited
                browser_daily_minutes: -1,
                features: {
                    all_models: true,
                    integrations_unlimited: true,
                    summaries_unlimited: true,
                    transcripts_unlimited: true,
                    priority_support: true
                }
            }
        };
    }

    async getCurrentUserSubscription() {
        try {
            const authService = require('./authService');
            const currentUser = authService.getCurrentUser();
            
            console.log('[SubscriptionService] 🔍 Getting subscription for user:', currentUser);
            console.log('[SubscriptionService] 🔍 User email:', currentUser?.email);
            
            // 🎯 Call web API directly instead of local SQLite for real-time pro status
            console.log('[SubscriptionService] 🌐 Calling web API for real subscription status...');
            
            let subscription = null;
            
            if (currentUser && currentUser.mode === 'firebase') {
                try {
                    // 🎯 Electron app: Create mock token with user info for API authentication
                    const mockPayload = {
                        user_id: currentUser.uid,
                        sub: currentUser.uid,
                        uid: currentUser.uid,
                        email: currentUser.email,
                        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour from now
                    };
                    
                    // Create a simple JWT-like token (for development - in production this should be proper Firebase token)
                    const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify(mockPayload)).toString('base64')}.mock-signature`;
                    console.log('[SubscriptionService] 🔑 Created token for web API authentication');
                    
                    const response = await fetch(`${process.env.leviousa_WEB_URL}/api/subscription/check-access`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ featureType: 'general' })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        // Transform check-access response to subscription format
                        subscription = {
                            plan: data.plan,
                            status: 'active',
                            uid: currentUser.uid,
                            stripe_customer_id: null,
                            stripe_subscription_id: null
                        };
                        console.log('[SubscriptionService] 🌐 Got subscription from web API check-access:', subscription);
                    } else {
                        console.warn('[SubscriptionService] ⚠️ Web API call failed, falling back to local');
                        subscription = await subscriptionRepository.getCurrentUserSubscription();
                    }
                } catch (apiError) {
                    console.warn('[SubscriptionService] ⚠️ Web API error, falling back to local:', apiError.message);
                    subscription = await subscriptionRepository.getCurrentUserSubscription();
                }
            } else {
                console.log('[SubscriptionService] 🔍 Getting subscription from local database for non-firebase user');
                subscription = await subscriptionRepository.getCurrentUserSubscription();
            }
            
            console.log('[SubscriptionService] 🔍 Final subscription:', subscription);
            
            // Use subscription as-is from database/API - no special email handling
            console.log('[SubscriptionService] ✅ Using subscription:', subscription.plan, subscription.status);
            
            // Apply usage limits based on subscription plan (skip if no auth context)
            try {
                if (subscription.plan === 'pro') {
                    // Pro users have unlimited usage
                    console.log('[SubscriptionService] 👑 Setting unlimited usage for pro/special user');
                    await usageTrackingRepository.updateUserLimits(-1, -1);
                } else {
                    // Free users have daily limits
                    console.log('[SubscriptionService] 🆓 Setting daily limits for free user:', {
                        cmd_l: this.plans.free.cmd_l_daily_minutes,
                        browser: this.plans.free.browser_daily_minutes
                    });
                    await usageTrackingRepository.updateUserLimits(
                        this.plans.free.cmd_l_daily_minutes,
                        this.plans.free.browser_daily_minutes
                    );
                }
            } catch (limitError) {
                console.warn('[SubscriptionService] ⚠️ Could not update usage limits (API context):', limitError.message);
                // Continue without updating limits - this is OK for subscription checking
            }
            
            return {
                ...subscription,
                plan_details: this.plans[subscription.plan] || this.plans.free,
                database_driven: true
            };
        } catch (error) {
            console.error('[SubscriptionService] Error getting user subscription:', error);
            throw error;
        }
    }

    async createStripeCustomer(userEmail, userId) {
        try {
            const customer = await this.stripe.customers.create({
                email: userEmail,
                metadata: {
                    user_id: userId
                }
            });

            return customer;
        } catch (error) {
            console.error('[SubscriptionService] Error creating Stripe customer:', error);
            throw error;
        }
    }

    async createCheckoutSession(planType = 'pro', successUrl, cancelUrl) {
        try {
            const uid = authService.getCurrentUserId();
            const currentUser = authService.getCurrentUser();
            
            if (!uid || !currentUser) {
                throw new Error('User must be authenticated to create checkout session');
            }

            if (planType !== 'pro') {
                throw new Error('Only pro plan is available for purchase');
            }

            // Get or create Stripe customer
            let subscription = await subscriptionRepository.findByUserId(uid);
            let customerId = subscription?.stripe_customer_id;

            if (!customerId) {
                const customer = await this.createStripeCustomer(currentUser.email, uid);
                customerId = customer.id;

                // Update or create subscription with customer ID
                if (subscription) {
                    await subscriptionRepository.update(subscription.id, {
                        stripe_customer_id: customerId
                    });
                } else {
                    subscription = await subscriptionRepository.create({
                        stripe_customer_id: customerId,
                        plan: 'free',
                        status: 'active'
                    });
                }
            }

            // Create checkout session
            const session = await this.stripe.checkout.sessions.create({
                customer: customerId,
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: this.plans[planType].stripe_price_id,
                        quantity: 1,
                    },
                ],
                mode: 'subscription',
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    user_id: uid,
                    plan: planType
                }
            });

            return {
                sessionId: session.id,
                url: session.url
            };
        } catch (error) {
            console.error('[SubscriptionService] Error creating checkout session:', error);
            throw error;
        }
    }

    async handleStripeWebhook(event) {
        try {
            console.log('[SubscriptionService] Processing webhook event:', event.type);

            switch (event.type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutCompleted(event.data.object);
                    break;

                case 'customer.subscription.created':
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event.data.object);
                    break;

                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object);
                    break;

                case 'invoice.payment_succeeded':
                    await this.handlePaymentSucceeded(event.data.object);
                    break;

                case 'invoice.payment_failed':
                    await this.handlePaymentFailed(event.data.object);
                    break;

                default:
                    console.log('[SubscriptionService] Unhandled event type:', event.type);
            }

            return { received: true };
        } catch (error) {
            console.error('[SubscriptionService] Error handling webhook:', error);
            throw error;
        }
    }

    async handleCheckoutCompleted(session) {
        try {
            const customerId = session.customer;
            const subscriptionId = session.subscription;
            const metadata = session.metadata;

            console.log('[SubscriptionService] Checkout completed for customer:', customerId);

            // Find user subscription by customer ID
            const subscription = await subscriptionRepository.findByStripeCustomerId(customerId);
            if (!subscription) {
                console.error('[SubscriptionService] No subscription found for customer:', customerId);
                return;
            }

            // Update subscription with Stripe subscription ID
            await subscriptionRepository.update(subscription.id, {
                stripe_subscription_id: subscriptionId,
                plan: metadata.plan || 'pro',
                status: 'active'
            });

            console.log('[SubscriptionService] Subscription updated for checkout completion');
        } catch (error) {
            console.error('[SubscriptionService] Error handling checkout completion:', error);
            throw error;
        }
    }

    async handleSubscriptionUpdated(stripeSubscription) {
        try {
            const subscription = await subscriptionRepository.findByStripeSubscriptionId(stripeSubscription.id);
            if (!subscription) {
                console.error('[SubscriptionService] No subscription found for Stripe subscription:', stripeSubscription.id);
                return;
            }

            // Determine plan from Stripe subscription
            let plan = 'free';
            if (stripeSubscription.items.data.length > 0) {
                const priceId = stripeSubscription.items.data[0].price.id;
                if (priceId === this.plans.pro.stripe_price_id) {
                    plan = 'pro';
                }
            }

            await subscriptionRepository.update(subscription.id, {
                plan: plan,
                status: stripeSubscription.status,
                current_period_start: stripeSubscription.current_period_start * 1000,
                current_period_end: stripeSubscription.current_period_end * 1000,
                cancel_at_period_end: stripeSubscription.cancel_at_period_end ? 1 : 0
            });

            console.log('[SubscriptionService] Subscription updated from Stripe webhook');
        } catch (error) {
            console.error('[SubscriptionService] Error handling subscription update:', error);
            throw error;
        }
    }

    async handleSubscriptionDeleted(stripeSubscription) {
        try {
            const subscription = await subscriptionRepository.findByStripeSubscriptionId(stripeSubscription.id);
            if (!subscription) {
                console.error('[SubscriptionService] No subscription found for deleted Stripe subscription:', stripeSubscription.id);
                return;
            }

            await subscriptionRepository.update(subscription.id, {
                plan: 'free',
                status: 'canceled',
                stripe_subscription_id: null
            });

            console.log('[SubscriptionService] Subscription downgraded to free after cancellation');
        } catch (error) {
            console.error('[SubscriptionService] Error handling subscription deletion:', error);
            throw error;
        }
    }

    async handlePaymentSucceeded(invoice) {
        console.log('[SubscriptionService] Payment succeeded for invoice:', invoice.id);
        // Additional logic for successful payments if needed
    }

    async handlePaymentFailed(invoice) {
        try {
            const customerId = invoice.customer;
            const subscription = await subscriptionRepository.findByStripeCustomerId(customerId);
            
            if (subscription) {
                await subscriptionRepository.update(subscription.id, {
                    status: 'past_due'
                });
            }

            console.log('[SubscriptionService] Subscription marked as past due for failed payment');
        } catch (error) {
            console.error('[SubscriptionService] Error handling payment failure:', error);
            throw error;
        }
    }

    async cancelSubscription() {
        try {
            const uid = authService.getCurrentUserId();
            if (!uid) {
                throw new Error('User must be authenticated to cancel subscription');
            }

            const subscription = await subscriptionRepository.findByUserId(uid);
            if (!subscription || !subscription.stripe_subscription_id) {
                throw new Error('No active subscription found');
            }

            // Cancel at period end (don't immediately cancel)
            await this.stripe.subscriptions.update(subscription.stripe_subscription_id, {
                cancel_at_period_end: true
            });

            // Update local subscription record
            await subscriptionRepository.update(subscription.id, {
                cancel_at_period_end: 1
            });

            return { success: true, message: 'Subscription will be canceled at the end of the current period' };
        } catch (error) {
            console.error('[SubscriptionService] Error canceling subscription:', error);
            throw error;
        }
    }

    async reactivateSubscription() {
        try {
            const uid = authService.getCurrentUserId();
            if (!uid) {
                throw new Error('User must be authenticated to reactivate subscription');
            }

            const subscription = await subscriptionRepository.findByUserId(uid);
            if (!subscription || !subscription.stripe_subscription_id) {
                throw new Error('No subscription found');
            }

            // Remove cancellation
            await this.stripe.subscriptions.update(subscription.stripe_subscription_id, {
                cancel_at_period_end: false
            });

            // Update local subscription record
            await subscriptionRepository.update(subscription.id, {
                cancel_at_period_end: 0
            });

            return { success: true, message: 'Subscription reactivated successfully' };
        } catch (error) {
            console.error('[SubscriptionService] Error reactivating subscription:', error);
            throw error;
        }
    }

    async checkFeatureAccess(feature) {
        try {
            const subscription = await this.getCurrentUserSubscription();
            const planFeatures = subscription.plan_details.features;

            return planFeatures[feature] || false;
        } catch (error) {
            console.error('[SubscriptionService] Error checking feature access:', error);
            return false;
        }
    }

    async checkUsageAllowed(usageType) {
        try {
            // First check if user is authenticated and get their web API status
            const authService = require('./authService');
            const currentUser = authService.getCurrentUser();
            
            if (currentUser && currentUser.mode === 'firebase') {
                console.log('[SubscriptionService] 🌐 Checking usage via web API...');
                
                try {
                    // Call web API to get real usage status with referral bonuses
                    const fetch = require('node-fetch');
                    
                    console.log('[SubscriptionService] 🔍 Getting ID token from Firebase user...');
                    const firebaseUser = authService.getFirebaseUser();
                    console.log('[SubscriptionService] 🔍 Firebase user type:', typeof firebaseUser);
                    console.log('[SubscriptionService] 🔍 Has getIdToken method:', typeof firebaseUser?.getIdToken);
                    
                    let idToken = null;
                    try {
                        if (firebaseUser?.getIdToken && typeof firebaseUser.getIdToken === 'function') {
                            idToken = await firebaseUser.getIdToken();
                            console.log('[SubscriptionService] ✅ Got ID token from Firebase user');
                        } else {
                            console.log('[SubscriptionService] ⚠️ Development mode - no getIdToken method, using fallback');
                            // In development mode, fallback to local subscription check
                            throw new Error('Development mode - using local subscription check');
                        }
                    } catch (tokenError) {
                        console.log('[SubscriptionService] ⚠️ ID token error, falling back to local check:', tokenError.message);
                        throw tokenError;
                    }
                    
                    const response = await fetch(`${process.env.LEVIOUSA_WEB_URL || 'https://www.leviousa.com'}/api/usage/status`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${idToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        const usage = data.usage;
                        
                        // Map usage types
                        const usageMap = {
                            'cmd_l': {
                                used: usage.auto_answer_used,
                                limit: usage.auto_answer_limit,
                                remaining: usage.auto_answer_remaining
                            },
                            'browser': {
                                used: usage.browser_used,
                                limit: usage.browser_limit, 
                                remaining: usage.browser_remaining
                            }
                        };
                        
                        const typeData = usageMap[usageType];
                        if (!typeData) {
                            throw new Error(`Invalid usage type: ${usageType}`);
                        }
                        
                        console.log(`[SubscriptionService] ✅ Web API usage check - ${usageType}: ${typeData.used}/${typeData.limit} (${typeData.remaining} remaining)`);
                        
                        return {
                            allowed: typeData.limit === -1 || typeData.used < typeData.limit,
                            unlimited: typeData.limit === -1,
                            usage: typeData.used,
                            limit: typeData.limit,
                            remaining: typeData.remaining,
                            subscription_plan: usage.subscription_plan,
                            referral_bonus: usage.referral_bonus
                        };
                    } else {
                        console.log('[SubscriptionService] ⚠️ Web API unavailable, falling back to local check');
                    }
                } catch (webApiError) {
                    console.log('[SubscriptionService] ⚠️ Web API error, falling back to local check:', webApiError.message);
                }
            }
            
            // Fallback to local subscription check
            console.log('[SubscriptionService] 🔄 Using local subscription fallback...');
            const subscription = await this.getCurrentUserSubscription();
            console.log('[SubscriptionService] 🔍 Local subscription:', subscription);
            
            // Pro users have unlimited access
            if (subscription.plan === 'pro') {
                console.log('[SubscriptionService] 👑 Pro user detected - unlimited access granted');
                return { allowed: true, unlimited: true };
            }

            // Check usage limits for free users using local data
            console.log('[SubscriptionService] 🆓 Free user - checking local usage limits...');
            const usageStatus = await usageTrackingRepository.checkUsageLimit(usageType);
            console.log('[SubscriptionService] 🔍 Local usage status:', usageStatus);
            
            return {
                allowed: usageStatus.canUse,
                unlimited: false,
                usage: usageStatus.usage,
                limit: usageStatus.limit,
                remaining: usageStatus.remaining
            };
        } catch (error) {
            console.error('[SubscriptionService] Error checking usage allowance:', error);
            return { allowed: false, error: error.message };
        }
    }

    async trackUsageToWebAPI(usageType, minutesUsed) {
        try {
            const authService = require('./authService');
            const currentUser = authService.getCurrentUser();
            
            if (currentUser && currentUser.mode === 'firebase') {
                console.log(`[SubscriptionService] 📊 Tracking ${usageType} usage to web API: ${minutesUsed} minutes`);
                
                try {
                    const fetch = require('node-fetch');
                    const firebaseUser = authService.getFirebaseUser();
                    const idToken = await firebaseUser.getIdToken();
                    
                    // Map usage types to web API format
                    const usageTypeMap = {
                        'cmd_l': 'auto_answer',
                        'browser': 'browser'
                    };
                    
                    const webUsageType = usageTypeMap[usageType];
                    if (!webUsageType) {
                        throw new Error(`Invalid usage type: ${usageType}`);
                    }
                    
                    const response = await fetch(`${process.env.LEVIOUSA_WEB_URL || 'https://www.leviousa.com'}/api/usage/track`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${idToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            usage_type: webUsageType,
                            minutes_used: minutesUsed
                        })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('[SubscriptionService] ✅ Usage tracked to web API successfully');
                        return data;
                    } else {
                        console.log('[SubscriptionService] ⚠️ Web API tracking failed, using local tracking');
                    }
                } catch (webApiError) {
                    console.log('[SubscriptionService] ⚠️ Web API tracking error:', webApiError.message);
                }
            }
            
            // Fallback to local usage tracking
            await usageTrackingRepository.trackUsage(usageType, minutesUsed);
            console.log('[SubscriptionService] ✅ Usage tracked locally');
            
        } catch (error) {
            console.error('[SubscriptionService] Error tracking usage:', error);
        }
    }

    /**
     * Check if user has access to integrations based on subscription
     * @returns {Object} Access status and upgrade info
     */
    async checkIntegrationsAccess() {
        try {
            console.log('[SubscriptionService] 🔍 Starting integration access check...');
            
            // 🎯 Use web API for integration access check (real-time)
            const authService = require('./authService');
            const currentUser = authService.getCurrentUser();
            
            if (currentUser && currentUser.mode === 'firebase') {
                try {
                    console.log('[SubscriptionService] 🌐 Calling web API for integration access check...');
                    
                    // 🎯 Electron app: Create mock token with user info for API authentication
                    const mockPayload = {
                        user_id: currentUser.uid,
                        sub: currentUser.uid,
                        uid: currentUser.uid,
                        email: currentUser.email,
                        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour from now
                    };
                    
                    const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify(mockPayload)).toString('base64')}.mock-signature`;
                    console.log('[SubscriptionService] 🔑 Created token for integration access check');
                    
                    const response = await fetch(`${process.env.leviousa_WEB_URL}/api/subscription/check-access`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ featureType: 'integrations' })
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        console.log('[SubscriptionService] 🌐 Integration access result from web API:', result);
                        return {
                            allowed: result.allowed,
                            plan: result.plan,
                            message: result.message,
                            requiresUpgrade: result.requiresUpgrade
                        };
                    } else {
                        console.warn('[SubscriptionService] ⚠️ Web API integration check failed, falling back to local');
                    }
                } catch (apiError) {
                    console.warn('[SubscriptionService] ⚠️ Web API integration check error:', apiError.message);
                }
            }
            
            // Fallback to local subscription check
            console.log('[SubscriptionService] 🔄 Using local subscription for integration access...');
            const subscription = await this.getCurrentUserSubscription();
            console.log('[SubscriptionService] 📊 Got subscription:', subscription);
            
            const plan = this.plans[subscription.plan] || this.plans.free;
            console.log('[SubscriptionService] 📋 Using plan config:', plan.name, plan.features);
            console.log('[SubscriptionService] 🔍 Integration unlimited flag:', plan.features.integrations_unlimited);
            
            const hasAccess = plan.features.integrations_unlimited === true;
            
            console.log(`[SubscriptionService] Integration access check: ${hasAccess ? 'ALLOWED' : 'BLOCKED'} for ${subscription.plan} plan`);
            
            return {
                allowed: hasAccess,
                plan: subscription.plan,
                message: hasAccess ? 
                    'Integrations access granted' : 
                    'Integrations are only available with Leviousa Pro subscription',
                requiresUpgrade: !hasAccess
            };
        } catch (error) {
            console.error('[SubscriptionService] ❌ Error checking integrations access:', error);
            console.error('[SubscriptionService] ❌ Error stack:', error.stack);
            return {
                allowed: false,
                plan: 'unknown',
                message: 'Unable to verify subscription status',
                requiresUpgrade: true,
                error: error.message
            };
        }
    }

    /**
     * Check if user can use a specific integration service
     * @param {string} serviceName - Name of the integration service (gmail, notion, etc.)
     * @returns {Object} Access status
     */
    async checkServiceAccess(serviceName) {
        const integrationAccess = await this.checkIntegrationsAccess();
        
        if (!integrationAccess.allowed) {
            return {
                ...integrationAccess,
                service: serviceName,
                message: `${serviceName} integration requires Leviousa Pro subscription`
            };
        }
        
        return {
            allowed: true,
            service: serviceName,
            plan: integrationAccess.plan,
            message: `${serviceName} integration access granted`
        };
    }
}

const subscriptionService = new SubscriptionService();
module.exports = subscriptionService;

