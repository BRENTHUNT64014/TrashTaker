import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Property from '@/models/Property';
import Contact from '@/models/Contact';
import Company from '@/models/Company';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const module = searchParams.get('module') || 'all';

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    await dbConnect();

    const results: any[] = [];
    const searchRegex = new RegExp(query, 'i');

    // Search Properties and Leads
    if (module === 'all' || module === 'properties' || module === 'leads') {
      const searchQuery: any = {
        $or: [
          { name: searchRegex },
          { 'address.street': searchRegex },
          { 'address.city': searchRegex },
          { 'address.state': searchRegex },
          { alnId: searchRegex },
        ],
      };
      
      // Filter by status if searching only leads or only properties
      if (module === 'leads') {
        searchQuery.status = 'Lead';
      } else if (module === 'properties') {
        searchQuery.status = { $ne: 'Lead' }; // Not a lead
      }
      
      const properties = await Property.find(searchQuery)
        .limit(10)
        .lean();

      results.push(
        ...properties.map((prop: any) => {
          // Handle address object
          const street = prop.address?.street || '';
          const city = prop.address?.city || '';
          const state = prop.address?.state || '';
          const zipCode = prop.address?.zipCode || prop.address?.zip || '';
          
          // Build full address with city, state, and zip
          const addressParts = [];
          if (street) addressParts.push(street);
          
          const cityStateZip = [city, state, zipCode]
            .filter(Boolean)
            .join(', ');
          
          if (cityStateZip) addressParts.push(cityStateZip);
          
          const fullAddress = addressParts.join(' • ') || 'No address';
          
          // Determine if this is a lead or property based on status
          const isLead = prop.status === 'Lead';
          const type = isLead ? 'leads' : 'properties';
          
          // Add status to subtitle
          const statusLabel = prop.status ? `${prop.status} • ` : '';
          
          return {
            id: prop._id.toString(),
            type: type,
            title: prop.name || (isLead ? 'Unnamed Lead' : 'Unnamed Property'),
            subtitle: statusLabel + fullAddress,
            url: `/dashboard/crm/properties/${prop._id}`,
          };
        })
      );
    }

    // Search Contacts
    if (module === 'all' || module === 'contacts') {
      const contacts = await Contact.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
          { title: searchRegex },
        ],
      })
        .limit(10)
        .lean();

      results.push(
        ...contacts.map((contact: any) => ({
          id: contact._id.toString(),
          type: 'contacts',
          title: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
          subtitle: contact.email || contact.phone || contact.title || '',
          url: `/dashboard/crm?contact=${contact._id}`,
        }))
      );
    }

    // Search Companies
    if (module === 'all' || module === 'companies') {
      const companies = await Company.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
          { website: searchRegex },
        ],
      })
        .limit(10)
        .lean();

      results.push(
        ...companies.map((company: any) => ({
          id: company._id.toString(),
          type: 'companies',
          title: company.name || 'Unnamed Company',
          subtitle: company.email || company.phone || '',
          url: `/dashboard/crm/companies/${company._id}`,
        }))
      );
    }

    // Sort results by relevance (exact matches first)
    results.sort((a, b) => {
      const aExact = a.title.toLowerCase().startsWith(query.toLowerCase());
      const bExact = b.title.toLowerCase().startsWith(query.toLowerCase());
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return 0;
    });

    return NextResponse.json(results.slice(0, 20));
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
