import { v4 as uuidv4 } from 'uuid';

export function sanitizeNodeIds(workflow: any) {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (workflow.nodes && Array.isArray(workflow.nodes)) {
    workflow.nodes = workflow.nodes.map((node: any) => ({
      ...node,
      id: UUID_REGEX.test(node.id ?? '') ? node.id : uuidv4()
    }));
  }

  return workflow;
}
