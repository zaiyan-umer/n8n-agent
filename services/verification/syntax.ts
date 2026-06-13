export async function verifySyntax(workflowJson: any) {
  try {
    const { nodes, connections } = workflowJson;

    // 1. Check for duplicate node names
    const nodeNames = new Set<string>();
    if (Array.isArray(nodes)) {
      for (const node of nodes) {
        if (!node.name) {
          return { isValid: false, error: "All nodes must have a 'name' property." };
        }
        if (nodeNames.has(node.name)) {
          return { isValid: false, error: `Duplicate node name found: "${node.name}". Node names must be unique for routing.` };
        }
        nodeNames.add(node.name);
      }
    }

    // 2. Check for dangling wires (connections referencing non-existent nodes)
    const connectedNodes = new Set<string>();
    if (connections && typeof connections === "object") {
      for (const [sourceNode, outputData] of Object.entries(connections)) {
        if (!nodeNames.has(sourceNode)) {
          return { isValid: false, error: `Connection source node "${sourceNode}" does not exist.` };
        }

        // n8n connection structure: { "main": [ [ {"node": "TargetNode"} ] ] }
        const mainOutputs = (outputData as any)?.main || [];
        for (const outputArray of mainOutputs) {
          if (Array.isArray(outputArray)) {
            for (const connectionItem of outputArray) {
              const targetNode = connectionItem.node;
              if (targetNode) {
                if (!nodeNames.has(targetNode)) {
                  return { isValid: false, error: `Connection target node "${targetNode}" does not exist.` };
                }
                connectedNodes.add(sourceNode);
                connectedNodes.add(targetNode);
              }
            }
          }
        }
      }
    }

    // 3. Check for floating/disconnected nodes
    if (nodeNames.size > 1) {
      for (const nodeName of nodeNames) {
        if (!connectedNodes.has(nodeName)) {
          return { isValid: false, error: `Node "${nodeName}" is completely disconnected.` };
        }
      }
    }

    return { isValid: true, error: null };
  } catch (err: any) {
    return { isValid: false, error: err.message || "Unknown syntax parsing error." };
  }
}
