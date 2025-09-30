#!/usr/bin/env node
import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;

class FigmaServer {
  constructor() {
    this.server = new Server(
      {
        name: 'figma-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_figma_file',
          description: 'Fetch a Figma file and its components',
          inputSchema: {
            type: 'object',
            properties: {
              fileKey: {
                type: 'string',
                description: 'The Figma file key from the URL',
              },
            },
            required: ['fileKey'],
          },
        },
        {
          name: 'generate_react_component',
          description: 'Generate React component code from Figma button design',
          inputSchema: {
            type: 'object',
            properties: {
              fileKey: {
                type: 'string',
                description: 'The Figma file key',
              },
              nodeName: {
                type: 'string',
                description: 'Name of the button component in Figma',
              },
            },
            required: ['fileKey', 'nodeName'],
          },
        },
        {
          name: 'create_button',
          description: 'Create a button component in a Figma file',
          inputSchema: {
            type: 'object',
            properties: {
              fileKey: {
                type: 'string',
                description: 'The Figma file key',
              },
              text: {
                type: 'string',
                description: 'Button text',
                default: 'Button',
              },
              backgroundColor: {
                type: 'string',
                description: 'Background color in hex format (e.g., #007AFF)',
                default: '#007AFF',
              },
              width: {
                type: 'number',
                description: 'Button width in pixels',
                default: 200,
              },
              height: {
                type: 'number',
                description: 'Button height in pixels',
                default: 50,
              },
            },
            required: ['fileKey'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!FIGMA_TOKEN) {
        throw new Error('FIGMA_TOKEN environment variable is required');
      }

      switch (request.params.name) {
        case 'get_figma_file':
          return await this.getFigmaFile(request.params.arguments);
        case 'generate_react_component':
          return await this.generateReactComponent(request.params.arguments);
        case 'create_button':
          return await this.createButton(request.params.arguments);
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  async getFigmaFile({ fileKey }) {
    try {
      const response = await axios.get(
        `https://api.figma.com/v1/files/${fileKey}`,
        {
          headers: {
            'X-Figma-Token': FIGMA_TOKEN,
          },
        }
      );

      const components = this.extractComponents(response.data.document);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              name: response.data.name,
              lastModified: response.data.lastModified,
              components: components,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to fetch Figma file: ${error.message}`);
    }
  }

  extractComponents(node, components = []) {
    if (node.type === 'COMPONENT' || node.type === 'FRAME' || node.type === 'RECTANGLE') {
      components.push({
        id: node.id,
        name: node.name,
        type: node.type,
        width: node.absoluteBoundingBox?.width,
        height: node.absoluteBoundingBox?.height,
        fills: node.fills,
        strokes: node.strokes,
        cornerRadius: node.cornerRadius,
        characters: node.characters, // for text nodes
      });
    }

    if (node.children) {
      node.children.forEach(child => this.extractComponents(child, components));
    }

    return components;
  }

  async generateReactComponent({ fileKey, nodeName }) {
    try {
      const response = await axios.get(
        `https://api.figma.com/v1/files/${fileKey}`,
        {
          headers: {
            'X-Figma-Token': FIGMA_TOKEN,
          },
        }
      );

      const component = this.findNodeByName(response.data.document, nodeName);

      if (!component) {
        throw new Error(`Component "${nodeName}" not found in Figma file`);
      }

      const code = this.generateReactCode(component);

      return {
        content: [
          {
            type: 'text',
            text: code,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to generate component: ${error.message}`);
    }
  }

  findNodeByName(node, name) {
    if (node.name === name) {
      return node;
    }

    if (node.children) {
      for (const child of node.children) {
        const found = this.findNodeByName(child, name);
        if (found) return found;
      }
    }

    return null;
  }

  generateReactCode(node) {
    const width = node.absoluteBoundingBox?.width || 200;
    const height = node.absoluteBoundingBox?.height || 50;
    const cornerRadius = node.cornerRadius || 8;

    // Extract background color from fills
    let backgroundColor = '#007AFF';
    if (node.fills && node.fills.length > 0 && node.fills[0].color) {
      const color = node.fills[0].color;
      backgroundColor = this.rgbaToHex(color);
    }

    // Extract text content
    const text = this.extractText(node) || 'Button';

    return `import React from 'react';

export function ${this.toPascalCase(node.name)}({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '${width}px',
        height: '${height}px',
        backgroundColor: '${backgroundColor}',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '${cornerRadius}px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.target.style.opacity = '0.8';
        e.target.style.transform = 'scale(1.02)';
      }}
      onMouseLeave={(e) => {
        e.target.style.opacity = '1';
        e.target.style.transform = 'scale(1)';
      }}
    >
      {children || '${text}'}
    </button>
  );
}`;
  }

  extractText(node) {
    if (node.characters) {
      return node.characters;
    }
    if (node.children) {
      for (const child of node.children) {
        const text = this.extractText(child);
        if (text) return text;
      }
    }
    return null;
  }

  rgbaToHex(color) {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  toPascalCase(str) {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  hexToRgba(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b, a: 1 };
  }

  async createButton({ fileKey, text = 'Button', backgroundColor = '#007AFF', width = 200, height = 50 }) {
    try {
      // First, get the file to find the canvas/page ID
      const fileResponse = await axios.get(
        `https://api.figma.com/v1/files/${fileKey}`,
        {
          headers: {
            'X-Figma-Token': FIGMA_TOKEN,
          },
        }
      );

      // Get the first page/canvas ID
      const firstPage = fileResponse.data.document.children[0];
      if (!firstPage) {
        throw new Error('No page found in Figma file');
      }

      const color = this.hexToRgba(backgroundColor);

      // Create button using Figma REST API
      const response = await axios.post(
        `https://api.figma.com/v1/files/${fileKey}/nodes`,
        {
          node_id: firstPage.id,
          nodes: [
            {
              type: 'FRAME',
              name: text,
              x: 100,
              y: 100,
              width: width,
              height: height,
              fills: [
                {
                  type: 'SOLID',
                  color: color,
                },
              ],
              cornerRadius: 8,
              children: [
                {
                  type: 'TEXT',
                  name: text,
                  characters: text,
                  x: 0,
                  y: 0,
                  width: width,
                  height: height,
                  fills: [
                    {
                      type: 'SOLID',
                      color: { r: 1, g: 1, b: 1, a: 1 },
                    },
                  ],
                  fontSize: 16,
                  fontWeight: 600,
                  textAlignHorizontal: 'CENTER',
                  textAlignVertical: 'CENTER',
                },
              ],
            },
          ],
        },
        {
          headers: {
            'X-Figma-Token': FIGMA_TOKEN,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        content: [
          {
            type: 'text',
            text: `Button "${text}" created successfully in Figma!\n\nFile: ${fileResponse.data.name}\nPage: ${firstPage.name}\nColor: ${backgroundColor}\nSize: ${width}x${height}px`,
          },
        ],
      };
    } catch (error) {
      // Figma REST API doesn't support creating nodes directly
      // This is a limitation - need to use Figma Plugin API instead
      throw new Error(`Failed to create button: ${error.response?.data?.err || error.message}\n\nNote: Creating nodes in Figma requires using the Figma Plugin API, which needs to run inside Figma. The REST API only supports reading data.`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Figma MCP server running on stdio');
  }
}

const server = new FigmaServer();
server.run();