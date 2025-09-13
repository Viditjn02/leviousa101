// Global type declarations for Electron API
declare global {
  interface Window {
    api: {
      // Platform information
      platform: {
        isLinux: boolean;
        isMacOS: boolean;
        isWindows: boolean;
        platform: string;
      };
      
      // Runtime configuration for Paragon authentication
      getRuntimeConfig: () => Promise<{
        PARAGON_PROJECT_ID: string;
        CONNECT_OPEN_IN_SYSTEM_BROWSER?: boolean;
        REDIRECT_URI?: string;
      }>;
      
      // MCP and other existing APIs
      mcp: any;
      // ... other existing API methods
    };
  }
}

export {};
