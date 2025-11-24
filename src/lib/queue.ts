import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { sendEmail, sendViolationEmail } from './sendgrid';
import { sendSMS, sendTicketSLAAlert } from './twilio';
import connectDB from './mongodb';
import Violation from '@/models/Violation';
import Ticket from '@/models/Ticket';
import Communication from '@/models/Communication';
import { ViolationStatus } from '@/types/enums';
import { addDays } from 'date-fns';

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

// Queues
export const emailQueue = new Queue('email', { connection });
export const violationQueue = new Queue('violations', { connection });
export const ticketQueue = new Queue('tickets', { connection });
export const cleanupQueue = new Queue('cleanup', { connection });

// Email Worker
export const emailWorker = new Worker(
  'email',
  async (job) => {
    const { to, subject, html, attachments } = job.data;
    await sendEmail({ to, subject, html, attachments });
  },
  { connection }
);

// Violation Worker - Send violations at 7 AM
export const violationWorker = new Worker(
  'violations',
  async (job) => {
    await connectDB();
    
    const violations = await Violation.find({
      status: ViolationStatus.APPROVED,
      sentAt: null,
    })
      .populate('property')
      .populate('reportedBy');

    for (const violation of violations) {
      // Generate PDF and send email
      // TODO: Implement PDF generation
      await sendViolationEmail(
        violation.property.contacts[0]?.email,
        violation.property.propertyName,
        violation.unit,
        violation.violationType,
        violation.photos
      );

      violation.status = ViolationStatus.SENT;
      violation.sentAt = new Date();
      await violation.save();
    }
  },
  { connection }
);

// Ticket SLA Worker - Check tickets every 15 minutes
export const ticketWorker = new Worker(
  'tickets',
  async (job) => {
    await connectDB();

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const currentHour = new Date().getHours();

    // Skip if it's between 10 PM and 9 AM
    if (currentHour >= 22 || currentHour < 9) {
      return;
    }

    const overdueTickets = await Ticket.find({
      status: 'OPEN',
      acknowledgedAt: null,
      createdAt: { $lt: twoHoursAgo },
    }).populate('assignedTo');

    for (const ticket of overdueTickets) {
      if (ticket.assignedTo?.phone) {
        await sendTicketSLAAlert(ticket.assignedTo.phone, ticket.ticketNumber);
      }
    }
  },
  { connection }
);

// Cleanup Worker - Remove old data
export const cleanupWorker = new Worker(
  'cleanup',
  async (job) => {
    await connectDB();

    // Violations are auto-deleted by MongoDB TTL index after 90 days
    // Communications are auto-deleted by MongoDB TTL index after 12 months
    
    // This worker can handle additional cleanup tasks if needed
  },
  { connection }
);

// Schedule recurring jobs
export async function setupRecurringJobs() {
  // Send violations every day at 7 AM
  await violationQueue.add(
    'send-violations',
    {},
    {
      repeat: {
        pattern: '0 7 * * *', // 7 AM every day
      },
    }
  );

  // Check ticket SLAs every 15 minutes
  await ticketQueue.add(
    'check-sla',
    {},
    {
      repeat: {
        every: 15 * 60 * 1000, // 15 minutes
      },
    }
  );

  // Cleanup old data daily at 2 AM
  await cleanupQueue.add(
    'cleanup',
    {},
    {
      repeat: {
        pattern: '0 2 * * *', // 2 AM every day
      },
    }
  );
}
