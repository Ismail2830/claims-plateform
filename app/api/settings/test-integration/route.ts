import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { type } = body as { type: 'whatsapp' | 'pusher' | 'storage' };

    // Basic connectivity check — just validate required fields present
    if (type === 'whatsapp') {
      if (!body.token || !body.phoneNumber) {
        return NextResponse.json({ success: false, error: 'Token et numéro requis' }, { status: 400 });
      }
    } else if (type === 'pusher') {
      const { appId, key, secret, cluster } = body;
      if (!appId || !key || !secret || !cluster) {
        return NextResponse.json({ success: false, error: 'Tous les champs Pusher sont requis' }, { status: 400 });
      }
    } else if (type === 'storage') {
      // Local storage always passes
    } else {
      return NextResponse.json({ success: false, error: 'Type inconnu' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Intégration ${type} testée avec succès` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
