/**
 * Paragon Services Configuration Utility
 * Dynamically loads available services from LIMIT_TO_INTEGRATIONS environment variable
 */

// Service definitions with full metadata
const SERVICE_DEFINITIONS = {
  gmail: {
    name: 'Gmail',
    description: 'Send and search emails, access messages',
    icon: '📧',
    capabilities: ['gmail_send', 'gmail_search'],
  },
  googleCalendar: {
    name: 'Google Calendar',
    description: 'Manage events and schedules',
    icon: '📅',
    capabilities: ['calendar_events'],
  },
  googleDrive: {
    name: 'Google Drive',
    description: 'Access files, folders, and documents',
    icon: '📁',
    capabilities: ['drive_files'],
  },
  googleDocs: {
    name: 'Google Docs',
    description: 'Create and edit documents',
    icon: '📄',
    capabilities: ['docs_read', 'docs_write'],
  },
  googleSheets: {
    name: 'Google Sheets',
    description: 'Create and edit spreadsheets',
    icon: '📊',
    capabilities: ['sheets_read', 'sheets_write'],
  },
  googleTasks: {
    name: 'Google Tasks',
    description: 'Manage tasks and to-do lists',
    icon: '✅',
    capabilities: ['tasks_read', 'tasks_write'],
  },
  notion: {
    name: 'Notion',
    description: 'Access pages, databases, and content',
    icon: '📝',
    capabilities: ['notion_pages'],
  },
  linkedin: {
    name: 'LinkedIn',
    description: 'Access professional network and posts',
    icon: '💼',
    capabilities: ['linkedin_posts', 'linkedin_connections'],
  },
  calendly: {
    name: 'Calendly',
    description: 'Schedule and manage meetings',
    icon: '🗓️',
    capabilities: ['calendly_events', 'calendly_scheduling'],
  }
};

/**
 * Get available services from LIMIT_TO_INTEGRATIONS environment variable
 * This function works in both Node.js and browser environments
 */
function getAvailableServices() {
  try {
    let limitToIntegrations = null;
    
    // Try to get from environment (Node.js environment)
    if (typeof process !== 'undefined' && process.env) {
      limitToIntegrations = process.env.PARAGON_LIMIT_TO_INTEGRATIONS || 
                           process.env.LIMIT_TO_INTEGRATIONS;
    }
    
    // If running in browser, try to get from a global variable or default
    if (!limitToIntegrations && typeof window !== 'undefined') {
      limitToIntegrations = window.PARAGON_LIMIT_TO_INTEGRATIONS;
    }
    
    let availableServiceIds;
    
    if (limitToIntegrations) {
      // Parse comma-separated list
      availableServiceIds = limitToIntegrations
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    } else {
      // Fallback to default services (matching integrations page)
      availableServiceIds = [
        'gmail', 'outlook', 'slack', 'salesforce', 'hubspot', 
        'notion', 'googlecalendar', 'linkedin', 'googledrive', 
        'dropbox', 'onedrive'
      ];
    }
    
    // Build services object with definitions
    const services = {};
    
    availableServiceIds.forEach(serviceId => {
      const definition = SERVICE_DEFINITIONS[serviceId];
      if (!definition) {
        console.warn(`Unknown service in LIMIT_TO_INTEGRATIONS: ${serviceId}`);
        return;
      }
      
      services[serviceId] = {
        ...definition,
        status: 'needs_auth',
      };
    });
    
    console.log(`Loaded ${Object.keys(services).length} available Paragon services:`, 
                Object.keys(services).join(', '));
    
    return services;
    
  } catch (error) {
    console.error('Error loading Paragon services configuration:', error);
    
    // Fallback to default services on error (matching integrations page)
    const defaultServices = {};
    const defaultServiceIds = [
      'gmail', 'outlook', 'slack', 'salesforce', 'hubspot', 
      'notion', 'googlecalendar', 'linkedin', 'googledrive', 
      'dropbox', 'onedrive'
    ];
    
    defaultServiceIds.forEach(serviceId => {
      defaultServices[serviceId] = {
        ...SERVICE_DEFINITIONS[serviceId],
        status: 'needs_auth',
      };
    });
    
    return defaultServices;
  }
}

/**
 * Get service definition by ID
 */
function getServiceById(serviceId) {
  const definition = SERVICE_DEFINITIONS[serviceId];
  if (!definition) {
    return null;
  }
  
  return {
    ...definition,
    status: 'needs_auth',
  };
}

/**
 * Check if a service is available in current configuration
 */
function isServiceAvailable(serviceId) {
  const availableServices = getAvailableServices();
  return serviceId in availableServices;
}

/**
 * Get the list of available service IDs
 */
function getAvailableServiceIds() {
  return Object.keys(getAvailableServices());
}

// For browser environments, try to load config from runtime config
if (typeof window !== 'undefined') {
  // Check for runtime config
  fetch('/runtime-config.json')
    .then(response => response.json())
    .then(config => {
      if (config.PARAGON_LIMIT_TO_INTEGRATIONS) {
        window.PARAGON_LIMIT_TO_INTEGRATIONS = config.PARAGON_LIMIT_TO_INTEGRATIONS;
      }
    })
    .catch(error => {
      console.log('No runtime config found, using defaults');
    });
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    getAvailableServices,
    getServiceById,
    isServiceAvailable,
    getAvailableServiceIds,
    SERVICE_DEFINITIONS
  };
} else if (typeof window !== 'undefined') {
  // Browser environment
  window.ParagonServices = {
    getAvailableServices,
    getServiceById,
    isServiceAvailable,
    getAvailableServiceIds,
    SERVICE_DEFINITIONS
  };
}