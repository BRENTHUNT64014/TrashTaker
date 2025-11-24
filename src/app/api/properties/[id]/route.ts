import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Property from '@/models/Property';
import { auth } from '@/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const property = await Property.findById(id)
      .populate('company', 'name website')
      .populate('managementCompany', 'name website')
      .populate('regionalManager', 'firstName lastName email phone')
      .populate('propertyManager', 'firstName lastName email phone')
      .populate('accountExecutive', 'firstName lastName name email')
      .populate('salesManager', 'firstName lastName name email')
      .populate('regionalDirectorOps', 'firstName lastName name email')
      .populate('districtServiceManager', 'firstName lastName name email')
      .populate('changeLog.uploadedBy', 'name email');

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json(property);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const data = await request.json();

    // Build update object with proper structure
    const updateData: any = {};

    // Direct field updates
    if (data.name !== undefined) updateData.name = data.name;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.unitCount !== undefined) updateData.unitCount = data.unitCount;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.alnId !== undefined) updateData.alnId = data.alnId;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.officeEmail !== undefined) updateData.officeEmail = data.officeEmail;
    if (data.alnPriceClass !== undefined) updateData.alnPriceClass = data.alnPriceClass;
    if (data.propType !== undefined) updateData.propType = data.propType;
    if (data.feeManaged !== undefined) updateData.feeManaged = data.feeManaged;
    if (data.ownerName !== undefined) updateData.ownerName = data.ownerName;
    if (data.county !== undefined) updateData.county = data.county;
    if (data.areaSupervisor !== undefined) updateData.areaSupervisor = data.areaSupervisor;
    if (data.regionalManager !== undefined) updateData.regionalManager = data.regionalManager;
    if (data.propertyManager !== undefined) updateData.propertyManager = data.propertyManager;
    if (data.statusHistory !== undefined) updateData.statusHistory = data.statusHistory;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.attachments !== undefined) updateData.attachments = data.attachments;
    if (data.accountExecutive !== undefined) updateData.accountExecutive = data.accountExecutive;
    if (data.salesManager !== undefined) updateData.salesManager = data.salesManager;
    if (data.regionalDirectorOps !== undefined) updateData.regionalDirectorOps = data.regionalDirectorOps;
    if (data.districtServiceManager !== undefined) updateData.districtServiceManager = data.districtServiceManager;

    // Build address if any address field provided
    if (data.address !== undefined || data.city !== undefined || data.state !== undefined || data.zip !== undefined) {
      updateData.address = {
        street: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zip: data.zip || '',
      };
    }

    // Build location if lat/long provided
    if (data.latitude !== undefined && data.longitude !== undefined && !isNaN(data.latitude) && !isNaN(data.longitude)) {
      updateData.location = {
        type: 'Point',
        coordinates: [data.longitude, data.latitude],
      };
    }

    const property = await Property.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('company', 'name')
      .populate('managementCompany', 'name')
      .populate('regionalManager', 'firstName lastName email phone')
      .populate('propertyManager', 'firstName lastName email phone')
      .populate('accountExecutive', 'firstName lastName name email')
      .populate('salesManager', 'firstName lastName name email')
      .populate('regionalDirectorOps', 'firstName lastName name email')
      .populate('districtServiceManager', 'firstName lastName name email');

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json(property);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const property = await Property.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Property deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
