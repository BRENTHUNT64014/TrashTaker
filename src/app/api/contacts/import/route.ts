import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Contact from '@/models/Contact';
import Company from '@/models/Company';
import Property from '@/models/Property';
import { auth } from '@/auth';
import ExcelJS from 'exceljs';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read the Excel file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json({ error: 'No worksheet found' }, { status: 400 });
    }

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Get header row to map columns
    const headerRow = worksheet.getRow(1);
    const columnMap: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      const header = cell.value?.toString().trim();
      if (header) {
        columnMap[header] = colNumber;
      }
    });

    // Process each row (skip header)
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      
      try {
        // Extract data from Excel columns
        // Column 1: Contact id (Until 01/01/2020) - SKIP
        // Column 2: Contact - SKIP
        const firstName = row.getCell(columnMap['First Name'] || 3).value?.toString().trim();
        const lastName = row.getCell(columnMap['Last Name'] || 4).value?.toString().trim();
        const title = row.getCell(columnMap['Title'] || 5).value?.toString().trim();
        const propertyName = row.getCell(columnMap['Property'] || 6).value?.toString().trim();
        const companyName = row.getCell(columnMap['Management Company'] || 7).value?.toString().trim();
        // Columns 8-11: Address1, Address2, City, State, ZIP - SKIP
        const email = row.getCell(columnMap['Email'] || 12).value?.toString().trim();
        // Column 13: Bounces? - SKIP
        const phoneNumber = row.getCell(columnMap['Phone Number'] || 14).value?.toString().trim();
        // Columns 15-16: API Contact ID, DateValidOn - SKIP

        if (!firstName) {
          results.errors.push(`Row ${rowNumber}: Missing First Name`);
          continue;
        }

        // Find company if specified
        let companyId = null;
        if (companyName) {
          const company = await Company.findOne({ 
            name: { $regex: new RegExp(`^${companyName}$`, 'i') }
          });
          if (company) {
            companyId = company._id;
          }
        }

        // Find property if specified
        let propertyId = null;
        if (propertyName) {
          const property = await Property.findOne({ 
            $or: [
              { name: { $regex: new RegExp(`^${propertyName}$`, 'i') } },
              { propertyName: { $regex: new RegExp(`^${propertyName}$`, 'i') } }
            ]
          });
          if (property) {
            propertyId = property._id;
          }
        }

        // Check if contact already exists by first and last name
        const query: any = {
          firstName: { $regex: new RegExp(`^${firstName}$`, 'i') }
        };
        
        if (lastName) {
          query.lastName = { $regex: new RegExp(`^${lastName}$`, 'i') };
        }
        
        let contact = await Contact.findOne(query);

        if (contact) {
          // Update existing contact if missing email or phone
          let needsUpdate = false;

          if (email && !contact.email) {
            contact.email = email;
            needsUpdate = true;
          }

          if (phoneNumber && !contact.phone) {
            contact.phone = phoneNumber;
            needsUpdate = true;
          }

          // Update Last Verified date
          contact.lastVerified = new Date();
          needsUpdate = true;

          if (needsUpdate) {
            await contact.save();
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          // Create new contact
          contact = await Contact.create({
            firstName: firstName,
            lastName: lastName || '',
            title: title,
            email: email,
            phone: phoneNumber,
            company: companyId,
            property: propertyId,
            lastVerified: new Date(),
            createdBy: session.user.id,
          });
          results.created++;
        }

      } catch (error: any) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.errors.push(`Row ${rowNumber}: ${error.message}`);
      }
    }

    return NextResponse.json({
      message: 'Import completed',
      results,
    });

  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
