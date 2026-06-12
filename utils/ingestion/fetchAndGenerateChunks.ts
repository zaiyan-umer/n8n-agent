import { EmbedChunk } from "./types";

/**
 * Generates a clean textual representation of a node and its properties to be embedded.
 */
export function nodeToEmbedText(node: any, properties: any[], op?: any): string {
  let text = `Node Display Name: ${node.displayName}\n`;
  text += `Node Type: ${node.nodeType}\n`;
  if (node.description) {
    text += `Description: ${node.description}\n`;
  }
  if (op) {
    text += `Operation: ${op.name || op.value} (${op.value})\n`;
    if (op.description) {
      text += `Operation Description: ${op.description}\n`;
    }
  }

  if (properties && properties.length > 0) {
    text += `Parameters:\n`;
    for (const p of properties) {
      if (p.name === "operation") continue;
      text += `- ${p.displayName} (${p.name}): type=${p.type}`;
      if (p.description) {
        text += `, description="${p.description}"`;
      }
      if (p.default !== undefined) {
        let defVal = p.default;
        if (typeof defVal === "object") {
          defVal = JSON.stringify(defVal);
        }
        text += `, default=${defVal}`;
      }
      if (p.required) {
        text += `, required=true`;
      }
      text += `\n`;
    }
  }
  return text.trim();
}

/**
 * Splits a node definition into chunks by its operations.
 * If a node does not define operations, it is chunked as a single default chunk.
 */
export function chunkByOperation(node: any): EmbedChunk[] {
  const chunks: EmbedChunk[] = [];
  const props = Array.isArray(node.properties) ? node.properties : (node.properties?.data || []);

  // Find all unique operations
  const operationProp = props.find((p: any) => p.name === "operation");

  if (!operationProp || !Array.isArray(operationProp.options)) {
    // No operations — small node, embed as single chunk
    return [
      {
        id: node.nodeType,
        nodeType: node.nodeType,
        displayName: node.displayName,
        operation: null,
        text: nodeToEmbedText(node, props),
      },
    ];
  }

  // Chunk per operation
  for (const op of operationProp.options) {
    if (!op || op.value === undefined) continue;

    const relevantProps = props.filter((p: any) => {
      const show = p.displayOptions?.show?.operation;
      if (!show) return false;
      if (Array.isArray(show)) {
        return show.includes(op.value);
      }
      return show === op.value;
    });

    chunks.push({
      id: `${node.nodeType}__${op.value}`,
      nodeType: node.nodeType,
      displayName: node.displayName,
      operation: op.value,
      operationLabel: op.name,
      text: nodeToEmbedText(node, relevantProps, op),
    });
  }

  return chunks;
}