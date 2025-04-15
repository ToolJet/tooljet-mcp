# ToolJet MCP

Empower your AI assistants with direct access to your ToolJet platform. This MCP (Model Context Protocol) integration enables AI tools like Claude, Cursor, and other MCP-compatible assistants to interact with your ToolJet instance.

## What is ToolJet MCP?

ToolJet MCP is a bridge that connects AI assistants to your ToolJet platform through the Model Context Protocol. This allows AI tools to:

- Manage users and workspaces
- Access app information
- Perform administrative tasks
- Interact with your ToolJet instance programmatically

## Getting Started

### Requirements

- Node.js (v14 or higher)
- A ToolJet instance with admin access
- An MCP-compatible AI assistant (Claude, Cursor, etc.)

### Installation

You can install the ToolJet MCP package globally:

```bash
npm install -g @tooljet/mcp
```

### Configuration

#### Step 1: Get an Access Token

Get an access token of your ToolJet instance that you've setup up in your environment variables. You'll need this token to authenticate the MCP server. Refer to the [ToolJet API](https://docs.tooljet.ai/docs/tooljet-api#enabling-tooljet-api) documentation for more details.

#### Step 2: Set Up Your AI Assistant


Configure your MCP client (such as Claude, Cursor, etc.) to use this server. Most MCP clients store the configuration as JSON in the following format:

```json
{
  "mcpServers": {
    "tooljet": {
      "command": "npx",
      "args": [
        "-y",
        "@tooljet/mcp"
      ],
      "env": {
        "TOOLJET_ACCESS_TOKEN": "your-access-token",
        "TOOLJET_HOST": "https://your-tooljet-instance.com"
      }
    }
  }
}
```

### Platform-Specific Setup

#### Windows Users

If you're using Windows, prefix the command with `cmd /c`:

```json
{
  "mcpServers": {
    "tooljet": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "@tooljet/mcp"
      ],
      "env": {
        "TOOLJET_ACCESS_TOKEN": "your-access-token",
        "TOOLJET_HOST": "https://your-tooljet-instance.com"
      }
    }
  }
}
```

## Available Tools

ToolJet MCP provides several tools that AI assistants can use to interact with your ToolJet instance:

### User Management

| Tool | Description |
|------|-------------|
| `get-all-users` | Retrieve a list of all users in your ToolJet instance |
| `get-user` | Get detailed information about a specific user |
| `create-user` | Create a new user in a specified workspace |
| `update-user` | Update a user's profile information |
| `update-user-role` | Change a user's role within a workspace |

### Workspace Management

| Tool | Description |
|------|-------------|
| `get-all-workspaces` | List all workspaces in your ToolJet instance |

### Application Management

| Tool | Description |
|------|-------------|
| `get-all-apps` | List all applications within a specific workspace |

## Example Usage

Once configured, your AI assistant can perform tasks like:

- "Show me all users in my ToolJet instance"
- "Create a new user named John Doe in the Marketing workspace"
- "List all the apps in the Development workspace"
- "Update the role of user@example.com to Admin in the Sales workspace"

## Development

Want to contribute to ToolJet MCP? Here's how to set up the development environment:

```bash
# Clone the repository
git clone https://github.com/ToolJet/tooljet-mcp

# Install dependencies
cd mcp
npm install

# Build the project
npm run build
```

## Learn More

- [ToolJet Documentation](https://docs.tooljet.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [ToolJet GitHub Repository](https://github.com/ToolJet/ToolJet)
