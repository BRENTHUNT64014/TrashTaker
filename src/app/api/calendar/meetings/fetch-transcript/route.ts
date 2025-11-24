import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { google } from 'googleapis';
import dbConnect from '@/lib/mongodb';
import Property from '@/models/Property';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { propertyId, calendarEventId } = await request.json();

    if (!propertyId || !calendarEventId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await dbConnect();

    // Initialize Google Drive API
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: session.accessToken as string });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // First, get the meeting details from Google Calendar
    let meetingTitle = '';
    try {
      const eventResponse = await calendar.events.get({
        calendarId: 'primary',
        eventId: calendarEventId,
      });
      meetingTitle = eventResponse.data.summary || '';
    } catch (error) {
      console.error('Error fetching calendar event:', error);
    }

    // Search for meeting recordings and transcripts in Google Drive
    // Google Meet creates TWO documents: "Notes by Gemini" and "Transcript"
    const searchQueries = [
      { q: `name contains 'Notes by Gemini' and name contains '${meetingTitle}'`, useOrder: true },
      { q: `name contains 'Transcript' and name contains '${meetingTitle}'`, useOrder: true },
      { q: `name contains 'Notes by Gemini'`, useOrder: true },
      { q: `name contains 'Transcript'`, useOrder: true },
      { q: `mimeType='application/vnd.google-apps.document' and name contains '${meetingTitle}'`, useOrder: true },
    ];

    let files: any[] = [];
    
    // Try each search query until we find results
    for (const queryObj of searchQueries) {
      try {
        const params: any = {
          q: queryObj.q,
          fields: 'files(id, name, mimeType, webViewLink, createdTime, description, parents)',
          pageSize: 30,
        };
        
        // Only add orderBy if not using fullText (which causes 403 error)
        if (queryObj.useOrder && !queryObj.q.includes('fullText')) {
          params.orderBy = 'createdTime desc';
        }
        
        const filesResponse = await drive.files.list(params);
        const results = filesResponse.data.files || [];
        files = [...files, ...results];
      } catch (error) {
        console.error('Search query failed:', queryObj.q, error);
      }
    }
    
    // Remove duplicates
    const uniqueFiles = files.filter((file, index, self) =>
      index === self.findIndex((f) => f.id === file.id)
    );
    
    // Find notes and transcript files
    const notesFiles = uniqueFiles.filter(file => 
      file.mimeType === 'application/vnd.google-apps.document' &&
      file.name?.includes('Notes by Gemini')
    );
    
    const transcriptFiles = uniqueFiles.filter(file => 
      file.mimeType === 'application/vnd.google-apps.document' &&
      file.name?.includes('Transcript') &&
      !file.name?.includes('Notes by Gemini')
    );

    let aiNotes = '';
    let notesLink = '';
    let transcriptLink = '';
    let transcriptContent = '';

    // First, get the Notes document
    if (notesFiles.length > 0) {
      const notesFile = notesFiles[0];
      notesLink = notesFile.webViewLink || '';

      // Try to get the notes document content
      try {
        const docs = google.docs({ version: 'v1', auth: oauth2Client });
        const docResponse = await docs.documents.get({
          documentId: notesFile.id!,
        });

        let textContent = '';
        
        // Function to recursively extract text from content elements
        const extractText = (elements: any[]): string => {
          let text = '';
          for (const element of elements) {
            // Extract from paragraphs
            if (element.paragraph?.elements) {
              for (const paragraphElement of element.paragraph.elements) {
                if (paragraphElement.textRun?.content) {
                  const content = paragraphElement.textRun.content;
                  // Skip template markers and form fields
                  if (!content.includes('tnfm_content_') && 
                      !content.includes('tnfm_survey_') &&
                      !content.trim().startsWith('===')) {
                    text += content;
                  }
                }
              }
            }
            // Extract from tables
            if (element.table) {
              text += '\n\n';
              for (const row of element.table.tableRows || []) {
                for (const cell of row.tableCells || []) {
                  if (cell.content) {
                    text += extractText(cell.content);
                    text += ' | '; // Table cell separator
                  }
                }
                text += '\n';
              }
              text += '\n';
            }
            // Extract from section breaks
            if (element.sectionBreak) {
              text += '\n\n';
            }
          }
          return text;
        };

        // Get content from main body
        const mainContent = docResponse.data.body?.content || [];
        textContent += extractText(mainContent);

        // Get content from tabs/named ranges (where transcript is stored)
        if (docResponse.data.namedRanges) {
          for (const [name, namedRange] of Object.entries(docResponse.data.namedRanges)) {
            textContent += `\n\n=== ${name} ===\n\n`;
          }
        }

        // Get content from headers and footers
        if (docResponse.data.headers) {
          for (const [headerId, header] of Object.entries(docResponse.data.headers)) {
            if ((header as any).content) {
              textContent += extractText((header as any).content);
            }
          }
        }

        // Get inline objects (might contain embedded content)
        if (docResponse.data.inlineObjects) {
          textContent += '\n\n[Document contains embedded objects]\n\n';
        }

        aiNotes = textContent.trim();
      } catch (error) {
        console.error('Error reading notes document:', error);
        aiNotes = `View meeting notes: ${notesLink}`;
      }
    }

    // Now, get the Transcript document (separate file)
    if (transcriptFiles.length > 0) {
      const transcriptFile = transcriptFiles[0];
      transcriptLink = transcriptFile.webViewLink || '';

      try {
        const docs = google.docs({ version: 'v1', auth: oauth2Client });
        const transcriptDoc = await docs.documents.get({
          documentId: transcriptFile.id!,
        });

        // Function to extract text (reuse the same function)
        const extractText = (elements: any[]): string => {
          let text = '';
          for (const element of elements) {
            if (element.paragraph?.elements) {
              for (const paragraphElement of element.paragraph.elements) {
                if (paragraphElement.textRun?.content) {
                  const content = paragraphElement.textRun.content;
                  if (!content.includes('tnfm_content_') && 
                      !content.includes('tnfm_survey_') &&
                      !content.trim().startsWith('===')) {
                    text += content;
                  }
                }
              }
            }
            if (element.table) {
              text += '\n\n';
              for (const row of element.table.tableRows || []) {
                for (const cell of row.tableCells || []) {
                  if (cell.content) {
                    text += extractText(cell.content);
                    text += ' | ';
                  }
                }
                text += '\n';
              }
              text += '\n';
            }
            if (element.sectionBreak) {
              text += '\n\n';
            }
          }
          return text;
        };

        const transcriptBody = transcriptDoc.data.body?.content || [];
        transcriptContent = extractText(transcriptBody).trim();
      } catch (error) {
        console.error('Error reading transcript document:', error);
        transcriptContent = `View transcript: ${transcriptLink}`;
      }
    }

    // Combine notes and transcript
    if (aiNotes || transcriptContent) {
      let combined = '';
      
      if (notesLink) {
        combined += `📄 Meeting Notes: ${notesLink}\n`;
      }
      if (transcriptLink) {
        combined += `📄 Full Transcript: ${transcriptLink}\n`;
      }
      combined += `\n${'='.repeat(80)}\n\n`;
      
      if (aiNotes) {
        combined += `MEETING NOTES:\n\n${aiNotes}\n\n`;
      }
      
      if (transcriptContent) {
        combined += `${'='.repeat(80)}\n\nFULL TRANSCRIPT:\n\n${transcriptContent}`;
      }
      
      aiNotes = combined;
    } else {
      aiNotes = `View meeting documents:\nNotes: ${notesLink}\nTranscript: ${transcriptLink}`;
    }

    // Update property with meeting notes
    if (aiNotes || transcriptLink) {
      const property = await Property.findById(propertyId);
      if (property && property.meetings) {
        const meetingIndex = property.meetings.findIndex(
          (m: any) => m.calendarEventId === calendarEventId
        );

        if (meetingIndex !== -1) {
          property.meetings[meetingIndex].aiNotes = aiNotes || `Meeting recording available: ${transcriptLink}`;
          await property.save();

          return NextResponse.json({
            success: true,
            aiNotes: property.meetings[meetingIndex].aiNotes,
            transcriptLink,
            filesFound: files.length,
          });
        }
      }
    }

    return NextResponse.json({
      success: false,
      message: transcriptFiles.length > 0 
        ? 'Found transcript files but could not update property. Please try again.'
        : 'No meeting notes found. Make sure recording was enabled during the Google Meet call and the meeting has ended.',
      filesFound: files.length,
      transcriptFilesFound: transcriptFiles.length,
      files: files.map(f => ({ name: f.name, mimeType: f.mimeType })),
      meetingTitle,
    });
  } catch (error: any) {
    console.error('Error fetching meeting transcript:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch meeting transcript' },
      { status: 500 }
    );
  }
}
