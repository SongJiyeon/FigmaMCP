import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;

app.use(express.json());
app.use(express.static(__dirname));

// API endpoint to fetch Figma component
app.post('/api/fetch-component', async (req, res) => {
  const { fileKey, componentName } = req.body;

  if (!FIGMA_TOKEN) {
    return res.status(500).json({ error: 'FIGMA_TOKEN not configured' });
  }

  if (!fileKey || !componentName) {
    return res.status(400).json({ error: 'fileKey and componentName are required' });
  }

  try {
    // Fetch Figma file
    const response = await axios.get(
      `https://api.figma.com/v1/files/${fileKey}`,
      {
        headers: {
          'X-Figma-Token': FIGMA_TOKEN,
        },
      }
    );

    // Find the component by name
    const component = findNodeByName(response.data.document, componentName);

    if (!component) {
      return res.status(404).json({ error: `Component "${componentName}" not found` });
    }

    // Extract styling information and detect component type
    const componentData = extractComponentStyle(component);

    res.json({
      success: true,
      component: componentData,
      message: `Found "${componentName}" in Figma!`
    });

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch from Figma',
      details: error.response?.data?.err || error.message
    });
  }
});

function findNodeByName(node, name) {
  if (node.name === name) {
    return node;
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeByName(child, name);
      if (found) return found;
    }
  }
  return null;
}

function extractComponentStyle(node) {
  const width = node.absoluteBoundingBox?.width || 200;
  const height = node.absoluteBoundingBox?.height || 50;
  const cornerRadius = node.cornerRadius || 0;

  // Extract background color
  let backgroundColor = 'transparent';
  let hasBackground = false;
  let fillDebug = 'No fills';

  if (node.fills && node.fills.length > 0) {
    const fill = node.fills[0];
    fillDebug = JSON.stringify(fill);

    // Check if fill is visible (default true if not specified)
    const isVisible = fill.visible === undefined || fill.visible === true;

    if (isVisible && fill.type === 'SOLID' && fill.color) {
      backgroundColor = rgbaToHex(fill.color);
      // Has background if opacity is not 0
      const opacity = fill.opacity !== undefined ? fill.opacity : 1;
      hasBackground = opacity > 0 && backgroundColor !== 'transparent';
    }
  }

  // Extract text color
  let textColor = '#000000';
  if (node.type === 'TEXT' && node.fills && node.fills.length > 0 && node.fills[0].color) {
    textColor = rgbaToHex(node.fills[0].color);
  } else if (node.children) {
    // Look for text in children
    const textNode = findTextNode(node);
    if (textNode && textNode.fills && textNode.fills.length > 0 && textNode.fills[0].color) {
      textColor = rgbaToHex(textNode.fills[0].color);
    }
  }

  // Extract text
  const text = extractText(node) || 'Text';

  // Extract font properties
  let fontSize = 16;
  let fontWeight = 400;
  let textAlign = 'left';

  const textNode = node.type === 'TEXT' ? node : findTextNode(node);
  if (textNode) {
    fontSize = textNode.fontSize || 16;
    fontWeight = textNode.fontWeight || 400;
    textAlign = (textNode.textAlignHorizontal || 'LEFT').toLowerCase();
  }

  // Determine component type based on multiple factors
  let type = 'text';

  // First check: Detect by component name (most reliable)
  const nameLower = node.name.toLowerCase();
  if (nameLower.includes('button') || nameLower.includes('btn')) {
    type = 'button';
  } else if (nameLower.includes('text') || nameLower.includes('label') || nameLower.includes('title') || nameLower.includes('heading')) {
    type = 'text';
  } else if (nameLower.includes('input') || nameLower.includes('textbox') || nameLower.includes('field')) {
    type = 'input';
  } else {
    // Fallback: Detect by visual characteristics
    // It's a button if:
    // 1. It's a FRAME or COMPONENT (not just TEXT)
    // 2. AND (has a solid background OR has strokes/borders)
    // 3. AND has button-like characteristics (rounded corners OR bold text)
    const isFrame = node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE';
    const hasRoundedCorners = cornerRadius >= 4;
    const hasBorder = node.strokes && node.strokes.length > 0;
    const isButtonLike = isFrame && (hasBackground || hasBorder) && (hasRoundedCorners || fontWeight >= 600);

    // If it's just a TEXT node, it's definitely text
    if (node.type === 'TEXT') {
      type = 'text';
    } else if (isButtonLike) {
      type = 'button';
    } else {
      // Default to text for frames without clear button characteristics
      type = 'text';
    }
  }

  return {
    type,
    text,
    width,
    height,
    backgroundColor,
    borderRadius: cornerRadius,
    color: textColor,
    fontSize,
    fontWeight,
    textAlign,
    fillDebug, // Debug info
  };
}

function findTextNode(node) {
  if (node.type === 'TEXT') {
    return node;
  }
  if (node.children) {
    for (const child of node.children) {
      const textNode = findTextNode(child);
      if (textNode) return textNode;
    }
  }
  return null;
}

function extractText(node) {
  if (node.characters) {
    return node.characters;
  }
  if (node.children) {
    for (const child of node.children) {
      const text = extractText(child);
      if (text) return text;
    }
  }
  return null;
}

function rgbaToHex(color) {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

app.listen(PORT, () => {
  console.log(`\n✨ Figma MCP Demo Server running at http://localhost:${PORT}\n`);
  console.log(`Open your browser and visit: http://localhost:${PORT}\n`);
});