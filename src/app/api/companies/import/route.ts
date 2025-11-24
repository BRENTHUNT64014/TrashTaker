import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';
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
        // Column A (1): Id - DO NOT USE
        const mgmtCoName = row.getCell(columnMap['Mgmt Co Name'] || 2).value?.toString().trim();
        const address1 = row.getCell(columnMap['Address1'] || 3).value?.toString().trim();
        const address2 = row.getCell(columnMap['Address2'] || 4).value?.toString().trim();
        const city = row.getCell(columnMap['City'] || 5).value?.toString().trim();
        const state = row.getCell(columnMap['State'] || 6).value?.toString().trim();
        // Column G (7): appears to be empty/skipped
        const zip = row.getCell(columnMap['ZIP'] || 8).value?.toString().trim();
        const phone = row.getCell(columnMap['Phone #'] || 9).value?.toString().trim();
        const url = row.getCell(columnMap['URL'] || 10).value?.toString().trim();
        // Columns K-N (11-14): # Properties (Mkt), Total Units (Mkt), # Properties (NationWide), Total Units (NationWide) - DO NOT USE

        if (!mgmtCoName) {
          results.errors.push(`Row ${rowNumber}: Missing Mgmt Co Name`);
          continue;
        }

        // Check if company already exists
        let company = await Company.findOne({ 
          name: { $regex: new RegExp(`^${mgmtCoName}$`, 'i') }
        });

        if (company) {
          // Update existing company with new information
          let needsUpdate = false;

          if (phone && !company.phone) {
            company.phone = phone;
            needsUpdate = true;
          }

          if (url && !company.website) {
            company.website = url;
            needsUpdate = true;
          }

          // Update address fields if they're missing
          if (!company.address) {
            company.address = {};
          }

          const addressStreet = [address1, address2].filter(Boolean).join(', ');
          if (addressStreet && !company.address.street) {
            company.address.street = addressStreet;
            needsUpdate = true;
          }

          if (city && !company.address.city) {
            company.address.city = city;
            needsUpdate = true;
          }

          if (state && !company.address.state) {
            company.address.state = state;
            needsUpdate = true;
          }

          if (zip && !company.address.zipCode) {
            company.address.zipCode = zip;
            needsUpdate = true;
          }

          if (needsUpdate) {
            await company.save();
            results.updated++;
          }
        } else {
          // Create new company
          company = await Company.create({
            name: mgmtCoName,
            type: 'Management Company',
            phone: phone,
            website: url,
            address: {
              street: [address1, address2].filter(Boolean).join(', '),
              city: city,
              state: state,
              zipCode: zip,
            },
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
