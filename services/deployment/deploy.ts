import axios from 'axios';

export async function deployWorkflow(workflowJson: any, workflowId?: string) {
  const baseUrl = process.env.N8N_URL;
  const apiKey = process.env.N8N_API_KEY;
  const method = workflowId ? 'PUT' : 'POST';

  if (!baseUrl || !apiKey) {
    throw new Error('N8N_URL and N8N_API_KEY environment variables must be set.');
  }

  const url = workflowId 
    ? `${baseUrl.replace(/\/$/, '')}/api/v1/workflows/${workflowId}`
    : `${baseUrl.replace(/\/$/, '')}/api/v1/workflows`;

  const options = {
    method,
    url,
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': apiKey
    },
    data: {
      name: workflowJson.name || `Generated Workflow ${Date.now()}`,
      nodes: workflowJson.nodes || [],
      connections: workflowJson.connections || {},
      settings: {}
    }
  };

  try {
    const { data } = await axios.request(options);
    console.log('Workflow deployed successfully:', data);
    return { success: true, data };
  } 
  catch (error) {
    console.error('Failed to deploy workflow:', error);
    return { success: false, error };
  }
}

export async function fetchWorkflowFromN8n(workflowId: string) {
  const baseUrl = process.env.N8N_URL;
  const apiKey = process.env.N8N_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error('N8N_URL and N8N_API_KEY environment variables must be set.');
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/v1/workflows/${workflowId}`;

  const options = {
    method: 'GET',
    url,
    headers: {
      'X-N8N-API-KEY': apiKey
    }
  };

  try {
    const { data } = await axios.request(options);
    return data;
  } catch (error) {
    console.error('Failed to fetch workflow from n8n:', error);
    throw new Error(`Failed to fetch workflow from n8n: ${error}`);
  }
}