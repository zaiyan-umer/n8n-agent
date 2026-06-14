import axios from 'axios';

export async function deployWorkflow(workflowJson: any) {
  const baseUrl = process.env.N8N_URL;
  const apiKey = process.env.N8N_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error('N8N_URL and N8N_API_KEY environment variables must be set.');
  }

  const options = {
    method: 'POST',
    url: `${baseUrl.replace(/\/$/, '')}/api/v1/workflows`,
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
  } catch (error) {
    console.error('Failed to deploy workflow:', error);
    return { success: false, error };
  }
}