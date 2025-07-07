#!/usr/bin/env node

/**
 * Bookiji Maintenance Calendar Generator
 * Creates ICS calendar file with all maintenance reminders
 */

import fs from 'fs';
import path from 'path';

// Helper function to format date for ICS
function formatICSDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// Helper function to create ICS event
function createICSEvent(summary, description, startDate, recurrence = null) {
  const now = new Date();
  const event = [
    'BEGIN:VEVENT',
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(new Date(startDate.getTime() + 60 * 60 * 1000))}`, // 1 hour duration
    `DTSTAMP:${formatICSDate(now)}`,
    `UID:${Date.now()}-${Math.random().toString(36).substr(2, 9)}@bookiji.com`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    recurrence ? `RRULE:${recurrence}` : '',
    'END:VEVENT'
  ].filter(line => line !== '').join('\n');
  
  return event;
}

// Get next Monday
function getNextMonday() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  nextMonday.setHours(9, 0, 0, 0); // 9 AM
  return nextMonday;
}

// Get first Monday of next month
function getFirstMondayOfNextMonth() {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const dayOfWeek = nextMonth.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  nextMonth.setDate(1 + daysUntilMonday);
  nextMonth.setHours(9, 0, 0, 0);
  return nextMonth;
}

// Maintenance tasks
const maintenanceTasks = {
  weekly: {
    summary: "🔧 Bookiji Weekly Maintenance",
    description: `Weekly Maintenance Checklist:

□ Update sitemap with new content (public/sitemap.xml)
□ Review Google Search Console for issues
□ Check AdSense performance dashboard
□ Monitor site speed with PageSpeed Insights
□ Review support tickets and user feedback
□ Update blog content calendar
□ Check for broken links
□ Review error logs

Reference: MAINTENANCE_GUIDE.md`,
    startDate: getNextMonday(),
    recurrence: "FREQ=WEEKLY;BYDAY=MO"
  },
  
  monthly: {
    summary: "🔧 Bookiji Monthly Maintenance",
    description: `Monthly Maintenance Checklist:

□ Update all dependencies (pnpm update)
□ Run security audit (pnpm audit)
□ Review and update FAQ based on support tickets
□ Analyze Google Analytics data
□ Update meta descriptions and title tags
□ Review and optimize ad placements
□ Clean up database (old sessions, logs)
□ Update legal documents if needed
□ Review competitor changes
□ Plan content for next month

Reference: MAINTENANCE_GUIDE.md`,
    startDate: getFirstMondayOfNextMonth(),
    recurrence: "FREQ=MONTHLY;BYDAY=1MO"
  },
  
  quarterly: {
    summary: "🔧 Bookiji Quarterly Maintenance",
    description: `Quarterly Maintenance Checklist:

□ Full SEO audit and optimization
□ Review and update Terms of Service
□ Review and update Privacy Policy
□ Comprehensive security review
□ Performance optimization audit
□ User experience testing
□ Feature planning session
□ Backup strategy verification
□ Domain and SSL certificate check
□ Brand guidelines review

Reference: MAINTENANCE_GUIDE.md`,
    startDate: (() => {
      const date = new Date();
      date.setMonth(date.getMonth() + 3 - (date.getMonth() % 3));
      date.setDate(1);
      const dayOfWeek = date.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      date.setDate(1 + daysUntilMonday);
      date.setHours(9, 0, 0, 0);
      return date;
    })(),
    recurrence: "FREQ=MONTHLY;INTERVAL=3;BYDAY=1MO"
  },
  
  adsenseCheck: {
    summary: "💰 AdSense Performance Review",
    description: `AdSense Performance Check:

□ Review earnings and CTR
□ Check for policy violations
□ Optimize ad placements
□ Monitor page speed impact
□ Review content compliance
□ Check for invalid traffic

Reference: MAINTENANCE_GUIDE.md - AdSense Section`,
    startDate: (() => {
      const date = getNextMonday();
      date.setDate(date.getDate() + 14); // Every 2 weeks
      return date;
    })(),
    recurrence: "FREQ=WEEKLY;INTERVAL=2"
  },
  
  sitemapReminder: {
    summary: "🗺️ Sitemap Update Check",
    description: `Sitemap Maintenance:

□ Check if new pages were added
□ Update public/sitemap.xml if needed
□ Test sitemap at https://bookiji.com/sitemap.xml
□ Submit to Google Search Console if updated
□ Update lastmod dates for changed pages

When to update:
- New pages added (FAQ, About, Blog posts)
- Service categories added
- Landing pages created
- Major content updates

Reference: MAINTENANCE_GUIDE.md - Sitemap Section`,
    startDate: getNextMonday(),
    recurrence: "FREQ=WEEKLY;BYDAY=MO"
  }
};

// Generate ICS file
function generateMaintenanceCalendar() {
  const icsHeader = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bookiji//Maintenance Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Bookiji Maintenance',
    'X-WR-CALDESC:Regular maintenance tasks for Bookiji platform'
  ].join('\n');

  const icsFooter = 'END:VCALENDAR';

  const events = Object.values(maintenanceTasks).map(task => 
    createICSEvent(task.summary, task.description, task.startDate, task.recurrence)
  ).join('\n');

  const icsContent = [icsHeader, events, icsFooter].join('\n');

  // Write to file
  const outputPath = path.join(__dirname, '..', 'bookiji-maintenance-calendar.ics');
  fs.writeFileSync(outputPath, icsContent);

  console.log('✅ Maintenance calendar generated!');
  console.log(`📅 File saved to: ${outputPath}`);
  console.log('\n📋 Import Instructions:');
  console.log('1. Open Google Calendar or Outlook');
  console.log('2. Import the .ics file');
  console.log('3. Choose to create a new calendar called "Bookiji Maintenance"');
  console.log('\n🔔 Scheduled Events:');
  
  Object.entries(maintenanceTasks).forEach(([key, task]) => {
    console.log(`- ${task.summary}: ${task.startDate.toLocaleDateString()}`);
  });
}

// Generate Google Calendar URLs (alternative method)
function generateGoogleCalendarLinks() {
  console.log('\n🔗 Alternative: Google Calendar Quick Add Links:');
  console.log('Click these links to add events directly to Google Calendar:\n');
  
  Object.entries(maintenanceTasks).forEach(([key, task]) => {
    const startDate = task.startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = new Date(task.startDate.getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(task.summary)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(task.description)}&recur=${encodeURIComponent(task.recurrence || '')}`;
    
    console.log(`${task.summary}:`);
    console.log(`${googleUrl}\n`);
  });
}

// Main execution
console.log('🔧 Bookiji Maintenance Calendar Generator\n');

try {
  generateMaintenanceCalendar();
  generateGoogleCalendarLinks();
  
  console.log('\n💡 Pro Tips:');
  console.log('- Set calendar notifications 1 day before each event');
  console.log('- Create a dedicated "Bookiji Maintenance" calendar');
  console.log('- Share the calendar with your team if needed');
  console.log('- Update the MAINTENANCE_GUIDE.md when you complete tasks');
  
} catch (error) {
  console.error('❌ Error generating calendar:', error.message);
  process.exit(1);
} 