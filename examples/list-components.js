import 'dotenv/config';
import axios from 'axios';

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const FIGMA_FILE_KEY = process.argv[2];

if (!FIGMA_FILE_KEY) {
  console.error('Usage: node examples/list-components.js <figma-file-key>');
  process.exit(1);
}

if (!FIGMA_TOKEN) {
  console.error('Error: FIGMA_TOKEN not set in .env file');
  process.exit(1);
}

async function listComponents() {
  try {
    const response = await axios.get(
      `https://api.figma.com/v1/files/${FIGMA_FILE_KEY}`,
      {
        headers: {
          'X-Figma-Token': FIGMA_TOKEN,
        },
      }
    );

    console.log(`\nFile: ${response.data.name}\n`);
    console.log('Available components/frames:\n');

    function traverse(node, depth = 0) {
      const indent = '  '.repeat(depth);
      if (node.name && node.type) {
        console.log(`${indent}- ${node.name} (${node.type})`);
      }
      if (node.children) {
        node.children.forEach(child => traverse(child, depth + 1));
      }
    }

    traverse(response.data.document);
  } catch (error) {
    console.error('Error:', error.response?.data?.err || error.message);
  }
}

listComponents();