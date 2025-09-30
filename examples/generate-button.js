import 'dotenv/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  // Example usage - replace with your Figma file key
  const FIGMA_FILE_KEY = process.argv[2] || 'YOUR_FIGMA_FILE_KEY';
  const BUTTON_NAME = process.argv[3] || 'Button';

  console.log('Connecting to Figma MCP server...\n');

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['src/index.js'],
    env: {
      ...process.env,
      FIGMA_TOKEN: process.env.FIGMA_TOKEN,
    },
  });

  const client = new Client(
    {
      name: 'figma-example-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);

  try {
    // List available tools
    console.log('Available tools:');
    const tools = await client.listTools();
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log('');

    // Get Figma file information
    console.log('Fetching Figma file...');
    const fileResult = await client.callTool({
      name: 'get_figma_file',
      arguments: { fileKey: FIGMA_FILE_KEY },
    });

    console.log('Figma file data:');
    console.log(fileResult.content[0].text);
    console.log('');

    // Generate React component from button
    console.log(`Generating React component for "${BUTTON_NAME}"...`);
    const componentResult = await client.callTool({
      name: 'generate_react_component',
      arguments: {
        fileKey: FIGMA_FILE_KEY,
        nodeName: BUTTON_NAME,
      },
    });

    console.log('Generated React Component:');
    console.log('─'.repeat(80));
    console.log(componentResult.content[0].text);
    console.log('─'.repeat(80));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

main().catch(console.error);