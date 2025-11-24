import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Property from '@/models/Property';
import { auth } from '@/auth';

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    // Get status filter from query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = {};
    if (status) {
      query = { status };
    }

    // Delete properties matching the query
    const result = await Property.deleteMany(query);

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      status: status || 'all',
    });
  } catch (error: any) {
    console.error('Error deleting properties:', error);
    return NextResponse.json(
      { error: 'Failed to delete properties' },
      { status: 500 }
    );
  }
}
