const Stripe = require('stripe');
const subscriptionRepository = require('../repositories/subscription');
const usageTrackingRepository = require('../repositories/usageTracking');
const authService = require('./authService');

class SubscriptionService {
    constructor() {
        // Initialize Stripe with secret key from environment
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        
        // Subscription plans configuration
        this.plans = {
            free: {
                name: 'Free',
                price: 0,
                cmd_l_daily_minutes: 10,
                browser_daily_minutes: 10,
                features: {
                    default_model_only: true,
                    integrations_unlimited: true,
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
            
            // Check if this is a special email that should get automatic Pro access
            const specialEmails = ['viditjn02@gmail.com', 'viditjn@berkeley.edu', 'shreyabhatia63@gmail.com'];
            const isSpecialEmail = currentUser && specialEmails.includes(currentUser.email);
            
            let subscription = await subscriptionRepository.getCurrentUserSubscription();
            
            // Auto-upgrade special emails to Pro
            if (isSpecialEmail && subscription.plan !== 'pro') {
                console.log('[SubscriptionService] 👑 Auto-upgrading special email to Pro subscription');
                
                // Update the subscription to Pro in the local database
                if (subscription.id) {
                    subscription = await subscriptionRepository.update(subscription.id, {
                        plan: 'pro',
                        status: 'active'
                    });
                } else {
                    subscription = await subscriptionRepository.create({
                        plan: 'pro',
                        status: 'active'
                    });
                }
            }
            
            // Apply usage limits based on subscription plan
            if (subscription.plan === 'pro' || isSpecialEmail) {
                // Pro users and special emails have unlimited usage
                await usageTrackingRepository.updateUserLimits(-1, -1);
            } else {
                // Free users have daily limits
                await usageTrackingRepository.updateUserLimits(
                    this.plans.free.cmd_l_daily_minutes,
                    this.plans.free.browser_daily_minutes
                );
            }
            
            return {
                ...subscription,
                plan_details: this.plans[subscription.plan] || this.plans.free,
                is_special_email: isSpecialEmail
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
                    const idToken = await currentUser.getIdToken();
                    
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
            const subscription = await this.getCurrentUserSubscription();
            
            // Pro users have unlimited access
            if (subscription.plan === 'pro') {
                return { allowed: true, unlimited: true };
            }

            // Check usage limits for free users using local data
            const usageStatus = await usageTrackingRepository.checkUsageLimit(usageType);
            
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
                    const idToken = await currentUser.getIdToken();
                    
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
}

const subscriptionService = new SubscriptionService();
module.exports = subscriptionService;

