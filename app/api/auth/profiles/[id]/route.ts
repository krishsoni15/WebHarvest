import { NextRequest, NextResponse } from 'next/server';
import { deleteAuthProfile, getAuthProfile } from '@/lib/db/client';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Profile ID required' }, { status: 400 });
    }

    const existing = getAuthProfile(id);
    if (!existing) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    deleteAuthProfile(id);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete profile' }, { status: 500 });
  }
}
