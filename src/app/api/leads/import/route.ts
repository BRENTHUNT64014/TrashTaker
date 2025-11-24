import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Property from '@/models/Property';
import Contact from '@/models/Contact';
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
        const alnId = row.getCell(columnMap['ALN Id'] || 1).value?.toString().trim();
        
        if (!alnId) {
          results.errors.push(`Row ${rowNumber}: Missing ALN Id`);
          continue;
        }

        const propertyName = row.getCell(columnMap['Property Name'] || 2).value?.toString().trim();
        const phone = row.getCell(columnMap['Phone #'] || 3).value?.toString().trim();
        const propertyEmail = row.getCell(columnMap['Property eMail Address'] || 4).value?.toString().trim();
        const address = row.getCell(columnMap['Address'] || 5).value?.toString().trim();
        const city = row.getCell(columnMap['City'] || 6).value?.toString().trim();
        const state = row.getCell(columnMap['State'] || 7).value?.toString().trim();
        const zip = row.getCell(columnMap['ZIP'] || 8).value?.toString().trim();
        const county = row.getCell(columnMap['County'] || 9).value?.toString().trim();
        const latitude = row.getCell(columnMap['Latitude'] || 10).value;
        const longitude = row.getCell(columnMap['Longitude'] || 11).value;
        const alnPriceClass = row.getCell(columnMap['ALN Price Class'] || 12).value?.toString().trim();
        const propType = row.getCell(columnMap['Prop Type'] || 13).value?.toString().trim();
        const feeManaged = row.getCell(columnMap['Fee Managed'] || 14).value?.toString().trim();
        const unitCount = row.getCell(columnMap['# Units'] || 15).value;
        
        // Management Company info
        const managementCompanyName = row.getCell(columnMap['Management Company'] || 16).value?.toString().trim();
        const mgmtCoAddress1 = row.getCell(columnMap['Mgmt Co Address 1'] || 17).value?.toString().trim();
        const mgmtCoAddress2 = row.getCell(columnMap['Mgmt Co Address 2'] || 18).value?.toString().trim();
        const mgmtCoCity = row.getCell(columnMap['Mgmt Co City'] || 19).value?.toString().trim();
        const mgmtCoState = row.getCell(columnMap['Mgmt Co State'] || 20).value?.toString().trim();
        const mgmtCoZip = row.getCell(columnMap['Mgmt Co ZIP'] || 21).value?.toString().trim();
        const mgmtCoPhone = row.getCell(columnMap['Mgmt Co Phone #'] || 22).value?.toString().trim();
        const ownerName = row.getCell(columnMap['Owner Name'] || 23).value?.toString().trim();
        
        // Contacts
        const areaSupervisor = row.getCell(columnMap['Area Supervisor'] || 24).value?.toString().trim();
        const areaSupervisorEmail = row.getCell(columnMap['Area Supervisor Email'] || 25).value?.toString().trim();
        const asPhone = row.getCell(columnMap['A/S Phone #'] || 26).value?.toString().trim();
        const manager = row.getCell(columnMap['Manager'] || 27).value?.toString().trim();
        
        // Company website (URL column)
        const companyWebsite = row.getCell(columnMap['URL'] || 28).value?.toString().trim();

        if (!propertyName || !unitCount) {
          results.errors.push(`Row ${rowNumber}: Missing required fields (Property Name or Units)`);
          continue;
        }

        // Find or create Management Company
        let companyId = null;
        if (managementCompanyName) {
          let company = await Company.findOne({ name: managementCompanyName });
          
          if (!company) {
            company = await Company.create({
              name: managementCompanyName,
              type: 'Management Company',
              phone: mgmtCoPhone,
              address: {
                street: [mgmtCoAddress1, mgmtCoAddress2].filter(Boolean).join(', '),
                city: mgmtCoCity,
                state: mgmtCoState,
                zipCode: mgmtCoZip,
              },
              website: companyWebsite,
              createdBy: session.user.id,
            });
          } else {
            // Update existing company with missing information
            let needsUpdate = false;
            
            if (companyWebsite && !company.website) {
              company.website = companyWebsite;
              needsUpdate = true;
            }
            
            if (mgmtCoPhone && !company.phone) {
              company.phone = mgmtCoPhone;
              needsUpdate = true;
            }
            
            // Update address fields if they're missing
            if (!company.address) {
              company.address = {};
            }
            
            const addressStreet = [mgmtCoAddress1, mgmtCoAddress2].filter(Boolean).join(', ');
            if (addressStreet && !company.address.street) {
              company.address.street = addressStreet;
              needsUpdate = true;
            }
            
            if (mgmtCoCity && !company.address.city) {
              company.address.city = mgmtCoCity;
              needsUpdate = true;
            }
            
            if (mgmtCoState && !company.address.state) {
              company.address.state = mgmtCoState;
              needsUpdate = true;
            }
            
            if (mgmtCoZip && !company.address.zipCode) {
              company.address.zipCode = mgmtCoZip;
              needsUpdate = true;
            }
            
            if (needsUpdate) {
              await company.save();
            }
          }
          companyId = company._id;
        }

        // Find or create Area Supervisor contact
        let areaSupervisorId = null;
        if (areaSupervisor && areaSupervisorEmail) {
          const [firstName, ...lastNameParts] = areaSupervisor.split(' ');
          const lastName = lastNameParts.join(' ') || firstName;
          
          // First try to find by email
          let contact = await Contact.findOne({ email: areaSupervisorEmail });
          
          if (!contact) {
            // Try finding by name and company to avoid duplicates
            contact = await Contact.findOne({ 
              firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
              lastName: { $regex: new RegExp(`^${lastName}$`, 'i') },
              company: companyId
            });
          }
          
          if (!contact) {
            // Create new contact
            contact = await Contact.create({
              firstName: firstName || 'Unknown',
              lastName: lastName || 'Unknown',
              email: areaSupervisorEmail,
              phone: asPhone,
              title: 'Area Supervisor',
              company: companyId,
              createdBy: session.user.id,
            });
          } else {
            // Update existing contact
            contact.email = areaSupervisorEmail || contact.email;
            contact.phone = asPhone || contact.phone;
            contact.title = contact.title || 'Area Supervisor';
            contact.company = companyId || contact.company;
            await contact.save();
          }
          areaSupervisorId = contact._id;
        }

        // Find or create Manager contact
        let managerId = null;
        if (manager) {
          const [firstName, ...lastNameParts] = manager.split(' ');
          const lastName = lastNameParts.join(' ') || firstName;
          
          // Try to find by name and company to avoid duplicates
          let contact = await Contact.findOne({ 
            firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
            lastName: { $regex: new RegExp(`^${lastName}$`, 'i') },
            company: companyId
          });
          
          if (!contact) {
            // Try finding by name only (in case they were previously at a different company)
            contact = await Contact.findOne({ 
              firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
              lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
            });
            
            if (!contact) {
              // Create new contact
              contact = await Contact.create({
                firstName: firstName || 'Unknown',
                lastName: lastName || 'Unknown',
                title: 'Property Manager',
                company: companyId,
                createdBy: session.user.id,
              });
            } else {
              // Update existing contact with new company
              contact.title = contact.title || 'Property Manager';
              contact.company = companyId;
              await contact.save();
            }
          } else {
            // Update existing contact
            contact.title = contact.title || 'Property Manager';
            await contact.save();
          }
          managerId = contact._id;
        }

        // Build location if coordinates exist
        let location = undefined;
        if (latitude && longitude) {
          const lat = typeof latitude === 'number' ? latitude : parseFloat(latitude.toString());
          const lng = typeof longitude === 'number' ? longitude : parseFloat(longitude.toString());
          if (!isNaN(lat) && !isNaN(lng)) {
            location = {
              type: 'Point',
              coordinates: [lng, lat],
            };
          }
        }

        // Find existing property by ALN Id
        const existingProperty = await Property.findOne({ alnId }).populate('regionalManager propertyManager company');

        // Track management changes
        const managementChanges: string[] = [];
        const oldContacts: any[] = [];
        
        if (existingProperty) {
          // Check if management company changed
          if (existingProperty.company && 
              (!companyId || existingProperty.company._id.toString() !== companyId.toString())) {
            const oldCompany = existingProperty.company;
            const newCompany = companyId ? await Company.findById(companyId) : null;
            managementChanges.push(`Management Company changed from ${oldCompany.name} to ${newCompany?.name || 'None'}`);
            
            // Remove all contacts associated with the old company from this property
            const oldCompanyContacts = await Contact.find({ 
              company: oldCompany._id,
              property: existingProperty._id
            });
            
            for (const contact of oldCompanyContacts) {
              contact.property = null;
              const currentNote = contact.notes || '';
              const newNote = `Contact was removed from ${propertyName} on ${new Date().toLocaleDateString()} because Management Company changed from ${oldCompany.name} to ${newCompany?.name || 'None'}.`;
              contact.notes = currentNote ? `${currentNote}\n\n${newNote}` : newNote;
              await contact.save();
            }
            
            // Clear property email when management company changes
            existingProperty.officeEmail = null;
          }
          
          // Check if regional manager changed
          if (existingProperty.regionalManager && 
              (!areaSupervisorId || existingProperty.regionalManager._id.toString() !== areaSupervisorId.toString())) {
            const oldContact = await Contact.findById(existingProperty.regionalManager._id);
            if (oldContact) {
              oldContacts.push({
                contact: oldContact,
                role: 'Regional Manager',
                name: `${oldContact.firstName} ${oldContact.lastName}`
              });
              managementChanges.push(`Regional Manager changed from ${oldContact.firstName} ${oldContact.lastName} to ${areaSupervisor || 'None'}`);
            }
          }
          
          // Check if property manager changed
          if (existingProperty.propertyManager && 
              (!managerId || existingProperty.propertyManager._id.toString() !== managerId.toString())) {
            const oldContact = await Contact.findById(existingProperty.propertyManager._id);
            if (oldContact) {
              oldContacts.push({
                contact: oldContact,
                role: 'Property Manager',
                name: `${oldContact.firstName} ${oldContact.lastName}`
              });
              managementChanges.push(`Property Manager changed from ${oldContact.firstName} ${oldContact.lastName} to ${manager || 'None'}`);
            }
          }
        }

        const propertyData = {
          alnId,
          alnPriceClass,
          propType,
          feeManaged,
          name: propertyName,
          propertyName, // backwards compatibility
          phone,
          officeEmail: propertyEmail,
          unitCount: typeof unitCount === 'number' ? unitCount : parseInt(unitCount.toString()),
          totalUnits: typeof unitCount === 'number' ? unitCount : parseInt(unitCount.toString()), // backwards compatibility
          address: {
            street: address,
            city,
            state,
            zipCode: zip,
            zip, // backwards compatibility
          },
          county,
          location,
          company: companyId,
          managementCompany: companyId, // backwards compatibility
          regionalManager: areaSupervisorId,
          propertyManager: managerId,
          ownerName,
          status: existingProperty?.status || 'Lead',
          createdBy: session.user.id,
        };

        let savedProperty;
        if (existingProperty) {
          // Process old contacts before updating
          for (const oldContactInfo of oldContacts) {
            const contact = oldContactInfo.contact;
            
            // Remove property association but keep company
            contact.property = null;
            
            // Add note to contact
            const currentNote = contact.notes || '';
            const newNote = `Contact was removed from ${propertyName} on ${new Date().toLocaleDateString()} because of a Management change.`;
            contact.notes = currentNote ? `${currentNote}\n\n${newNote}` : newNote;
            
            await contact.save();
          }
          
          // Update existing property
          Object.assign(existingProperty, propertyData);
          
          // Add change log if there were management changes
          if (managementChanges.length > 0) {
            if (!existingProperty.changeLog) {
              existingProperty.changeLog = [];
            }
            existingProperty.changeLog.push({
              date: new Date(),
              changes: managementChanges,
              uploadedBy: session.user.id,
            });
          }
          
          await existingProperty.save();
          savedProperty = existingProperty;
          results.updated++;
        } else {
          // Create new property
          savedProperty = await Property.create(propertyData);
          results.created++;
        }

        // Update new contacts to link to this property
        if (areaSupervisorId) {
          await Contact.findByIdAndUpdate(
            areaSupervisorId, 
            { 
              property: savedProperty._id,
              company: companyId
            },
            { new: true }
          );
        }
        if (managerId) {
          await Contact.findByIdAndUpdate(
            managerId, 
            { 
              property: savedProperty._id,
              company: companyId
            },
            { new: true }
          );
        }

      } catch (error: any) {
        results.errors.push(`Row ${rowNumber}: ${error.message}`);
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Error importing leads:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
