import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Property from '@/models/Property';
import { auth } from '@/auth';
import { UserRole } from '@/types/enums';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const territory = searchParams.get('territory');
    const search = searchParams.get('search');
    const company = searchParams.get('company');

    const query: any = { isActive: true };

    if (status) {
      query.status = status;
    }

    if (company) {
      query.company = company;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { propertyName: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by role
    if (session.user.role === UserRole.SALES) {
      query.accountExecutive = session.user.id;
    } else if (session.user.role === UserRole.DISTRICT_SERVICE_MANAGER) {
      query.districtServiceManager = session.user.id;
    } else if (session.user.role === UserRole.REGIONAL_DIRECTOR_OPS) {
      query.regionalDirectorOps = session.user.id;
    }

    if (territory) {
      query.territory = territory;
    }

    const properties = await Property.find(query)
      .populate('company', 'name')
      .populate('managementCompany', 'name') // backwards compatibility
      .populate('regionalManager', 'firstName lastName email')
      .populate('propertyManager', 'firstName lastName email')
      .populate('accountExecutive', 'name email')
      .populate('districtServiceManager', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json(properties);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const data = await request.json();
    console.log('Creating property with data:', data);

    // Build property object with proper structure
    const propertyData: any = {
      name: data.name,
      company: data.company,
      unitCount: data.unitCount,
      status: data.status || 'Lead',
      createdBy: session.user.id,
    };

    // Add optional fields
    if (data.alnId) propertyData.alnId = data.alnId;
    if (data.phone) propertyData.phone = data.phone;
    if (data.officeEmail) propertyData.officeEmail = data.officeEmail;
    if (data.alnPriceClass) propertyData.alnPriceClass = data.alnPriceClass;
    if (data.propType) propertyData.propType = data.propType;
    if (data.feeManaged) propertyData.feeManaged = data.feeManaged;
    if (data.ownerName) propertyData.ownerName = data.ownerName;
    if (data.county) propertyData.county = data.county;
    if (data.areaSupervisor) propertyData.areaSupervisor = data.areaSupervisor;
    if (data.regionalManager) propertyData.regionalManager = data.regionalManager;
    if (data.propertyManager) propertyData.propertyManager = data.propertyManager;

    // Build address if any address field provided
    if (data.address || data.city || data.state || data.zip) {
      propertyData.address = {
        street: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zip: data.zip || '',
      };
    }

    // Build location if lat/long provided
    if (data.latitude && data.longitude && !isNaN(data.latitude) && !isNaN(data.longitude)) {
      propertyData.location = {
        type: 'Point',
        coordinates: [data.longitude, data.latitude],
      };
    }

    const property = await Property.create(propertyData);

    return NextResponse.json(property, { status: 201 });
  } catch (error: any) {
    console.error('Property creation error:', error);
    return NextResponse.json({ 
      error: error.message,
      details: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : undefined
    }, { status: 500 });
  }
}
