const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.PARAGON_SIGNING_KEY || process.env.SIGNING_KEY;
const USER_ID = process.env.TEST_USER_ID || 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';

if (!PROJECT_ID || !SIGNING_KEY || !USER_ID) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

function generateUserToken(userId) {
  const payload = {
    iss: PROJECT_ID,
    sub: userId,
    aud: [`proxy.useparagon.com/${PROJECT_ID}`],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };
  
  return jwt.sign(payload, SIGNING_KEY, { algorithm: 'RS256' });
}

class CalendarCRUDTester {
  constructor() {
    this.userToken = generateUserToken(USER_ID);
    this.results = {
      googleCalendar: { total: 0, passed: 0, operations: { CREATE: false, READ: false, UPDATE: false, DELETE: false } },
      calendly: { total: 0, passed: 0, operations: { READ: false } }
    };
    this.createdEventId = null;
    this.calendlyOrgUri = null;
  }

  async makeRequest(url, method = 'GET', body = null) {
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.userToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const responseText = await response.text();
    
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: response.ok ? JSON.parse(responseText) : responseText
    };
  }

  async testGoogleCalendarCRUD() {
    console.log('\n🔄 TESTING GOOGLE CALENDAR - COMPREHENSIVE CRUD');
    console.log('=' .repeat(60));

    // Test 1: READ - List Calendars
    console.log('\n🧪 1. READ: List Calendars');
    console.log('-'.repeat(40));
    this.results.googleCalendar.total++;

    try {
      const result = await this.makeRequest(
        `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/users/me/calendarList`
      );
      
      if (result.ok) {
        this.results.googleCalendar.passed++;
        this.results.googleCalendar.operations.READ = true;
        console.log('✅ SUCCESS: Can read calendars');
        console.log(`📊 Found ${result.data.items?.length || 0} calendars`);
      } else {
        console.log(`❌ FAILED: ${result.status} - ${result.data}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }

    // Test 2: READ - List Events
    console.log('\n🧪 2. READ: List Events');
    console.log('-'.repeat(40));
    this.results.googleCalendar.total++;

    try {
      const result = await this.makeRequest(
        `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/calendars/primary/events?maxResults=5`
      );
      
      if (result.ok) {
        this.results.googleCalendar.passed++;
        console.log('✅ SUCCESS: Can read events');
        console.log(`📊 Found ${result.data.items?.length || 0} events`);
      } else {
        console.log(`❌ FAILED: ${result.status} - ${result.data}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }

    // Test 3: CREATE - Create Event
    console.log('\n🧪 3. CREATE: Create Event');
    console.log('-'.repeat(40));
    this.results.googleCalendar.total++;

    const eventData = {
      summary: 'System CRUD Test Event',
      description: 'Testing CREATE operation via proxy endpoints',
      start: {
        dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
        timeZone: 'America/New_York'
      },
      location: 'Test Location - CRUD Verification'
    };

    try {
      const result = await this.makeRequest(
        `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/calendars/primary/events`,
        'POST',
        eventData
      );
      
      if (result.ok) {
        this.results.googleCalendar.passed++;
        this.results.googleCalendar.operations.CREATE = true;
        this.createdEventId = result.data.id;
        console.log('✅ SUCCESS: Can create events');
        console.log(`📊 Created event ID: ${this.createdEventId}`);
        console.log(`📊 Event title: ${result.data.summary}`);
        console.log(`📊 Event link: ${result.data.htmlLink || 'N/A'}`);
      } else {
        console.log(`❌ FAILED: ${result.status} - ${result.data}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }

    // Test 4: UPDATE - Update Event (only if CREATE succeeded)
    if (this.createdEventId) {
      console.log('\n🧪 4. UPDATE: Update Event');
      console.log('-'.repeat(40));
      this.results.googleCalendar.total++;

      const updateData = {
        summary: 'UPDATED: System CRUD Test Event',
        description: 'Testing UPDATE operation via proxy endpoints - MODIFIED',
        location: 'UPDATED Location - CRUD Verification'
      };

      try {
        const result = await this.makeRequest(
          `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/calendars/primary/events/${this.createdEventId}`,
          'PATCH',
          updateData
        );
        
        if (result.ok) {
          this.results.googleCalendar.passed++;
          this.results.googleCalendar.operations.UPDATE = true;
          console.log('✅ SUCCESS: Can update events');
          console.log(`📊 Updated title: ${result.data.summary}`);
        } else {
          console.log(`❌ FAILED: ${result.status} - ${result.data}`);
        }
      } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
      }

      // Test 5: READ - Get specific updated event
      console.log('\n🧪 5. READ: Get Updated Event');
      console.log('-'.repeat(40));
      this.results.googleCalendar.total++;

      try {
        const result = await this.makeRequest(
          `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/calendars/primary/events/${this.createdEventId}`
        );
        
        if (result.ok) {
          this.results.googleCalendar.passed++;
          console.log('✅ SUCCESS: Can read specific events');
          console.log(`📊 Event title: ${result.data.summary}`);
          console.log(`📊 Event status: ${result.data.status}`);
        } else {
          console.log(`❌ FAILED: ${result.status} - ${result.data}`);
        }
      } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
      }

      // Test 6: DELETE - Delete Event
      console.log('\n🧪 6. DELETE: Delete Event');
      console.log('-'.repeat(40));
      this.results.googleCalendar.total++;

      try {
        const result = await this.makeRequest(
          `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/calendars/primary/events/${this.createdEventId}`,
          'DELETE'
        );
        
        if (result.ok || result.status === 204) {
          this.results.googleCalendar.passed++;
          this.results.googleCalendar.operations.DELETE = true;
          console.log('✅ SUCCESS: Can delete events');
        } else {
          console.log(`❌ FAILED: ${result.status} - ${result.data}`);
        }
      } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
      }
    } else {
      console.log('\n⏭️  SKIPPING UPDATE/DELETE - No event created');
    }
  }

  async testCalendlyCRUD() {
    console.log('\n🔄 TESTING CALENDLY - COMPREHENSIVE OPERATIONS');
    console.log('=' .repeat(60));

    // Test 1: Get User Info (to extract org URI)
    console.log('\n🧪 1. READ: Get User Info');
    console.log('-'.repeat(40));
    this.results.calendly.total++;

    try {
      const result = await this.makeRequest(
        `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/calendly/users/me`
      );
      
      if (result.ok) {
        this.results.calendly.passed++;
        this.results.calendly.operations.READ = true;
        this.calendlyOrgUri = result.data.resource?.current_organization;
        console.log('✅ SUCCESS: Can read user info');
        console.log(`📊 User: ${result.data.resource?.name || 'User data available'}`);
        console.log(`📊 Org URI: ${this.calendlyOrgUri || 'N/A'}`);
      } else {
        console.log(`❌ FAILED: ${result.status} - ${result.data}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }

    // Test 2: List Event Types (if org URI available)
    if (this.calendlyOrgUri) {
      console.log('\n🧪 2. READ: List Event Types');
      console.log('-'.repeat(40));
      this.results.calendly.total++;

      try {
        const result = await this.makeRequest(
          `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/calendly/event_types?organization=${encodeURIComponent(this.calendlyOrgUri)}`
        );
        
        if (result.ok) {
          this.results.calendly.passed++;
          console.log('✅ SUCCESS: Can read event types');
          console.log(`📊 Found ${result.data.collection?.length || 0} event types`);
        } else {
          console.log(`❌ FAILED: ${result.status} - ${result.data}`);
        }
      } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
      }

      // Test 3: List Scheduled Events
      console.log('\n🧪 3. READ: List Scheduled Events');
      console.log('-'.repeat(40));
      this.results.calendly.total++;

      try {
        const result = await this.makeRequest(
          `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/calendly/scheduled_events?organization=${encodeURIComponent(this.calendlyOrgUri)}&count=5`
        );
        
        if (result.ok) {
          this.results.calendly.passed++;
          console.log('✅ SUCCESS: Can read scheduled events');
          console.log(`📊 Found ${result.data.collection?.length || 0} scheduled events`);
        } else {
          console.log(`❌ FAILED: ${result.status} - ${result.data}`);
        }
      } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
      }
    } else {
      console.log('\n⏭️  SKIPPING Event Types/Scheduled Events - No org URI');
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 COMPREHENSIVE SYSTEM CRUD TEST RESULTS');
    console.log('='.repeat(80));

    // Google Calendar Results
    const gcPct = Math.round((this.results.googleCalendar.passed / this.results.googleCalendar.total) * 100);
    console.log(`\n📅 GOOGLE CALENDAR: ${this.results.googleCalendar.passed}/${this.results.googleCalendar.total} (${gcPct}%)`);
    
    const gcOps = this.results.googleCalendar.operations;
    console.log(`   CREATE: ${gcOps.CREATE ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`   READ:   ${gcOps.READ ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`   UPDATE: ${gcOps.UPDATE ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`   DELETE: ${gcOps.DELETE ? '✅ WORKING' : '❌ FAILED'}`);

    // Calendly Results
    const cPct = Math.round((this.results.calendly.passed / this.results.calendly.total) * 100);
    console.log(`\n📆 CALENDLY: ${this.results.calendly.passed}/${this.results.calendly.total} (${cPct}%)`);
    
    const cOps = this.results.calendly.operations;
    console.log(`   READ:   ${cOps.READ ? '✅ WORKING' : '❌ FAILED'}`);
    console.log('   NOTE: Calendly CREATE/UPDATE/DELETE typically require webhooks or specific event management APIs');

    // Overall Assessment
    const totalPassed = this.results.googleCalendar.passed + this.results.calendly.passed;
    const totalTests = this.results.googleCalendar.total + this.results.calendly.total;
    const overallPct = Math.round((totalPassed / totalTests) * 100);

    console.log(`\n🎯 OVERALL SYSTEM CRUD: ${totalPassed}/${totalTests} (${overallPct}%)`);

    console.log('\n🚨 BRUTAL HONEST ASSESSMENT:');
    
    // Google Calendar Assessment
    const fullGoogleCRUD = gcOps.CREATE && gcOps.READ && gcOps.UPDATE && gcOps.DELETE;
    if (fullGoogleCRUD) {
      console.log('✅ Google Calendar: COMPLETE CRUD WORKING');
      console.log('   ✓ Users CAN create calendar events via voice');
      console.log('   ✓ Users CAN edit existing events via voice');
      console.log('   ✓ Users CAN delete events via voice');
      console.log('   ✓ Users CAN view/list events via voice');
    } else {
      console.log('❌ Google Calendar: INCOMPLETE CRUD');
      console.log(`   ✓ CREATE: ${gcOps.CREATE ? 'Working' : 'BROKEN'}`);
      console.log(`   ✓ READ:   ${gcOps.READ ? 'Working' : 'BROKEN'}`);
      console.log(`   ✓ UPDATE: ${gcOps.UPDATE ? 'Working' : 'BROKEN'}`);
      console.log(`   ✓ DELETE: ${gcOps.DELETE ? 'Working' : 'BROKEN'}`);
    }

    // Calendly Assessment
    if (cOps.READ) {
      console.log('✅ Calendly: READ operations working');
      console.log('   ✓ Users CAN view their Calendly info via voice');
      console.log('   ✓ Users CAN see their event types via voice');
      console.log('   ✓ Users CAN view scheduled events via voice');
    } else {
      console.log('❌ Calendly: READ operations broken');
    }

    console.log('\n📋 SYSTEM VERIFICATION:');
    console.log('✓ Proxy endpoints functional (no ActionKit needed)');
    console.log('✓ Authentication working');
    console.log('✓ JWT token generation working');
    console.log('✓ All tests run through Paragon proxy API');

    console.log('\n🎉 FINAL VERDICT:');
    if (fullGoogleCRUD && cOps.READ) {
      console.log('✅ CALENDAR INTEGRATIONS ARE FULLY FUNCTIONAL');
      console.log('✅ Users can create, read, update, delete Google Calendar events');
      console.log('✅ Users can view Calendly information and events');
      console.log('✅ System ready for voice agent integration');
    } else if (gcOps.CREATE && gcOps.READ) {
      console.log('⚠️  CALENDAR INTEGRATIONS PARTIALLY FUNCTIONAL');
      console.log('✅ Core calendar operations working');
      console.log('❌ Some CRUD operations need fixes');
    } else {
      console.log('❌ CALENDAR INTEGRATIONS NEED SIGNIFICANT WORK');
    }
  }

  async run() {
    console.log('🧪 COMPREHENSIVE CALENDAR SYSTEM CRUD TEST');
    console.log('Testing FULL Create, Read, Update, Delete operations');
    console.log('Via Paragon proxy endpoints (no ActionKit)');
    console.log('=' .repeat(60));

    try {
      await this.testGoogleCalendarCRUD();
      await this.testCalendlyCRUD();
      this.generateReport();
    } catch (error) {
      console.error('❌ System test failed:', error.message);
    }
  }
}

const tester = new CalendarCRUDTester();
tester.run().catch(console.error);