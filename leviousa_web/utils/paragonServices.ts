/**
 * Paragon Services Configuration Utility
 * Dynamically loads available services from LIMIT_TO_INTEGRATIONS environment variable
 */

export interface ParagonService {
  id: string;
  name: string;
  description: string;
  icon: string;
  capabilities: string[];
  status: 'needs_auth' | 'connected' | 'disconnected';
}

// Service definitions with full metadata
const SERVICE_DEFINITIONS: Record<string, Omit<ParagonService, 'id' | 'status'>> = {
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
  slack: {
    name: 'Slack',
    description: 'Send messages and manage channels',
    icon: '💬',
    capabilities: ['slack_send', 'slack_channels'],
  },
  hubspot: {
    name: 'HubSpot',
    description: 'Manage contacts, deals, and CRM data',
    icon: '🚀',
    capabilities: ['hubspot_contacts', 'hubspot_deals'],
  },
  salesforce: {
    name: 'Salesforce',
    description: 'Access CRM data and manage leads',
    icon: '☁️',
    capabilities: ['salesforce_leads', 'salesforce_accounts'],
  },
  trello: {
    name: 'Trello',
    description: 'Manage boards, cards, and projects',
    icon: '📋',
    capabilities: ['trello_boards', 'trello_cards'],
  },
  github: {
    name: 'GitHub',
    description: 'Manage repositories, issues, and pull requests',
    icon: '🐙',
    capabilities: ['github_repos', 'github_issues'],
  },
  figma: {
    name: 'Figma',
    description: 'Access design files and projects',
    icon: '🎨',
    capabilities: ['figma_files', 'figma_projects'],
  },
  zoom: {
    name: 'Zoom',
    description: 'Schedule and manage meetings',
    icon: '📹',
    capabilities: ['zoom_meetings', 'zoom_recordings'],
  },
  outlook: {
    name: 'Microsoft Outlook',
    description: 'Send and receive emails, manage calendar',
    icon: '📨',
    capabilities: ['outlook_send', 'outlook_calendar'],
  },
  dropbox: {
    name: 'Dropbox',
    description: 'Store and share files in the cloud',
    icon: '📦',
    capabilities: ['dropbox_files', 'dropbox_folders'],
  },
  onedrive: {
    name: 'OneDrive',
    description: 'Microsoft cloud storage and file sharing',
    icon: '☁️',
    capabilities: ['onedrive_files', 'onedrive_folders'],
  },
  googledrive: {
    name: 'Google Drive',
    description: 'Access files, folders, and documents',
    icon: '📁',
    capabilities: ['drive_files'],
  },
  calendly: {
    name: 'Calendly',
    description: 'Manage scheduling and calendar bookings',
    icon: '🗓️',
    capabilities: ['calendly_events', 'calendly_scheduling'],
  },
};

/**
 * Get available services from LIMIT_TO_INTEGRATIONS environment variable
 * Falls back to all defined services if not configured
 */
export function getAvailableServices(): ParagonService[] {
  try {
    // Try to get from environment variable (server-side)
    const limitToIntegrations = process.env.PARAGON_LIMIT_TO_INTEGRATIONS || 
                               process.env.LIMIT_TO_INTEGRATIONS;
    
    let availableServiceIds: string[];
    
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
        'notion', 'googleCalendar', 'linkedin', 'googledrive', 
        'dropbox', 'onedrive'
      ];
    }
    
    // Build services array with definitions
    const services: ParagonService[] = availableServiceIds
      .map(serviceId => {
        const definition = SERVICE_DEFINITIONS[serviceId];
        if (!definition) {
          console.warn(`Unknown service in LIMIT_TO_INTEGRATIONS: ${serviceId}`);
          return null;
        }
        
        return {
          id: serviceId,
          ...definition,
          status: 'needs_auth' as const,
        };
      })
      .filter((service): service is NonNullable<typeof service> => service !== null);
    
    console.log(`Loaded ${services.length} available Paragon services:`, 
                services.map(s => s.id).join(', '));
    
    return services;
    
  } catch (error) {
    console.error('Error loading Paragon services configuration:', error);
    
    // Fallback to default services on error (matching integrations page)
    return [
      'gmail', 'outlook', 'slack', 'salesforce', 'hubspot', 
      'notion', 'googleCalendar', 'linkedin', 'googledrive', 
      'dropbox', 'onedrive'
    ].map(serviceId => ({
      id: serviceId,
      ...SERVICE_DEFINITIONS[serviceId],
      status: 'needs_auth' as const,
    }));
  }
}

/**
 * Get service definition by ID
 */
export function getServiceById(serviceId: string): ParagonService | null {
  const definition = SERVICE_DEFINITIONS[serviceId];
  if (!definition) {
    return null;
  }
  
  return {
    id: serviceId,
    ...definition,
    status: 'needs_auth',
  };
}

/**
 * Check if a service is available in current configuration
 */
export function isServiceAvailable(serviceId: string): boolean {
  const availableServices = getAvailableServices();
  return availableServices.some(service => service.id === serviceId);
}

/**
 * Client-side function to get services from API or static config
 * This can be called from React components
 */
export async function getAvailableServicesClient(): Promise<ParagonService[]> {
  try {
    // In the browser, we'll make an API call to get the configuration
    // For now, return the default set - this can be enhanced later with an API endpoint
    const services = getAvailableServices();
    return services;
  } catch (error) {
    console.error('Error fetching available services:', error);
    // Return default services on error
    return getAvailableServices();
  }
}