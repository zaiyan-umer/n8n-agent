export interface EmbedChunk {
  id: string;
  nodeType: string;
  displayName: string;
  operation: string | null;
  operationLabel?: string;
  text: string;
}