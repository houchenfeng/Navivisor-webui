/**
 * Handles model listing by delegating to Codex app-server.
 */
import { Injectable } from '@nestjs/common';
import { CodexService } from '../codex/codex.service';
import type { v2 } from '../codex/codex-schema';

@Injectable()
export class ModelsService {
  constructor(private readonly codex: CodexService) {}

  /**
   * Lists available models from the Codex app-server.
   *
   * @param params - Optional pagination and filter parameters
   * @returns Paginated model list
   */
  async listModels(
    params: v2.ModelListParams = {},
  ): Promise<v2.ModelListResponse> {
    return this.codex.request<v2.ModelListResponse>('model/list', params);
  }
}
