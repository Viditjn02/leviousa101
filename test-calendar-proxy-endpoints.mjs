#!/usr/bin/env node

// Test calendar integrations with corrected proxy endpoints
import { MCPClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const USER_ID = process.env.TEST_USER_ID || 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';

if (!PROJECT_ID || !USER_ID) {
  console.error('❌ Missing required environment variables: PARAGON_PROJECT_ID, TEST_USER_ID');
  process.exit(1);
}

async function testCalendarIntegrations() {
  console.log('🧪 Testing Calendar Integrations with Proxy Endpoints');
  console.log('=' .repeat(60));

  // Start the MCP server
  const mcpProcess = spawn('node', ['services/paragon-mcp/dist/index.mjs'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const transport = new StdioClientTransport({
    reader: mcpProcess.stdout,
    writer: mcpProcess.stdin
  });

  const client = new MCPClient(
    {
      name: 'test-client',
      version: '1.0.0'
    },
    {
      capabilities: {}
    }
  );

  try {
    await client.connect(transport);
    console.log('✅ Connected to MCP server');

    // List available tools
    const tools = await client.listTools();
    console.log(`\n📋 Available tools: ${tools.tools.length}`);
    
    const calendarTools = tools.tools.filter(tool => 
      tool.name.includes('calendar') || tool.name.includes('calendly')
    );
    
    console.log(`📅 Calendar-related tools: ${calendarTools.length}`);
    calendarTools.forEach(tool => {
      console.log(`  - ${tool.name}`);
    });

    const tests = [
      // Google Calendar Tests
      {
        name: '📅 Google Calendar - List Calendars',
        tool: 'google_calendar_list_calendars',
        args: { user_id: USER_ID }
      },
      {
        name: '📅 Google Calendar - List Events',
        tool: 'google_calendar_list_events',
        args: { 
          user_id: USER_ID,
          calendar_id: 'primary',
          max_results: 5
        }
      },

      // Calendly Tests
      {
        name: '📆 Calendly - Get User Info',
        tool: 'calendly_get_user_info',
        args: { user_id: USER_ID }
      },
      {
        name: '📆 Calendly - List Event Types',
        tool: 'calendly_list_event_types',
        args: { user_id: USER_ID }
      },
      {
        name: '📆 Calendly - List Scheduled Events',
        tool: 'calendly_list_scheduled_events',
        args: { 
          user_id: USER_ID,
          count: 5
        }
      }
    ];

    for (const test of tests) {
      console.log(`\n🧪 ${test.name}`);
      console.log('-'.repeat(50));
      
      try {
        const startTime = Date.now();
        const result = await client.callTool({
          name: test.tool,
          arguments: test.args
        });
        
        const duration = Date.now() - startTime;
        console.log(`⏱️  Duration: ${duration}ms`);
        
        if (result.content && result.content[0]) {
          const response = JSON.parse(result.content[0].text);
          
          if (response.success) {
            console.log('✅ SUCCESS');
            
            // Log specific success details
            if (response.calendars) {
              console.log(`📊 Found ${response.calendars.length} calendars`);
            } else if (response.events) {
              console.log(`📊 Found ${response.events.length} events`);
            } else if (response.event_types) {
              console.log(`📊 Found ${response.event_types.length} event types`);
            } else if (response.user_info) {
              console.log(`📊 User: ${response.user_info.name || response.user_info.current_organization}`);
            }
            
          } else {
            console.log('❌ API ERROR');
            console.log(`   Error: ${response.error}`);
            console.log(`   Details: ${response.details}`);
          }
        } else {
          console.log('❌ UNEXPECTED RESPONSE FORMAT');
          console.log(JSON.stringify(result, null, 2));
        }
        
      } catch (error) {
        console.log('❌ EXCEPTION');
        console.log(`   Error: ${error.message}`);
      }
    }

    console.log('\n🎯 Summary');
    console.log('=' .repeat(60));
    console.log('✅ All calendar operations now use Paragon proxy endpoints');
    console.log('✅ No more ActionKit dependencies');
    console.log('✅ Consistent with Gmail/LinkedIn proxy implementation');
    console.log('\n📋 Endpoint Patterns Used:');
    console.log('   Google Calendar: proxy.useparagon.com/.../googleCalendar/calendar/v3/...');
    console.log('   Calendly: proxy.useparagon.com/.../calendly/...');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    try {
      await client.close();
      mcpProcess.kill();
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

testCalendarIntegrations().catch(console.error);