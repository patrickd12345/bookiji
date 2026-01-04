export interface HelpArticle {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  content: string;
  related?: string[];
}

export const helpArticles: HelpArticle[] = [
  {
    slug: 'how-booking-works',
    title: 'How Booking Works',
    category: 'Booking',
    tags: ['booking', 'steps', 'process'],
    content: `
      <h2>Step-by-step booking guide</h2>
      <ol>
        <li>Search for a provider and choose a service.</li>
        <li>Select an available time slot.</li>
        <li>Confirm your details and pay the $1 commitment fee.</li>
        <li>Receive confirmation and contact handoff.</li>
      </ol>
    `,
    related: ['reschedule-cancel','refunds-no-shows','calendar-linking']
  },
  {
    slug: 'the-1-commitment-fee',
    title: 'The $1 Commitment Fee',
    category: 'Payments',
    tags: ['payment','security'],
    content: `
      <p>We charge a $1 commitment fee to confirm booking intent and reduce casual holds.</p>
      <p>Once the booking is confirmed and contact information is exchanged, Bookiji exits.</p>
    `,
    related: ['refunds-no-shows']
  },
  {
    slug: 'reschedule-cancel',
    title: 'Reschedule & Cancel',
    category: 'Booking',
    tags: ['reschedule','cancel','booking'],
    content: `
      <p>You can modify or cancel a booking from your dashboard.</p>
      <ol>
        <li>Open your upcoming booking.</li>
        <li>Choose "Reschedule" or "Cancel".</li>
        <li>Follow the prompts to confirm.</li>
      </ol>
    `,
    related: ['how-booking-works','refunds-no-shows']
  },
  {
    slug: 'refunds-no-shows',
    title: 'Commitment Fee Refunds',
    category: 'Payments',
    tags: ['refunds','payment'],
    content: `
      <p>In some cases, cancelling within the allowed window triggers an automatic refund of the $1 commitment fee.</p>
      <p>Bookiji does not handle service-outcome disputes or no-show adjudication.</p>
    `,
    related: ['the-1-commitment-fee','reschedule-cancel']
  },
  {
    slug: 'provider-onboarding',
    title: 'Provider Onboarding',
    category: 'Providers',
    tags: ['vendor','onboarding'],
    content: `
      <ol>
        <li>Create a vendor account.</li>
        <li>Verify your email and complete your profile.</li>
        <li>Link your calendar and set availability.</li>
        <li>Start accepting bookings.</li>
      </ol>
    `,
    related: ['calendar-linking']
  },
  {
    slug: 'calendar-linking',
    title: 'Calendar Linking',
    category: 'Providers',
    tags: ['google','calendar','integration'],
    content: `
      <p>Connect your Google Calendar to keep bookings in sync.</p>
      <ol>
        <li>Go to Settings &gt; Calendar.</li>
        <li>Click "Connect" and sign in with Google.</li>
        <li>Allow permissions and pick the calendar to sync.</li>
      </ol>
    `,
    related: ['provider-onboarding']
  },
  {
    slug: 'privacy-radius',
    title: 'Privacy & Radius',
    category: 'Privacy',
    tags: ['privacy','location'],
    content: `
      <p>We show only an approximate location until a booking is confirmed. Radius settings let providers control how far details are shared.</p>
    `,
    related: ['support-options']
  },
  {
    slug: 'support-options',
    title: 'Support Options',
    category: 'Support',
    tags: ['support','contact'],
    content: `
      <p>Need help? Visit the help center, start a chat, or email support@bookiji.com.</p>
    `,
    related: ['how-booking-works']
  },
  {
    slug: 'languages-currency',
    title: 'Languages & Currency',
    category: 'Platform',
    tags: ['languages','currency'],
    content: `
      <p>Bookiji supports multiple languages and currencies. Change your preferences in Settings to localize your experience.</p>
    `,
    related: ['support-options']
  }
];

export function searchArticles(query: string, category?: string): HelpArticle[] {
  const q = query.trim().toLowerCase();
  return helpArticles.filter((article) => {
    if (category && article.category !== category) return false;
    if (!q) return true;
    const target = (article.title + ' ' + article.content + ' ' + article.tags.join(' ')).toLowerCase();
    return q.split(/\s+/).every(part => fuzzyMatch(target, part));
  });
}

function fuzzyMatch(text: string, pattern: string) {
  if (text.includes(pattern)) return true;
  let tIndex = 0;
  for (const char of pattern) {
    tIndex = text.indexOf(char, tIndex);
    if (tIndex === -1) return false;
    tIndex++;
  }
  return true;
}
