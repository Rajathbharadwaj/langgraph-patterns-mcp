#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const PATTERNS = {
  "react-agent": {
    name: "ReAct Agent Pattern",
    description: "Basic reasoning and acting agent loop",
    code: `from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated
from langgraph.graph import add_messages

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]

def call_model(state: AgentState):
    response = llm.invoke(state["messages"])
    return {"messages": [response]}

def should_continue(state: AgentState) -> str:
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tools"
    return END

graph = StateGraph(AgentState)
graph.add_node("agent", call_model)
graph.add_node("tools", tool_node)
graph.set_entry_point("agent")
graph.add_conditional_edges("agent", should_continue)
graph.add_edge("tools", "agent")
app = graph.compile()`,
    tips: [
      "Always define explicit state with TypedDict",
      "Use conditional edges for branching logic",
      "Tool node loops back to agent for multi-step reasoning"
    ]
  },

  "human-in-loop": {
    name: "Human-in-the-Loop Pattern",
    description: "Pause agent for human approval before sensitive actions",
    code: `from langgraph.checkpoint.memory import MemorySaver

memory = MemorySaver()

# Compile with interrupt points
app = graph.compile(
    checkpointer=memory,
    interrupt_before=["send_email", "execute_trade", "delete_file"]
)

# Run until interrupt
config = {"configurable": {"thread_id": "user_123"}}
result = app.invoke({"messages": [HumanMessage(content="Send email to boss")]}, config)

# State is now paused at "send_email" node
# Human reviews...

# Continue after approval
result = app.invoke(None, config)  # Resumes from checkpoint`,
    tips: [
      "Use interrupt_before for dangerous actions",
      "Always use a checkpointer for persistence",
      "Thread IDs allow multiple concurrent conversations"
    ]
  },

  "multi-agent": {
    name: "Multi-Agent Collaboration",
    description: "Multiple specialized agents working together",
    code: `from langgraph.graph import StateGraph

class MultiAgentState(TypedDict):
    messages: Annotated[list, add_messages]
    next_agent: str
    research_results: str
    draft: str

def researcher(state):
    # Research agent gathers information
    result = research_llm.invoke(state["messages"])
    return {"research_results": result.content, "next_agent": "writer"}

def writer(state):
    # Writer agent creates content based on research
    prompt = f"Based on this research: {state['research_results']}, write a draft."
    result = writer_llm.invoke(prompt)
    return {"draft": result.content, "next_agent": "reviewer"}

def reviewer(state):
    # Reviewer provides feedback
    result = reviewer_llm.invoke(f"Review this draft: {state['draft']}")
    return {"messages": [result], "next_agent": "end"}

def route_agent(state) -> str:
    return state["next_agent"]

graph = StateGraph(MultiAgentState)
graph.add_node("researcher", researcher)
graph.add_node("writer", writer)
graph.add_node("reviewer", reviewer)
graph.add_conditional_edges("researcher", route_agent)
graph.add_conditional_edges("writer", route_agent)
graph.add_conditional_edges("reviewer", route_agent)`,
    tips: [
      "Each agent should have a focused responsibility",
      "Use state to pass context between agents",
      "Consider using different models for different agents"
    ]
  },

  "tool-calling": {
    name: "Tool Calling Pattern",
    description: "Giving agents the ability to use external tools",
    code: `from langchain_core.tools import tool
from langgraph.prebuilt import ToolNode

@tool
def search_web(query: str) -> str:
    """Search the web for current information."""
    # Implementation
    return search_results

@tool
def calculate(expression: str) -> str:
    """Evaluate a mathematical expression."""
    return str(eval(expression))

@tool
def get_weather(city: str) -> str:
    """Get current weather for a city."""
    # Implementation
    return weather_data

tools = [search_web, calculate, get_weather]

# Bind tools to LLM
llm_with_tools = llm.bind_tools(tools)

# Create tool node that executes tools
tool_node = ToolNode(tools)

# In your graph:
graph.add_node("tools", tool_node)`,
    tips: [
      "Tool descriptions are critical - LLM uses them to decide when to call",
      "Keep tool functions simple and focused",
      "Always handle tool errors gracefully"
    ]
  },

  "streaming": {
    name: "Streaming Pattern",
    description: "Stream agent responses token by token",
    code: `# Stream events from the graph
async for event in app.astream_events(
    {"messages": [HumanMessage(content="Tell me a story")]},
    version="v2"
):
    kind = event["event"]
    
    if kind == "on_chat_model_stream":
        # Token streaming from LLM
        content = event["data"]["chunk"].content
        if content:
            print(content, end="", flush=True)
    
    elif kind == "on_tool_start":
        # Tool is being called
        print(f"\\nCalling tool: {event['name']}")
    
    elif kind == "on_tool_end":
        # Tool finished
        print(f"Tool result: {event['data']['output']}")`,
    tips: [
      "Use astream_events for full control over streaming",
      "Handle different event types appropriately",
      "Consider UI/UX when deciding what to stream"
    ]
  },

  "error-handling": {
    name: "Error Handling Pattern",
    description: "Robust error handling for production agents",
    code: `from langgraph.graph import StateGraph
import logging

class RobustState(TypedDict):
    messages: Annotated[list, add_messages]
    error_count: int
    last_error: str

def safe_node(func):
    """Decorator for error-resilient nodes"""
    def wrapper(state):
        try:
            return func(state)
        except Exception as e:
            logging.error(f"Node error: {e}")
            return {
                "error_count": state.get("error_count", 0) + 1,
                "last_error": str(e)
            }
    return wrapper

@safe_node
def risky_operation(state):
    # Your potentially failing code
    result = external_api_call()
    return {"messages": [AIMessage(content=result)]}

def should_retry(state) -> str:
    if state.get("error_count", 0) >= 3:
        return "give_up"
    if state.get("last_error"):
        return "retry"
    return "continue"

graph.add_conditional_edges("risky_node", should_retry, {
    "retry": "risky_node",
    "give_up": "error_handler",
    "continue": "next_node"
})`,
    tips: [
      "Always wrap external calls in try/except",
      "Implement retry logic with backoff",
      "Log errors for debugging",
      "Have a graceful degradation path"
    ]
  }
};

const RESOURCES = {
  "quickstart": {
    name: "LangGraph Quickstart",
    content: `# LangGraph Quickstart

## Installation
\`\`\`bash
pip install langgraph langchain-anthropic
\`\`\`

## Minimal Agent
\`\`\`python
from langgraph.graph import StateGraph, END
from langchain_anthropic import ChatAnthropic
from typing import TypedDict, Annotated
from langgraph.graph import add_messages

class State(TypedDict):
    messages: Annotated[list, add_messages]

llm = ChatAnthropic(model="claude-sonnet-4-20250514")

def chatbot(state: State):
    return {"messages": [llm.invoke(state["messages"])]}

graph = StateGraph(State)
graph.add_node("chatbot", chatbot)
graph.set_entry_point("chatbot")
graph.add_edge("chatbot", END)

app = graph.compile()
result = app.invoke({"messages": [("user", "Hello!")]})
\`\`\`

---
📘 **Want production patterns?** Get the full AI Agent Builder's Playbook:
https://rajathbharadwaj.github.io/ai-agent-playbook/
`
  },
  "best-practices": {
    name: "Production Best Practices",
    content: `# LangGraph Production Best Practices

## 1. State Management
- Always use TypedDict for explicit state
- Use Annotated with reducers for lists (add_messages)
- Keep state minimal - don't store large objects

## 2. Error Handling
- Wrap all external calls in try/except
- Implement retry with exponential backoff
- Have fallback paths for failures

## 3. Observability
- Log node transitions
- Track token usage and costs
- Monitor latency per node

## 4. Testing
- Unit test individual nodes
- Integration test full graphs
- Use deterministic mocks for LLM calls

## 5. Deployment
- Use persistent checkpointers (PostgreSQL, Redis)
- Set appropriate timeouts
- Implement rate limiting

---
📘 **Full production deployment guide with Docker templates:**
https://buy.stripe.com/fZu7sKapverg4yN521gA802
`
  },
  "cheatsheet": {
    name: "LangGraph Cheatsheet",
    content: `# LangGraph Quick Reference

## Graph Basics
\`\`\`python
from langgraph.graph import StateGraph, END

graph = StateGraph(MyState)
graph.add_node("name", function)
graph.set_entry_point("name")
graph.add_edge("from", "to")
graph.add_edge("from", END)
app = graph.compile()
\`\`\`

## Conditional Edges
\`\`\`python
def router(state) -> str:
    return "path_a" or "path_b"

graph.add_conditional_edges("node", router, {
    "path_a": "node_a",
    "path_b": "node_b"
})
\`\`\`

## Checkpointing
\`\`\`python
from langgraph.checkpoint.memory import MemorySaver
memory = MemorySaver()
app = graph.compile(checkpointer=memory)
\`\`\`

## Tool Node
\`\`\`python
from langgraph.prebuilt import ToolNode
tool_node = ToolNode([tool1, tool2])
graph.add_node("tools", tool_node)
\`\`\`

---
📝 **Get the full printable cheatsheet:**
https://buy.stripe.com/00w4gy55bcj86GV9ihgA801
`
  }
};

const server = new Server(
  {
    name: "langgraph-patterns-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_pattern",
        description: "Get a LangGraph pattern with code example and tips. Available patterns: react-agent, human-in-loop, multi-agent, tool-calling, streaming, error-handling",
        inputSchema: {
          type: "object",
          properties: {
            pattern: {
              type: "string",
              description: "Pattern name (react-agent, human-in-loop, multi-agent, tool-calling, streaming, error-handling)"
            }
          },
          required: ["pattern"]
        }
      },
      {
        name: "list_patterns",
        description: "List all available LangGraph patterns",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "get_snippet",
        description: "Get a code snippet for a specific LangGraph concept",
        inputSchema: {
          type: "object",
          properties: {
            concept: {
              type: "string",
              description: "Concept to get snippet for (state, node, edge, conditional, checkpoint, tools)"
            }
          },
          required: ["concept"]
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const toolArgs = args || {};

  if (name === "get_pattern") {
    const pattern = PATTERNS[toolArgs.pattern as keyof typeof PATTERNS];
    if (!pattern) {
      return {
        content: [{
          type: "text",
          text: `Pattern "${toolArgs.pattern}" not found. Available: ${Object.keys(PATTERNS).join(", ")}`
        }]
      };
    }
    return {
      content: [{
        type: "text",
        text: `# ${pattern.name}

${pattern.description}

## Code
\`\`\`python
${pattern.code}
\`\`\`

## Tips
${pattern.tips.map(t => `- ${t}`).join("\n")}

---
📘 For more advanced patterns and production deployment, check out:
https://rajathbharadwaj.github.io/ai-agent-playbook/
`
      }]
    };
  }

  if (name === "list_patterns") {
    const list = Object.entries(PATTERNS)
      .map(([key, val]) => `- **${key}**: ${val.description}`)
      .join("\n");
    return {
      content: [{
        type: "text",
        text: `# Available LangGraph Patterns

${list}

Use \`get_pattern\` with any of these names to get the full code example.

---
📘 The AI Agent Builder's Playbook has 20+ additional production patterns:
https://buy.stripe.com/fZu7sKapverg4yN521gA802
`
      }]
    };
  }

  if (name === "get_snippet") {
    const snippets: Record<string, string> = {
      state: `from typing import TypedDict, Annotated
from langgraph.graph import add_messages

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    context: str
    iteration: int`,
      
      node: `def my_node(state: AgentState) -> dict:
    # Process state and return updates
    result = do_something(state["messages"])
    return {"messages": [result]}`,
      
      edge: `graph.add_edge("node_a", "node_b")  # Direct edge
graph.add_edge("node_a", END)  # End the graph`,
      
      conditional: `def router(state) -> str:
    if some_condition(state):
        return "path_a"
    return "path_b"

graph.add_conditional_edges("node", router, {
    "path_a": "node_a",
    "path_b": "node_b"
})`,
      
      checkpoint: `from langgraph.checkpoint.memory import MemorySaver

memory = MemorySaver()
app = graph.compile(checkpointer=memory)

# Use with thread_id for persistence
config = {"configurable": {"thread_id": "user_123"}}
result = app.invoke(inputs, config)`,
      
      tools: `from langchain_core.tools import tool
from langgraph.prebuilt import ToolNode

@tool
def my_tool(arg: str) -> str:
    """Tool description for the LLM."""
    return result

tools = [my_tool]
llm_with_tools = llm.bind_tools(tools)
tool_node = ToolNode(tools)`
    };

    const snippet = snippets[toolArgs.concept as string];
    if (!snippet) {
      return {
        content: [{
          type: "text",
          text: `Concept "${toolArgs.concept}" not found. Available: ${Object.keys(snippets).join(", ")}`
        }]
      };
    }
    return {
      content: [{
        type: "text",
        text: `\`\`\`python
${snippet}
\`\`\``
      }]
    };
  }

  return { content: [{ type: "text", text: "Unknown tool" }] };
});

// List resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: Object.entries(RESOURCES).map(([uri, res]) => ({
      uri: `langgraph://${uri}`,
      name: res.name,
      mimeType: "text/markdown"
    }))
  };
});

// Read resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri.replace("langgraph://", "");
  const resource = RESOURCES[uri as keyof typeof RESOURCES];
  
  if (!resource) {
    throw new Error(`Resource not found: ${uri}`);
  }

  return {
    contents: [{
      uri: request.params.uri,
      mimeType: "text/markdown",
      text: resource.content
    }]
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LangGraph Patterns MCP server running");
}

main().catch(console.error);
