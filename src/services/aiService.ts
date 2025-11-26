import { postJson } from './apiClient';
import type { AiLineArtRequestBody } from '../types/api';
import type { LineArtResponse } from '../types/ai';

export async function generateLineArt(payload: AiLineArtRequestBody) {
  return postJson<LineArtResponse>('/api/ai-lineart', payload);
}
