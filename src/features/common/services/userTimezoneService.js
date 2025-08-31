/**
 * User Timezone Detection and Management Service
 * 
 * This service detects the user's timezone from the frontend and provides
 * it to backend calendar operations to fix "Invalid time value" errors.
 * 
 * Based on commit 817b99eec5e64878d3a5e05daf17f20cb8f8e076 analysis
 */

class UserTimezoneService {
    constructor() {
        this.userTimezone = null;
        this.fallbackTimezone = 'UTC';
        this.timezoneDetected = false;
    }

    /**
     * Initialize timezone service
     * This should be called during app startup
     */
    async initialize() {
        try {
            console.log('[UserTimezone] Initializing timezone service...');
            
            // Try to get timezone from various sources
            await this.detectUserTimezone();
            
            console.log(`[UserTimezone] ✅ Timezone service initialized: ${this.userTimezone}`);
        } catch (error) {
            console.error('[UserTimezone] ❌ Failed to initialize timezone service:', error);
            this.userTimezone = this.fallbackTimezone;
        }
    }

    /**
     * Detect user timezone using multiple methods
     */
    async detectUserTimezone() {
        let detectedTimezone = null;

        // Method 1: Try Intl API (most reliable)
        try {
            detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            console.log(`[UserTimezone] Detected timezone via Intl API: ${detectedTimezone}`);
        } catch (error) {
            console.warn('[UserTimezone] Intl API timezone detection failed:', error);
        }

        // Method 2: Try getTimezoneOffset as fallback
        if (!detectedTimezone) {
            try {
                const offset = new Date().getTimezoneOffset();
                detectedTimezone = this.offsetToTimezone(offset);
                console.log(`[UserTimezone] Detected timezone via offset (${offset}): ${detectedTimezone}`);
            } catch (error) {
                console.warn('[UserTimezone] Offset timezone detection failed:', error);
            }
        }

        // Method 3: Use fallback
        if (!detectedTimezone) {
            detectedTimezone = this.fallbackTimezone;
            console.log(`[UserTimezone] Using fallback timezone: ${detectedTimezone}`);
        }

        this.userTimezone = detectedTimezone;
        this.timezoneDetected = true;

        return detectedTimezone;
    }

    /**
     * Convert timezone offset to timezone string (approximate)
     */
    offsetToTimezone(offsetMinutes) {
        const offsetHours = -offsetMinutes / 60;
        const offsetMap = {
            '-12': 'Pacific/Kwajalein',
            '-11': 'Pacific/Midway',
            '-10': 'Pacific/Honolulu',
            '-9': 'America/Anchorage',
            '-8': 'America/Los_Angeles',
            '-7': 'America/Denver',
            '-6': 'America/Chicago',
            '-5': 'America/New_York',
            '-4': 'America/Halifax',
            '-3': 'America/Sao_Paulo',
            '-2': 'Atlantic/South_Georgia',
            '-1': 'Atlantic/Azores',
            '0': 'Europe/London',
            '1': 'Europe/Berlin',
            '2': 'Europe/Helsinki',
            '3': 'Europe/Moscow',
            '4': 'Asia/Dubai',
            '5': 'Asia/Karachi',
            '6': 'Asia/Dhaka',
            '7': 'Asia/Bangkok',
            '8': 'Asia/Shanghai',
            '9': 'Asia/Tokyo',
            '10': 'Australia/Sydney',
            '11': 'Pacific/Norfolk',
            '12': 'Pacific/Fiji'
        };

        return offsetMap[offsetHours.toString()] || 'UTC';
    }

    /**
     * Get user's timezone
     * @returns {string} User's timezone or fallback
     */
    getUserTimezone() {
        if (!this.timezoneDetected) {
            console.warn('[UserTimezone] Timezone not detected yet, using fallback');
            return this.fallbackTimezone;
        }
        return this.userTimezone || this.fallbackTimezone;
    }

    /**
     * Format a date with user's timezone
     * @param {Date|string} date - Date to format
     * @returns {Object} Object with dateTime and timeZone for Google Calendar
     */
    formatDateForCalendar(date) {
        try {
            const dateObj = typeof date === 'string' ? new Date(date) : date;
            
            if (isNaN(dateObj.getTime())) {
                throw new Error('Invalid date provided');
            }

            const timezone = this.getUserTimezone();
            
            // Format for Google Calendar API
            return {
                dateTime: dateObj.toISOString(),
                timeZone: timezone
            };
        } catch (error) {
            console.error('[UserTimezone] Error formatting date for calendar:', error);
            
            // Return fallback format
            const fallbackDate = new Date();
            return {
                dateTime: fallbackDate.toISOString(),
                timeZone: this.fallbackTimezone
            };
        }
    }

    /**
     * Create event time objects with proper timezone
     * @param {string} startTime - Start time in YYYY-MM-DDTHH:MM:SS format
     * @param {string} endTime - End time in YYYY-MM-DDTHH:MM:SS format
     * @returns {Object} Formatted start and end time objects
     */
    createEventTimeObjects(startTime, endTime) {
        try {
            const timezone = this.getUserTimezone();
            
            // Ensure times are in correct format
            const startDate = new Date(startTime);
            const endDate = new Date(endTime);
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                throw new Error(`Invalid time values: start=${startTime}, end=${endTime}`);
            }

            console.log(`[UserTimezone] Creating event times with timezone: ${timezone}`);
            console.log(`[UserTimezone] Start: ${startTime} -> ${startDate.toISOString()}`);
            console.log(`[UserTimezone] End: ${endTime} -> ${endDate.toISOString()}`);

            return {
                start: {
                    dateTime: startDate.toISOString(),
                    timeZone: timezone
                },
                end: {
                    dateTime: endDate.toISOString(),
                    timeZone: timezone
                }
            };
        } catch (error) {
            console.error('[UserTimezone] Error creating event time objects:', error);
            
            // Return safe fallback
            const now = new Date();
            const later = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later
            
            return {
                start: {
                    dateTime: now.toISOString(),
                    timeZone: this.fallbackTimezone
                },
                end: {
                    dateTime: later.toISOString(),
                    timeZone: this.fallbackTimezone
                }
            };
        }
    }

    /**
     * Parse user-friendly time input and convert to proper format
     * @param {string} userTime - User input like "3pm", "8:30am", etc.
     * @param {Date} baseDate - Base date to use (defaults to today)
     * @returns {string} ISO string in user's timezone
     */
    parseUserTime(userTime, baseDate = new Date()) {
        try {
            const timezone = this.getUserTimezone();
            let hours = 0;
            let minutes = 0;
            
            // Parse different time formats
            const timeStr = userTime.toLowerCase().trim();
            
            // Handle formats like "3pm", "8:30am", "15:30", etc.
            if (timeStr.includes('pm')) {
                const [time] = timeStr.split('pm');
                if (time.includes(':')) {
                    const [h, m] = time.split(':');
                    hours = parseInt(h) === 12 ? 12 : parseInt(h) + 12;
                    minutes = parseInt(m);
                } else {
                    hours = parseInt(time) === 12 ? 12 : parseInt(time) + 12;
                }
            } else if (timeStr.includes('am')) {
                const [time] = timeStr.split('am');
                if (time.includes(':')) {
                    const [h, m] = time.split(':');
                    hours = parseInt(h) === 12 ? 0 : parseInt(h);
                    minutes = parseInt(m);
                } else {
                    hours = parseInt(time) === 12 ? 0 : parseInt(time);
                }
            } else if (timeStr.includes(':')) {
                // 24-hour format
                const [h, m] = timeStr.split(':');
                hours = parseInt(h);
                minutes = parseInt(m);
            } else {
                // Assume 24-hour format without colon
                hours = parseInt(timeStr);
            }
            
            // Create date with parsed time
            const resultDate = new Date(baseDate);
            resultDate.setHours(hours, minutes, 0, 0);
            
            console.log(`[UserTimezone] Parsed "${userTime}" -> ${resultDate.toISOString()} (${timezone})`);
            
            return resultDate.toISOString();
        } catch (error) {
            console.error('[UserTimezone] Error parsing user time:', error);
            return baseDate.toISOString();
        }
    }

    /**
     * Validate timezone string
     * @param {string} timezone - Timezone to validate
     * @returns {boolean} Whether timezone is valid
     */
    isValidTimezone(timezone) {
        try {
            Intl.DateTimeFormat(undefined, { timeZone: timezone });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Set user timezone manually (for testing or override)
     * @param {string} timezone - Timezone to set
     */
    setUserTimezone(timezone) {
        if (this.isValidTimezone(timezone)) {
            this.userTimezone = timezone;
            this.timezoneDetected = true;
            console.log(`[UserTimezone] Manually set timezone: ${timezone}`);
        } else {
            console.error(`[UserTimezone] Invalid timezone provided: ${timezone}`);
        }
    }
}

// Create singleton instance
const userTimezoneService = new UserTimezoneService();

module.exports = userTimezoneService;
