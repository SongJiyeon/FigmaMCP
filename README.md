# Figma MCP Demo

A Model Context Protocol (MCP) server that connects to Figma's API and generates HTML/React component code from designs. Includes an interactive web demo for live component preview.

## Features

- **🎨 Fetch Figma Components**: Get component structure and styling data from Figma files
- **🔄 Generate Code**: Automatically create HTML/React components from Figma designs
- **🌐 Web Demo**: Interactive web interface to preview and generate code
- **🤖 MCP Compatible**: Works with any MCP client (Claude Desktop, etc.)
- **🎯 Smart Detection**: Automatically detects buttons, text, and input fields by name or style

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Get Figma Token

1. Go to [Figma Settings](https://www.figma.com/settings)
2. Navigate to "Personal Access Tokens"
3. Generate a new token
4. Copy the token

### 3. Configure Environment

Create a `.env` file in the project root:

```bash
FIGMA_TOKEN=your_figma_personal_access_token_here
```

### 4. Run the Web Demo

```bash
npm run web
```

Open your browser at `http://localhost:3000`

## Usage

### Web Demo (Recommended)

The web demo provides an interactive interface to:
- Enter your Figma file key and component name
- Preview the component live
- View extracted styling information
- See and copy generated HTML code

```bash
npm run web
```

### MCP Server

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "figma": {
      "command": "node",
      "args": ["/path/to/FigmaMCP/src/index.js"],
      "env": {
        "FIGMA_TOKEN": "your_figma_token_here"
      }
    }
  }
}
```

### Command Line Examples

List all components in a Figma file:
```bash
npm run list YOUR_FIGMA_FILE_KEY
```

Generate React component:
```bash
npm run example YOUR_FIGMA_FILE_KEY "Button"
```

## Component Detection

The system automatically detects component types:

**By Name (Primary Method):**
- `Button`, `btn` → Button component
- `TextBox`, `Input`, `Field` → Input field
- `Text`, `Label`, `Title` → Text/label

**By Visual Style (Fallback):**
- Frame with background + rounded corners → Button
- Plain text or frame without styling → Text

## Available Tools

### `get_figma_file`
Fetches a Figma file and extracts all components

**Input:**
- `fileKey`: Figma file key from URL

### `generate_react_component`
Generates React component code from Figma design

**Input:**
- `fileKey`: Figma file key
- `nodeName`: Component name in Figma

### `create_button`
Creates a button component in Figma (Note: Limited by Figma REST API)

**Input:**
- `fileKey`: Figma file key
- `text`: Button text
- `backgroundColor`: Hex color
- `width`, `height`: Dimensions

## Project Structure

```
FigmaMCP/
├── src/
│   └── index.js              # MCP server implementation
├── web/
│   ├── server.js             # Web demo backend
│   └── index.html            # Web demo frontend
├── examples/
│   ├── generate-button.js    # CLI example
│   └── list-components.js    # List components script
├── package.json
├── .env.example
└── README.md
```

## Example Output

### Button Component

```jsx
<button style="
  width: 200px;
  height: 50px;
  background-color: #007AFF;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
">
  Click Me
</button>
```

### Input Field Component

```html
<input type="text" placeholder="Enter text" style="
  width: 300px;
  height: 40px;
  background-color: #FFFFFF;
  color: #000000;
  font-size: 14px;
  border-radius: 4px;
  padding: 8px 12px;
  border: 1px solid #ddd;
">
```

## How It Works

1. Connects to Figma REST API using your personal access token
2. Fetches file structure and component data
3. Extracts styling properties (colors, dimensions, typography, etc.)
4. Detects component type (button, input, text)
5. Generates HTML/React code with extracted styles
6. Displays preview and code in web interface

## Demo Setup

1. **Create components in Figma:**
   - Design a button (name it "Button" or "Primary Button")
   - Create a text box (name it "TextBox" or "Input")
   - Add some text labels

2. **Get the file key:**
   - Open your Figma file
   - Copy file key from URL: `figma.com/file/FILE_KEY_HERE/...`

3. **Run the demo:**
   ```bash
   npm run web
   ```

4. **Try it out:**
   - Enter your file key and component name
   - Click "Fetch from Figma"
   - See the live preview and generated code!

## Requirements

- Node.js >= 18
- Figma personal access token
- A Figma file with components to demo

## Scripts

- `npm run web` - Start web demo server
- `npm run start` - Start MCP server
- `npm run example [fileKey] [componentName]` - Generate component
- `npm run list [fileKey]` - List all components in file

## License

MIT