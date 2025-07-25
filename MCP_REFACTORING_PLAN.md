# MCP Implementation Refactoring Plan

## Executive Summary

This document outlines the plan to refactor Leviousa's custom MCP implementation to use the official `@modelcontextprotocol/sdk`, resulting in a ~70% reduction in code complexity while improving reliability and maintainability.

## Current State Analysis

### Problems Identified
1. **Custom JSON-RPC Implementation** (2631 lines in mcpClient.js)
   - Manual buffer management for message parsing
   - Complex promise tracking with pendingRequests map
   - No automatic reconnection or error recovery
   - Race conditions in async operations

2. **Tight Coupling**
   - OAuth logic mixed with server lifecycle
   - Answer strategies embedded in MCP client
   - Tool discovery tied to server management
   - UI components directly accessing internal state

3. **Poor Separation of Concerns**
   - MCPClient handles OAuth, tools, answers, research, and more
   - No clear boundaries between infrastructure and business logic
   - Event handling mixed with protocol implementation

4. **Memory Leaks & Performance Issues**
   - Event listeners not properly cleaned up
   - Pending requests map grows without bounds
   - OAuth states accumulate over time
   - No connection pooling or reuse

## Target Architecture

### Core Modules

#### 1. MCP Adapter Layer
```typescript
// src/features/invisibility/mcp/MCPAdapter.ts
class MCPAdapter {
  private mcpServer: McpServer;
  private transport: Transport;
  
  async initialize(config: MCPConfig): Promise<void>
  async connect(): Promise<void>
  async disconnect(): Promise<void>
}
```

#### 2. OAuth Manager
```typescript
// src/features/invisibility/auth/OAuthManager.ts
class OAuthManager {
  async authenticate(provider: string): Promise<TokenPair>
  async refreshToken(provider: string): Promise<string>
  async revokeToken(provider: string): Promise<void>
}
```

#### 3. Server Registry
```typescript
// src/features/invisibility/mcp/ServerRegistry.ts
class ServerRegistry {
  async register(name: string, config: ServerConfig): Promise<void>
  async start(name: string): Promise<void>
  async stop(name: string): Promise<void>
  async getStatus(name: string): ServerStatus
}
```

#### 4. Tool Registry
```typescript
// src/features/invisibility/mcp/ToolRegistry.ts
class ToolRegistry {
  registerServer(serverName: string, tools: Tool[]): void
  invokeTool(fullName: string, args: any): Promise<ToolResult>
  listTools(): Tool[]
}
```

#### 5. Connection Pool
```typescript
// src/features/invisibility/mcp/ConnectionPool.ts
class ConnectionPool {
  async getConnection(serverName: string): Promise<Connection>
  async releaseConnection(serverName: string): Promise<void>
  async closeAll(): Promise<void>
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
1. Install @modelcontextprotocol/sdk
2. Create new directory structure
3. Implement MCPAdapter with basic functionality
4. Create unit tests for adapter

### Phase 2: OAuth Separation (Week 2)
1. Extract OAuth logic to OAuthManager
2. Implement token storage and refresh
3. Create OAuth configuration interface
4. Update UI components to use new OAuth flow

### Phase 3: Server Management (Week 3)
1. Implement ServerRegistry
2. Migrate server configurations
3. Add connection pooling
4. Implement circuit breaker pattern

### Phase 4: Tool Management (Week 4)
1. Create ToolRegistry
2. Migrate tool discovery logic
3. Implement tool namespacing
4. Update tool invocation flow

### Phase 5: Answer Strategies (Week 5)
1. Extract answer strategies to separate module
2. Create AnswerService interface
3. Implement strategy pattern for answers
4. Update askService integration

### Phase 6: Migration & Testing (Week 6)
1. Create migration scripts
2. Update all UI components
3. Comprehensive integration testing
4. Performance benchmarking

## Key Design Decisions

### 1. Use Official SDK Transport
- Replace custom stdio handling with `StdioServerTransport`
- Use SDK's built-in message framing and parsing
- Leverage automatic reconnection capabilities

### 2. Event-Driven Architecture
- Use EventEmitter for loose coupling
- Implement observer pattern for state changes
- Enable reactive UI updates

### 3. Dependency Injection
- Use constructor injection for testability
- Create interfaces for all major components
- Enable easy mocking in tests

### 4. Error Boundaries
- Implement try-catch at module boundaries
- Use Result<T, E> pattern for error handling
- Add comprehensive logging

## Migration Strategy

### Step 1: Parallel Implementation
- Build new modules alongside existing code
- Use feature flags to switch between implementations
- Maintain backwards compatibility

### Step 2: Gradual Rollout
- Start with low-risk features (tool listing)
- Progress to critical features (tool execution)
- Monitor error rates and performance

### Step 3: Cleanup
- Remove old implementation
- Delete unused dependencies
- Update documentation

## Success Metrics

1. **Code Reduction**: Target 70% reduction in lines of code
2. **Performance**: 50% faster connection establishment
3. **Reliability**: 90% reduction in connection errors
4. **Maintainability**: Clear module boundaries with <100 lines per file

## Risk Mitigation

1. **Feature Parity**: Maintain comprehensive test suite
2. **Data Loss**: Implement proper migration for stored tokens
3. **UI Breakage**: Use adapter pattern for gradual migration
4. **Performance Regression**: Benchmark before and after

## Dependencies

```json
{
  "@modelcontextprotocol/sdk": "^1.0.0",
  "zod": "^3.0.0",
  "winston": "^3.0.0",
  "p-queue": "^7.0.0"
}
```

## Next Steps

1. Review and approve this plan
2. Set up new project structure
3. Begin Phase 1 implementation
4. Schedule weekly progress reviews 