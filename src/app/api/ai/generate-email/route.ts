import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, context } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Build the AI prompt
    const systemPrompt = `You are a professional business email writing assistant. Generate clear, professional, and concise email content based on the user's request. Format the response as HTML suitable for an email body.`;
    
    const userPrompt = `Write an email with the following request: "${prompt}"
    
${context?.subject ? `Subject context: ${context.subject}` : ''}
${context?.currentBody ? `Current draft: ${context.currentBody}` : ''}

Generate a professional email body that is warm, clear, and action-oriented. Do not include subject line or greetings like "Dear" unless specifically requested. Return HTML formatted text with proper line breaks.`;

    // Call AI/ML API (compatible with OpenAI format)
    const aiResponse = await fetch('https://api.aimlapi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AIML_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI/ML API error:', errorText);
      throw new Error('AI API request failed');
    }

    const data = await aiResponse.json();
    const generatedContent = data.choices[0].message.content;

    return NextResponse.json({ content: generatedContent });
  } catch (error) {
    console.error('Error generating email with AI:', error);
    return NextResponse.json(
      { error: 'Failed to generate email content' },
      { status: 500 }
    );
  }
}
