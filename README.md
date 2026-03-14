# 🔗 LangGraph Patterns MCP Server

An MCP (Model Context Protocol) server that provides LangGraph agent patterns, code snippets, and best practices directly to your AI assistant.

## Features

- 🤖 **6 Production Patterns**: ReAct agents, human-in-the-loop, multi-agent, tool calling, streaming, error handling
- 📝 **Quick Snippets**: State, nodes, edges, conditionals, checkpoints, tools
- 📚 **Resources**: Quickstart guide, best practices, cheatsheet
- ⚡ **Zero Config**: Just install and use

## Installation

```bash
npm install -g langgraph-patterns-mcp
```

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "langgraph": {
      "command": "npx",
      "args": ["-y", "langgraph-patterns-mcp"]
    }
  }
}
```

## Usage with Cursor

Add to your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "langgraph": {
      "command": "npx",
      "args": ["-y", "langgraph-patterns-mcp"]
    }
  }
}
```

## Available Tools

### `get_pattern`
Get a complete pattern with code and tips.

```
get_pattern("react-agent")
get_pattern("human-in-loop")
get_pattern("multi-agent")
get_pattern("tool-calling")
get_pattern("streaming")
get_pattern("error-handling")
```

### `list_patterns`
List all available patterns.

### `get_snippet`
Get a quick code snippet.

```
get_snippet("state")
get_snippet("node")
get_snippet("edge")
get_snippet("conditional")
get_snippet("checkpoint")
get_snippet("tools")
```

## Resources

Access these resources through your MCP client:

- `langgraph://quickstart` - Get started in 5 minutes
- `langgraph://best-practices` - Production best practices
- `langgraph://cheatsheet` - Quick reference

## Example

Ask your AI assistant:

> "Show me how to build a LangGraph agent with human-in-the-loop approval"

The assistant will use this MCP server to provide production-ready code.

## Want More?

This MCP server covers the essentials. For advanced patterns:

- 📘 **[AI Agent Builder's Playbook](https://rajathbharadwaj.github.io/ai-agent-playbook/)** - Complete guide with voice agents, trading bots, and deployment
- 📝 **[LangGraph Cheatsheet](https://rajathbharadwaj.github.io/langgraph-cheatsheet/)** - Printable quick reference
- 🔧 **[System Prompts Collection](https://rajathbharadwaj.github.io/system-prompts/)** - 25 production-tested prompts

## License

MIT

---

Built by [@Rajathbharadwaj](https://github.com/Rajathbharadwaj)
