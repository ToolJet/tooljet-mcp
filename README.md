# ToolJet MCP

![ToolJet Logo](https://docs.tooljet.com/img/logo.svg)

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

The easiest way to use ToolJet MCP is through NPX:

```bash
# This is executed by your AI assistant, not meant to be run directly
npx tooljet-mcp
```

### Configuration

#### Step 1: Generate an Access Token

Create an access token in your ToolJet admin panel to authenticate the MCP server.

#### Step 2: Set Up Your AI Assistant

Configure your AI assistant to use the ToolJet MCP server. Here's a typical configuration:

```json
{
  "mcpServers": {
    "tooljet": {
      "command": "npx",
      "args": ["tooljet-mcp"],
      "env": {
        "TOOLJET_ACCESS_TOKEN": "your-access-token",
        "TOOLJET_HOST": "https://your-tooljet-instance.com"
      }
    }
  }
}
```

Alternatively, you can pass these as command-line arguments:

```json
{
  "mcpServers": {
    "tooljet": {
      "command": "npx",
      "args": [
        "tooljet-mcp",
        "--access-token", "your-access-token",
        "--host", "https://your-tooljet-instance.com"
      ]
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
        "tooljet-mcp",
        "--access-token", "your-access-token",
        "--host", "https://your-tooljet-instance.com"
      ]
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
git clone https://github.com/yourusername/tooljet-mcp.git

# Install dependencies
cd tooljet-mcp
npm install

# Build the project
npm run build
```

## Learn More

- [ToolJet Documentation](https://docs.tooljet.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [ToolJet GitHub Repository](https://github.com/ToolJet/ToolJet)

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.
