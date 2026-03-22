# ADR-050: AI-Native Operations via Model Context Protocol (MCP)

## Status
✅ **Accepted** (2026-03-22)

## Context
As V School CRM v2 (v1.5.3) grows in complexity across Procurement, Inventory, and Marketing domains, the reliance on human-operated UI or manual API calls by AI agents (via shell commands) has become a bottleneck. AI agents require a more structured, discoverable, and secure way to interact with business logic without deep-diving into raw source code or manual API documentation every time.

## Decision
We will implement an **MCP Server** (`src/mcp/vschool-mcp-server.js`) using the Model Context Protocol. This server acts as a standardized bridge between AI Models (Claude, Gemini) and our existing Repository Layer.

### Key Principles:
1. **Repository-First:** MCP tools MUST wrap existing functions in `src/lib/repositories/` to ensure business logic consistency and reuse.
2. **Standardized Tooling:** Use JSON Schema to define tool inputs/outputs, making them natively discoverable by MCP-compatible clients.
3. **Protocol:** Use `stdio` transport for local execution and integration with AI Desktop clients.
4. **Security:** MCP tools act as a proxy; they enforce validation and can restrict destructive operations even if the underlying API allows them.

## Implementation
- **SDK:** `@modelcontextprotocol/sdk`
- **Location:** `src/mcp/vschool-mcp-server.js`
- **Initial Modules:** Procurement (BOM Calculation, PO Creation).

## Consequences
- **Positive:**
    - AI agents can perform complex business tasks (e.g., "Check stock and draft PO") with 100% accuracy.
    - Reduced token usage as AI doesn't need to load large API documentation files.
    - Improved security via tool-level encapsulation.
- **Negative:**
    - Additional maintenance of the MCP tool definitions.
    - Requires Node.js runtime for the AI client to execute the server.

## References
- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- `docs/guide/mcp-guide.md`
