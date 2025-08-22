const LATEST_SCHEMA = {
    users: {
        columns: [
            { name: 'uid', type: 'TEXT PRIMARY KEY' },
            { name: 'display_name', type: 'TEXT NOT NULL' },
            { name: 'email', type: 'TEXT NOT NULL' },
            { name: 'created_at', type: 'INTEGER' },
            { name: 'auto_update_enabled', type: 'INTEGER DEFAULT 1' },
            { name: 'has_migrated_to_firebase', type: 'INTEGER DEFAULT 0' }
        ]
    },
    sessions: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'uid', type: 'TEXT NOT NULL' },
            { name: 'title', type: 'TEXT' },
            { name: 'session_type', type: 'TEXT DEFAULT \'ask\'' },
            { name: 'started_at', type: 'INTEGER' },
            { name: 'ended_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' },
            { name: 'updated_at', type: 'INTEGER' }
        ]
    },
    transcripts: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'session_id', type: 'TEXT NOT NULL' },
            { name: 'start_at', type: 'INTEGER' },
            { name: 'end_at', type: 'INTEGER' },
            { name: 'speaker', type: 'TEXT' },
            { name: 'text', type: 'TEXT' },
            { name: 'lang', type: 'TEXT' },
            { name: 'created_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' }
        ]
    },
    ai_messages: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'session_id', type: 'TEXT NOT NULL' },
            { name: 'sent_at', type: 'INTEGER' },
            { name: 'role', type: 'TEXT' },
            { name: 'content', type: 'TEXT' },
            { name: 'tokens', type: 'INTEGER' },
            { name: 'model', type: 'TEXT' },
            { name: 'created_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' }
        ]
    },
    summaries: {
        columns: [
            { name: 'session_id', type: 'TEXT PRIMARY KEY' },
            { name: 'generated_at', type: 'INTEGER' },
            { name: 'model', type: 'TEXT' },
            { name: 'text', type: 'TEXT' },
            { name: 'tldr', type: 'TEXT' },
            { name: 'bullet_json', type: 'TEXT' },
            { name: 'action_json', type: 'TEXT' },
            { name: 'tokens_used', type: 'INTEGER' },
            { name: 'updated_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' }
        ]
    },
    prompt_presets: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'uid', type: 'TEXT NOT NULL' },
            { name: 'title', type: 'TEXT NOT NULL' },
            { name: 'prompt', type: 'TEXT NOT NULL' },
            { name: 'is_default', type: 'INTEGER NOT NULL' },
            { name: 'created_at', type: 'INTEGER' },
            { name: 'sync_state', type: 'TEXT DEFAULT \'clean\'' }
        ]
    },
    ollama_models: {
        columns: [
            { name: 'name', type: 'TEXT PRIMARY KEY' },
            { name: 'size', type: 'TEXT NOT NULL' },
            { name: 'installed', type: 'INTEGER DEFAULT 0' },
            { name: 'installing', type: 'INTEGER DEFAULT 0' }
        ]
    },
    whisper_models: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'name', type: 'TEXT NOT NULL' },
            { name: 'size', type: 'TEXT NOT NULL' },
            { name: 'installed', type: 'INTEGER DEFAULT 0' },
            { name: 'installing', type: 'INTEGER DEFAULT 0' }
        ]
    },
    provider_settings: {
        columns: [
            { name: 'provider', type: 'TEXT NOT NULL' },
            { name: 'api_key', type: 'TEXT' },
            { name: 'selected_llm_model', type: 'TEXT' },
            { name: 'selected_stt_model', type: 'TEXT' },
            { name: 'is_active_llm', type: 'INTEGER DEFAULT 0' },
            { name: 'is_active_stt', type: 'INTEGER DEFAULT 0' },
            { name: 'created_at', type: 'INTEGER' },
            { name: 'updated_at', type: 'INTEGER' }
        ],
        constraints: ['PRIMARY KEY (provider)']
    },
    shortcuts: {
        columns: [
            { name: 'action', type: 'TEXT PRIMARY KEY' },
            { name: 'accelerator', type: 'TEXT NOT NULL' },
            { name: 'created_at', type: 'INTEGER' }
        ]
    },
    permissions: {
        columns: [
            { name: 'uid', type: 'TEXT PRIMARY KEY' },
            { name: 'keychain_completed', type: 'INTEGER DEFAULT 0' }
        ]
    },
    subscriptions: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'uid', type: 'TEXT NOT NULL' },
            { name: 'stripe_customer_id', type: 'TEXT' },
            { name: 'stripe_subscription_id', type: 'TEXT' },
            { name: 'plan', type: 'TEXT NOT NULL DEFAULT \'free\'' }, // 'free', 'pro'
            { name: 'status', type: 'TEXT NOT NULL DEFAULT \'active\'' }, // 'active', 'canceled', 'past_due', 'trialing'
            { name: 'current_period_start', type: 'INTEGER' },
            { name: 'current_period_end', type: 'INTEGER' },
            { name: 'cancel_at_period_end', type: 'INTEGER DEFAULT 0' },
            { name: 'trial_start', type: 'INTEGER' },
            { name: 'trial_end', type: 'INTEGER' },
            { name: 'created_at', type: 'INTEGER' },
            { name: 'updated_at', type: 'INTEGER' }
        ]
    },
    usage_tracking: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'uid', type: 'TEXT NOT NULL' },
            { name: 'date', type: 'TEXT NOT NULL' }, // YYYY-MM-DD format for daily tracking
            { name: 'cmd_l_usage_minutes', type: 'INTEGER DEFAULT 0' },
            { name: 'browser_usage_minutes', type: 'INTEGER DEFAULT 0' },
            { name: 'cmd_l_limit_minutes', type: 'INTEGER DEFAULT 10' }, // Daily limit for cmd+L
            { name: 'browser_limit_minutes', type: 'INTEGER DEFAULT 10' }, // Daily limit for browser
            { name: 'created_at', type: 'INTEGER' },
            { name: 'updated_at', type: 'INTEGER' }
        ],
        constraints: ['UNIQUE(uid, date)']
    },
    referrals: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'referrer_uid', type: 'TEXT NOT NULL' }, // User who sent the referral
            { name: 'referred_uid', type: 'TEXT' }, // User who was referred (null until they sign up)
            { name: 'referred_email', type: 'TEXT NOT NULL' }, // Email of the referred user
            { name: 'referral_code', type: 'TEXT NOT NULL UNIQUE' },
            { name: 'referral_type', type: 'TEXT NOT NULL DEFAULT \'normal\'' }, // 'normal', 'special'
            { name: 'bonus_applied_to_referred', type: 'INTEGER DEFAULT 0' }, // Whether bonus was applied to referred user
            { name: 'bonus_applied_to_referrer', type: 'INTEGER DEFAULT 0' }, // Whether bonus was applied to referrer
            { name: 'referred_joined_pro', type: 'INTEGER DEFAULT 0' }, // Whether referred user joined pro
            { name: 'discount_code', type: 'TEXT' }, // Stripe discount code for referrer if applicable
            { name: 'discount_expires_at', type: 'INTEGER' }, // Expiry time for discount (14 days)
            { name: 'discount_claimed', type: 'INTEGER DEFAULT 0' }, // Whether discount was claimed
            { name: 'created_at', type: 'INTEGER' },
            { name: 'updated_at', type: 'INTEGER' }
        ]
    },
    referral_bonuses: {
        columns: [
            { name: 'id', type: 'TEXT PRIMARY KEY' },
            { name: 'uid', type: 'TEXT NOT NULL' },
            { name: 'bonus_type', type: 'TEXT NOT NULL' }, // 'referred_signup', 'referrer_bonus', 'special_trial'
            { name: 'bonus_minutes_cmd_l', type: 'INTEGER DEFAULT 0' },
            { name: 'bonus_minutes_browser', type: 'INTEGER DEFAULT 0' },
            { name: 'bonus_expires_at', type: 'INTEGER' }, // When bonus expires
            { name: 'applied_at', type: 'INTEGER' },
            { name: 'referral_id', type: 'TEXT' }, // Reference to referrals table
            { name: 'created_at', type: 'INTEGER' }
        ]
    }
};

module.exports = LATEST_SCHEMA; 