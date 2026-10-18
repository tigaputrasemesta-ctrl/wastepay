import { handleProtectedFillPost } from '@/lib/server/wastepay-api-route-handlers';
import { handleCorsPreflight } from '@/lib/server/wastepay-backend-core-services';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function POST(request: Request) {
  return handleProtectedFillPost(request);
}
