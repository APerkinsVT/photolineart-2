import { postJson } from './apiClient';
import type { ManifestItem } from '../types/manifest';

export interface EnhancedManifestItem extends ManifestItem {
  enhancementError?: string;
}

export interface EnhanceTipsResponse {
  items: EnhancedManifestItem[];
  errors?: string[];
}

export function enhanceTips(items: ManifestItem[]) {
  return postJson<EnhanceTipsResponse>('/api/tips-enhance', { items });
}
