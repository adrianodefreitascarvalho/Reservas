import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  // Define the protected API paths for reservations
  if (pathname.startsWith('/api/reservas')) {
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    const isDireccao = token?.category === 'Direcção';

    // Automatically block write operations for Direcção
    if (isMutation && isDireccao) {
      return new NextResponse(
        JSON.stringify({ message: 'Acesso restrito: Apenas leitura permitida para a Direcção.' }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  return NextResponse.next();
}