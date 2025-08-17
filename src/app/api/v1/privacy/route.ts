import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const FALLBACK_POLICY = `
# Privacy Policy

We respect your privacy. This policy explains how Bookiji collects, uses,
and safeguards your information.

- **Data we collect**: name, email, booking details.
- **Use**: to provide and improve service, customer support.
- **Sharing**: never sold; shared only with providers for core functionality.
- **Retention**: tickets and conversations retained for 12 months then anonymized.
- **Your rights**: you may request data deletion or export at any time.

Contact us at support@yourdomain.com.
`;

export async function GET() {
	try {
		const filePath = path.join(process.cwd(), 'docs', 'PRIVACY_POLICY.md');
		const markdown = await readFile(filePath, 'utf8');
		return NextResponse.json({ policy: markdown });
	} catch {
		return NextResponse.json({ policy: FALLBACK_POLICY, source: 'fallback' });
	}
}
