import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Task from '@/models/Task';
import User from '@/models/User';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get all pending tasks for the user (not closed)
    const tasks = await Task.find({
      assignedTo: session.user.id,
      status: { $ne: 'Closed' },
    })
      .sort({ dueDate: 1, priority: -1 }) // Sort by due date, then priority
      .populate('property', 'name address')
      .populate('contact', 'firstName lastName email phone')
      .populate('company', 'name')
      .sort({ priority: 1, dueDate: 1 });

    if (tasks.length === 0) {
      return NextResponse.json({ message: 'No tasks for today' });
    }

    // Get user info
    const user = await User.findById(session.user.id);
    if (!user?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    // Build email content
    const priorityOrder = { High: 1, Medium: 2, Low: 3 };
    const sortedTasks = tasks.sort((a, b) => {
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    });

    let taskListHtml = '';
    sortedTasks.forEach((task: any) => {
      const priorityColor = task.priority === 'High' ? '#ef4444' : task.priority === 'Medium' ? '#f59e0b' : '#10b981';
      const priorityBg = task.priority === 'High' ? '#fee2e2' : task.priority === 'Medium' ? '#fef3c7' : '#d1fae5';
      
      const address = task.address || (task.property?.address?.street ? 
        `${task.property.address.street}, ${task.property.address.city || ''} ${task.property.address.state || ''}`.trim() 
        : '');

      taskListHtml += `
        <div style="background: white; border-left: 4px solid ${priorityColor}; padding: 16px; margin-bottom: 12px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">${task.title}</h3>
            <span style="background: ${priorityBg}; color: ${priorityColor}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
              ${task.priority}
            </span>
          </div>
          
          <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
            <span style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; margin-right: 8px;">
              ${task.taskType}
            </span>
            <span style="background: #eff6ff; color: #2563eb; padding: 4px 8px; border-radius: 4px;">
              ${task.status}
            </span>
          </div>

          ${task.description ? `<p style="color: #4b5563; font-size: 14px; margin: 8px 0;">${task.description}</p>` : ''}
          
          ${address ? `
            <div style="color: #6b7280; font-size: 13px; margin-top: 8px;">
              <svg style="display: inline; width: 14px; height: 14px; margin-right: 4px;" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
              </svg>
              ${address}
            </div>
          ` : ''}

          ${task.property ? `
            <div style="color: #6b7280; font-size: 13px; margin-top: 4px;">
              <strong>Property:</strong> ${task.property.name}
            </div>
          ` : ''}

          ${task.contact ? `
            <div style="color: #6b7280; font-size: 13px; margin-top: 4px;">
              <strong>Contact:</strong> ${task.contact.firstName} ${task.contact.lastName}
              ${task.contact.phone ? ` • ${task.contact.phone}` : ''}
            </div>
          ` : ''}
        </div>
      `;
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">
                📋 Your Tasks for Today
              </h1>
              <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">
                ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <div style="background: #f9fafb; padding: 24px;">
              <p style="color: #374151; font-size: 16px; margin-top: 0;">
                Hi ${user.firstName || user.name},
              </p>
              <p style="color: #6b7280; font-size: 14px;">
                You have <strong>${tasks.length}</strong> task${tasks.length > 1 ? 's' : ''} scheduled for today:
              </p>

              ${taskListHtml}

              <div style="text-align: center; margin-top: 24px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
                   style="display: inline-block; background: #667eea; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  View All Tasks
                </a>
              </div>
            </div>

            <div style="background: white; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Trash Tasker • Valet Trash Service Management
              </p>
            </div>

          </div>
        </body>
      </html>
    `;

    // Send email
    await sgMail.send({
      to: user.email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@trashtasker.com',
      subject: `📋 Your Pending Tasks - ${tasks.length} task${tasks.length > 1 ? 's' : ''} for ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      html: emailHtml,
    });

    return NextResponse.json({ 
      success: true, 
      message: `Daily task email sent to ${user.email}`,
      taskCount: tasks.length 
    });
  } catch (error: any) {
    console.error('Error sending daily task email:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}

// Endpoint to send to all users (for cron job)
export async function GET(request: NextRequest) {
  try {
    // Verify this is being called by a cron service with auth token
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    console.log('Auth Header:', authHeader);
    console.log('Expected:', expectedAuth);
    console.log('CRON_SECRET exists:', !!process.env.CRON_SECRET);
    
    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get all active users
    const users = await User.find({ isActive: true });
    let emailsSent = 0;
    let errors = 0;

    for (const user of users) {
      try {
        // Get all pending tasks for this user (not closed)
        const tasks = await Task.find({
          assignedTo: user._id,
          status: { $ne: 'Closed' },
        })
        .sort({ dueDate: 1, priority: -1 }) // Sort by due date, then priority
        .populate('property contact company');

        if (tasks.length === 0) continue;

        console.log(`📧 Sending email to: ${user.email} with ${tasks.length} tasks`);

        // Generate task list HTML
        let taskListHtml = '';
        tasks.forEach((task: any) => {
          const priorityColors = {
            High: { color: '#dc2626', bg: '#fee2e2' },
            Medium: { color: '#f59e0b', bg: '#fef3c7' },
            Low: { color: '#10b981', bg: '#d1fae5' }
          };
          const { color: priorityColor, bg: priorityBg } = priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.Low;
          
          const address = task.address || (task.property?.address?.street ? 
            `${task.property.address.street}, ${task.property.address.city || ''} ${task.property.address.state || ''}`.trim() 
            : '');

          taskListHtml += `
            <div style="background: white; border-left: 4px solid ${priorityColor}; padding: 16px; margin-bottom: 12px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">${task.title}</h3>
                <span style="background: ${priorityBg}; color: ${priorityColor}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                  ${task.priority}
                </span>
              </div>
              
              <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
                <span style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; margin-right: 8px;">
                  ${task.taskType}
                </span>
                <span style="background: #eff6ff; color: #2563eb; padding: 4px 8px; border-radius: 4px;">
                  ${task.status}
                </span>
              </div>

              ${task.description ? `<p style="color: #4b5563; font-size: 14px; margin: 8px 0;">${task.description}</p>` : ''}
              
              ${address ? `
                <div style="color: #6b7280; font-size: 13px; margin-top: 8px;">
                  📍 ${address}
                </div>
              ` : ''}

              ${task.property ? `
                <div style="color: #6b7280; font-size: 13px; margin-top: 4px;">
                  <strong>Property:</strong> ${task.property.name}
                </div>
              ` : ''}

              ${task.contact ? `
                <div style="color: #6b7280; font-size: 13px; margin-top: 4px;">
                  <strong>Contact:</strong> ${task.contact.firstName} ${task.contact.lastName}
                  ${task.contact.phone ? ` • ${task.contact.phone}` : ''}
                </div>
              ` : ''}
            </div>
          `;
        });

        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">📋 Your Pending Tasks</h1>
                  <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">
                    ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>

                <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px;">
                  <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
                    Good morning! You have <strong>${tasks.length} pending task${tasks.length > 1 ? 's' : ''}</strong>.
                  </p>

                  ${taskListHtml}

                  <div style="text-align: center; margin-top: 24px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" 
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                      View Dashboard
                    </a>
                  </div>
                </div>

                <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;">
                  <p style="margin: 0;">
                    TrashTasker Daily Task Notification
                  </p>
                </div>
              </div>
            </body>
          </html>
        `;

        await sgMail.send({
          to: user.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@trashtasker.com',
          subject: `📋 Your Pending Tasks - ${tasks.length} task${tasks.length > 1 ? 's' : ''} for ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          html: emailHtml,
        });
        
        console.log(`✅ Email sent successfully to ${user.email}`);
        emailsSent++;
      } catch (error) {
        console.error(`❌ Error sending email to ${user.email}:`, error);
        errors++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      emailsSent, 
      errors,
      message: `Sent daily task emails to ${emailsSent} users` 
    });
  } catch (error: any) {
    console.error('Error in daily email cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
