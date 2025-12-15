import cron from 'node-cron';
import ReportSchedule from '../models/ReportSchedule.js';
import Post from '../models/Post.js';
import Client from '../models/Client.js';
import User from '../models/User.js';
import { generateReport, generateReportWithTemplate, generatePDFFromTemplate, generatePDFFromHTML } from '../services/reportService.js';
import { sendMonthlyReportEmail, sendReportToClient } from '../services/emailService.js';

export const initReportScheduler = () => {
    console.log('📅 Initializing Report Scheduler...');

    // Run every minute to check for due reports
    cron.schedule('* * * * *', async () => {
        console.log('⏰ Running Report Scheduler check...');
        try {
            const now = new Date();

            // Find active schedules that are due
            const dueSchedules = await ReportSchedule.find({
                isActive: true,
                nextRun: { $lte: now }
            }).populate('client').populate('createdBy');

            console.log(`Found ${dueSchedules.length} due report schedules.`);

            for (const schedule of dueSchedules) {
                await processSchedule(schedule);
            }

        } catch (error) {
            console.error('❌ Error in Report Scheduler:', error);
        }
    });
};

export async function processSchedule(schedule) {
    try {
        console.log(`Processing schedule for client ${schedule.client?.name || schedule.client} (${schedule._id})`);

        if (!schedule.client || !schedule.createdBy) {
            console.warn(`Invalid schedule ${schedule._id}: missing client or creator`);
            return;
        }

        const userId = schedule.createdBy._id;
        const client = schedule.client;
        const { interval, templateId, format, emailRecipients } = schedule;

        // Determine date range based on interval
        const endDate = new Date();
        const startDate = new Date();

        if (interval === 'weekly') {
            startDate.setDate(endDate.getDate() - 7);
        } else {
            // Monthly
            startDate.setMonth(endDate.getMonth() - 1);
        }

        // Fetch posts
        const posts = await Post.find({
            createdBy: userId,
            client: client._id,
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        }).populate('client', 'name email platform');

        // Generate Report
        let report;
        let pdfBuffer = null;

        if (format === 'pdf') {
            if (templateId && templateId.endsWith('.pdf')) {
                pdfBuffer = await generatePDFFromTemplate(userId, posts, [client], {
                    startDate,
                    endDate,
                    templateName: templateId
                });
            } else {
                // HTML to PDF
                const reportWithHtml = await generateReportWithTemplate(userId, posts, [client], {
                    startDate,
                    endDate,
                    templateName: templateId || 'professional-modern.html',
                    format: 'html'
                });
                pdfBuffer = await generatePDFFromHTML(reportWithHtml.html);
            }
            // Also generate basic report for email body
            report = await generateReport(userId, posts, [client], { startDate, endDate });
        } else {
            // JSON or HTML
            report = await generateReportWithTemplate(userId, posts, [client], {
                startDate,
                endDate,
                templateName: templateId,
                format: format === 'json' ? 'json' : 'html'
            });
        }

        // Prepare recipients list
        const recipients = [...emailRecipients];
        if (schedule.sendToClient && client.email) {
            recipients.push(client.email);
        }

        // Deduplicate
        const uniqueRecipients = [...new Set(recipients)];

        // Send Emails
        for (const email of uniqueRecipients) {
            if (format === 'pdf') {
                // Send with attachment
                // We might need a specific email service function for this
                // reusing sendReportToClient for now as it handles attachments
                await sendReportToClient(email, client.name, report, templateId, format, pdfBuffer);
            } else {
                // Send HTML/Text email
                await sendMonthlyReportEmail(email, client.name, report, templateId, format);
            }
        }

        // Update Schedule for next run
        const now = new Date();
        let nextRun = new Date(schedule.nextRun);

        // Advance nextRun until it's in the future
        while (nextRun <= now) {
            if (interval === 'weekly') {
                nextRun.setDate(nextRun.getDate() + 7);
            } else {
                // Monthly
                nextRun.setMonth(nextRun.getMonth() + 1);
            }
        }

        schedule.lastRun = now;
        schedule.nextRun = nextRun;
        await schedule.save();

        console.log(`✅ Successfully processed schedule ${schedule._id}. Next run: ${nextRun}`);

    } catch (error) {
        console.error(`❌ Failed to process schedule ${schedule._id}:`, error);
    }
}
