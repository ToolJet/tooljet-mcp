import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_HOST = `${process.env.TOOLJET_HOST}`;

// Create server instance
const server = new McpServer({
  name: "tooljet-mcp",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Helper function for making API requests
async function makeRequest<T>(method: string, url: string, data: object): Promise<T | null> {
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Basic ${process.env.TOOLJET_ACCESS_TOKEN}`
    };
  
    try {
    //   const response = await fetch(url, { headers });

    let requestData = {}

    if(method === "GET"){
        requestData = { 
            method: "GET", // Add the method here
            headers
        }
    }
    else if(method === "POST" || method === "PATCH" || method === "PUT"){
        requestData = { 
            method: method, // Add the method here
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${process.env.TOOLJET_ACCESS_TOKEN}`
            },
            body: JSON.stringify(data)
        } 
    }

      const response = await fetch(url, requestData);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      if(method === "PATCH" || method === "PUT"){
        return response.ok as T;
      }
      return (await response.json()) as T;
    } catch (error) {
      console.error("Error making request:", error);
      return null;
    }
}

  
  // Register get users tools
server.tool(
    "get-all-users",
    "Get all users of a ToolJet instance",
    {
    //   state: "123",
    },
    async ({ }) => {
      const usersUrl = `${API_HOST}/api/ext/users`;
      const usersData = await makeRequest("GET",usersUrl, {});
  
      if (!usersData) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve users data",
            },
          ],
        };
      }
  
      const users = usersData;
   
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(users),
          },
        ],
      };
    },
);

// Register get workspaces tools
server.tool(
    "get-all-workspaces",
    "Get all workspaces of a ToolJet instance",
    {
    //   state: "123",
    },
    async ({ }) => {
        const workspacesUrl = `${API_HOST}/api/ext/workspaces`;
        const workspacesData = await makeRequest("GET",workspacesUrl, {});
    
        if (!workspacesData) {
        return {
            content: [
            {
                type: "text",
                text: "Failed to retrieve workspaces data",
            },
            ],
        };
        }
    
        const workspaces = workspacesData;
    
        return {
        content: [
            {
            type: "text",
            text: JSON.stringify(workspaces),
            },
        ],
        };
    },
);

// Register get all apps details
server.tool(
    "get-all-apps",
    "Get all apps of a workspace in a ToolJet instance",
    {
      workspace_id: z.string().describe('ID of the workspace for which apps are to be fetched. Always ask the user.'),
    },
    async ({ workspace_id}) => {
        const appsUrl = `${API_HOST}/api/ext/workspace/${workspace_id}/apps`;
        const appsData = await makeRequest("GET",appsUrl, {});
    
        if (!appsData) {
        return {
            content: [
            {
                type: "text",
                text: "Failed to retrieve apps data",
            },
            ],
        };
        }
    
        const apps = appsData;
    
        return {
        content: [
            {
            type: "text",
            text: JSON.stringify(apps),
            },
        ],
        };
    },
);


// Register get user details
server.tool(
    "get-user",
    "Get a user in a ToolJet instance",
    {
      user_id: z.string().describe('ID of the user. Always ask the user.'),
    },
    async ({ user_id}) => {
        const userUrl = `${API_HOST}/api/ext/user/${user_id}`;
        const userData = await makeRequest("GET",userUrl, {});
    
        if (!userData) {
        return {
            content: [
            {
                type: "text",
                text: "Failed to retrieve apps data",
            },
            ],
        };
        }
    
        const user = userData;
    
        return {
        content: [
            {
            type: "text",
            text: JSON.stringify(user),
            },
        ],
        };
    },
);

// Register create user tool
server.tool(
    "create-user",
    "create a user in a given workspace of ToolJet instance",
    {
       user_name: z.string().describe('The name of the user. Always ask the user.'),
       user_email: z.string().describe('The email of the user. Always ask the user.'),
       workspace_name: z.string().describe('Name of the workspace in which user will join. Always ask the user.'),
    },
    async ({ user_name, user_email, workspace_name }) => {
        const usersUrl = `${API_HOST}/api/ext/users`;
        const data = {
            name: user_name,
            email: user_email,
            password: "12343242353252",
            status: "active",
            workspaces: [
                {
                    name: workspace_name
                }
            ]

        }
        const usersData = await makeRequest("POST", usersUrl, data);
    
        if (!usersData) {
        return {
            content: [
            {
                type: "text",
                text: "Failed to create a user",
            },
            ],
        };
        }
    
        const users = usersData;
    
        return {
        content: [
            {
            type: "text",
            text: JSON.stringify(users),
            },
        ],
        };
    },
);

type User = {
    name?: string;
    password?: string;
    status?: string;
};

type UserRole = {
    userId?: string;
    newRole?: string;
};

// Register update user tool
server.tool(
    "update-user",
    "update a user in a given workspace of ToolJet instance",
    {
       user_id: z.string().describe('The id of the user.It can not be changed or updated. Always ask the user.'),
       user_name: z.string().optional().describe('The new name of the user. Always ask the user. It is optional.'),
       password: z.string().optional().describe('The new password of the user. Always ask the user. It is optional.'),
       status: z.string().optional().describe('Status can either be active or archived. Always ask the user.It is optional.'),
    },
    async ({ user_id, user_name, password, status }) => {
        const usersUrl = `${API_HOST}/api/ext/user/${user_id}`;
        const user: User = {};
        if(user_name !== "undefined"){
            user.name = user_name
        }
        if(password !== "undefined"){
            user.password = password
        }
        if(status !== "undefined"){
            user.status = status
        }
        const usersData = await makeRequest("PATCH", usersUrl, user);
    
        if (!usersData) {
        return {
            content: [
            {
                type: "text",
                text: "Failed to update a user",
            },
            ],
        };
        }
    
        const users = usersData;
    
        return {
        content: [
            {
            type: "text",
            text: JSON.stringify(users),
            },
        ],
        };
    },
);

// Register update user role tool
server.tool(
    "update-user-role",
    "update a user role in a given workspace of ToolJet instance",
    {
       workspace_id: z.string().describe('ID of the workspace. Always ask the user.'),
       user_id: z.string().describe('The id of the user.It can not be changed or updated. Always ask the user.'),
       newRole: z.string().describe('The new role of the user. Always ask the user.'),
    },
    async ({ workspace_id, user_id, newRole }) => {
        const usersUrl = `${API_HOST}/api/ext/update-user-role/workspace/${workspace_id}`;
        const user: UserRole = {};
        user.userId = user_id
        user.newRole = newRole
        
        const usersData = await makeRequest("PUT", usersUrl, user);
    
        if (!usersData) {
        return {
            content: [
            {
                type: "text",
                text: "Failed to update role of the user",
            },
            ],
        };
        }
    
        const users = usersData;
    
        return {
        content: [
            {
            type: "text",
            text: JSON.stringify(users),
            },
        ],
        };
    },
);


async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("ToolJet MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});