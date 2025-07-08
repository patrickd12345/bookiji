import { readFileSync } from 'fs'
import { join } from 'path'

export default function CompliancePage() {
  // Read the audit markdown file
  const auditPath = join(process.cwd(), 'ADSENSE_COMPLIANCE_AUDIT.md')
  const auditContent = readFileSync(auditPath, 'utf-8')

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="prose prose-lg max-w-none">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              Google AdSense Compliance Audit
            </h1>
            
            {/* Convert markdown to HTML */}
            <div 
              className="markdown-content"
              dangerouslySetInnerHTML={{ 
                __html: auditContent
                  .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
                  .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
                  .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
                  .replace(/^#### (.*$)/gim, '<h4 class="text-base font-medium mt-3 mb-2">$1</h4>')
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
                  .replace(/```markdown\n([\s\S]*?)\n```/g, '<pre class="bg-gray-100 p-4 rounded-lg overflow-x-auto"><code>$1</code></pre>')
                  .replace(/- (.*$)/gim, '<li class="ml-4">$1</li>')
                  .replace(/✅ (.*$)/gim, '<li class="ml-4 text-green-600">✅ $1</li>')
                  .replace(/❌ (.*$)/gim, '<li class="ml-4 text-red-600">❌ $1</li>')
                  .replace(/\n\n/g, '</p><p>')
                  .replace(/^(.+)$/gm, '<p>$1</p>')
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 