/** Hey API SDK generation config. Run: pnpm generate:api */
import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: 'http://localhost:8172/api/docs-json',
  output: 'src/generated/api',
  plugins: [
    '@hey-api/client-fetch',
    '@hey-api/sdk',
    {
      name: '@hey-api/typescript',
      enums: 'javascript',
    },
    {
      name: '@tanstack/react-query',
      queryOptions: true,
      mutationOptions: true,
    },
  ],
});
