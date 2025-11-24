import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, attendees, date } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    // Create a prompt for Gemini to generate meeting notes
    const prompt = `Generate professional meeting notes for the following meeting:

Meeting Title: ${title}
Date: ${date}
Attendees: ${attendees?.join(', ') || 'Not specified'}
Description: ${description || 'No description provided'}

Please create comprehensive meeting notes that include:
1. Meeting Overview
2. Key Discussion Points (based on the title and description)
3. Action Items
4. Next Steps

Format the notes in a clear, professional manner suitable for business documentation.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API error:', error);
      throw new Error('Failed to generate notes with Gemini');
    }

    const data = await response.json();
    const generatedNotes = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({ notes: generatedNotes });
  } catch (error: any) {
    console.error('Error generating meeting notes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate meeting notes' },
      { status: 500 }
    );
  }
}
