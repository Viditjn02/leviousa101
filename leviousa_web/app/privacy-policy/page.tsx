'use client'

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy - Leviousa</h1>
                
                <div className="prose max-w-none text-gray-700">
                    <p className="text-lg text-gray-600 mb-6">
                        Last updated: {new Date().toLocaleDateString()}
                    </p>

                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
                    
                    <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">Google Workspace Data</h3>
                    <p className="mb-4">
                        When you connect your Google account, Leviousa accesses the following data to provide meeting assistant services:
                    </p>
                    <ul className="list-disc pl-6 mb-4 space-y-2">
                        <li><strong>Google Drive:</strong> Meeting documents, transcripts, and files you choose to save or access</li>
                        <li><strong>Gmail:</strong> Meeting-related emails, invitations, and automated summaries we send on your behalf</li>
                        <li><strong>Google Calendar:</strong> Meeting schedules, event details, and calendar entries we create or modify</li>
                        <li><strong>Google Docs:</strong> Meeting notes, transcripts, and documents we create or access</li>
                        <li><strong>Google Sheets:</strong> Meeting analytics, task tracking, and data you choose to store</li>
                        <li><strong>Google Tasks:</strong> Action items and follow-up tasks we create from meeting outcomes</li>
                        <li><strong>Profile Information:</strong> Your name and email address for identification and communication</li>
                    </ul>

                    <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">Meeting Data</h3>
                    <p className="mb-2">
                        We process meeting audio and transcriptions to provide AI-powered insights, but this data is:
                    </p>
                    <ul className="list-disc pl-6 mb-4 space-y-1">
                        <li>Processed locally when possible</li>
                        <li>Encrypted in transit and at rest</li>
                        <li>Only stored as long as necessary for service provision</li>
                        <li>Never shared with unauthorized third parties</li>
                    </ul>

                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. How We Use Your Information</h2>
                    
                    <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">Primary Uses</h3>
                    <ul className="list-disc pl-6 mb-4 space-y-2">
                        <li><strong>Meeting Assistance:</strong> Transcribe meetings, generate summaries, and extract action items</li>
                        <li><strong>Workflow Integration:</strong> Save meeting notes to your Google Drive and create calendar events</li>
                        <li><strong>Communication:</strong> Send meeting summaries and follow-ups via your Gmail account</li>
                        <li><strong>Task Management:</strong> Convert action items into Google Tasks for accountability</li>
                        <li><strong>Analytics:</strong> Provide meeting insights and productivity metrics in Google Sheets</li>
                        <li><strong>Personalization:</strong> Adapt to your meeting patterns and preferences over time</li>
                    </ul>

                    <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">Data Processing</h3>
                    <p className="mb-4">
                        All data processing is done for legitimate business purposes to provide the services you've requested. 
                        We use AI and machine learning to improve transcription accuracy and meeting insights.
                    </p>

                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. Data Sharing and Disclosure</h2>
                    
                    <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">No Unauthorized Sharing</h3>
                    <p className="mb-4">
                        We do not sell, trade, rent, or otherwise transfer your personal information or Google Workspace 
                        data to third parties without your explicit consent, except as described below:
                    </p>
                    
                    <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">Service Providers</h3>
                    <ul className="list-disc pl-6 mb-4 space-y-2">
                        <li><strong>AI Services:</strong> Meeting transcriptions may be processed by secure AI services (OpenAI, Anthropic, Deepgram) with appropriate data protection agreements</li>
                        <li><strong>Cloud Infrastructure:</strong> Data may be stored on secure cloud platforms (Google Cloud, Firebase) with enterprise-grade security</li>
                        <li><strong>Authentication:</strong> OAuth tokens are securely managed through Google's authentication systems</li>
                    </ul>

                    <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">Legal Requirements</h3>
                    <p className="mb-4">
                        We may disclose information if required by law, regulation, or legal process, but we will 
                        notify you unless prohibited by law.
                    </p>

                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Data Security</h2>
                    
                    <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">Security Measures</h3>
                    <ul className="list-disc pl-6 mb-4 space-y-2">
                        <li><strong>Encryption:</strong> All data is encrypted in transit using TLS/SSL and at rest using AES-256</li>
                        <li><strong>Access Control:</strong> Strict access controls and authentication requirements for all systems</li>
                        <li><strong>Monitoring:</strong> Continuous security monitoring and regular security audits</li>
                        <li><strong>Compliance:</strong> Adherence to industry standard security practices and Google's API terms</li>
                    </ul>

                    <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">OAuth Security</h3>
                    <p className="mb-4">
                        We implement OAuth 2.0 with PKCE (Proof Key for Code Exchange) for secure authentication 
                        with your Google account. Your Google credentials are never stored on our servers.
                    </p>

                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Your Rights and Controls</h2>
                    
                    <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">Access and Control</h3>
                    <ul className="list-disc pl-6 mb-4 space-y-2">
                        <li><strong>Revoke Access:</strong> You can revoke Leviousa's access to your Google account at any time through Google Account settings</li>
                        <li><strong>Data Export:</strong> Request copies of your data processed by our service</li>
                        <li><strong>Data Deletion:</strong> Request deletion of your data from our systems</li>
                        <li><strong>Service Control:</strong> Enable/disable individual integrations and features</li>
                    </ul>

                    <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">Google Account Permissions</h3>
                    <p className="mb-2">
                        You maintain full control over your Google account permissions. You can:
                    </p>
                    <ul className="list-disc pl-6 mb-4 space-y-1">
                        <li>View what data Leviousa has accessed in your Google Account settings</li>
                        <li>Revoke specific permissions or all access at any time</li>
                        <li>Monitor application activity through Google's security dashboard</li>
                    </ul>

                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Data Retention</h2>
                    
                    <p className="mb-2">
                        We retain your data only as long as necessary to provide our services or as required by law:
                    </p>
                    <ul className="list-disc pl-6 mb-4 space-y-1">
                        <li><strong>Meeting Transcripts:</strong> Retained according to your preferences, with options for automatic deletion</li>
                        <li><strong>OAuth Tokens:</strong> Stored securely until you revoke access</li>
                        <li><strong>Usage Analytics:</strong> Anonymized analytics may be retained for service improvement</li>
                        <li><strong>Account Data:</strong> Deleted within 30 days of account termination</li>
                    </ul>

                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Contact Information</h2>
                    
                    <p className="mb-2">
                        If you have questions about this Privacy Policy or our privacy practices, please contact us:
                    </p>
                    <ul className="list-disc pl-6 mb-4 space-y-1">
                        <li><strong>Email:</strong> viditjn02@gmail.com</li>
                        <li><strong>Subject:</strong> Privacy Policy Inquiry - Leviousa</li>
                        <li><strong>Response Time:</strong> We aim to respond within 48 hours</li>
                    </ul>

                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. Google API Services Compliance</h2>
                    
                    <p className="mb-4">
                        Leviousa's use of information received from Google APIs will adhere to the{' '}
                        <a href="https://developers.google.com/terms/api-services-user-data-policy" 
                           className="text-blue-600 underline hover:text-blue-800"
                           target="_blank" 
                           rel="noopener noreferrer">
                            Google API Services User Data Policy
                        </a>, including the Limited Use requirements.
                    </p>

                    <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="text-lg font-semibold text-blue-900 mb-2">Questions or Concerns?</h3>
                        <p className="text-blue-800">
                            If you have any questions about how we handle your data or want to exercise your privacy rights, 
                            please don't hesitate to contact us. We're committed to transparency and protecting your privacy.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
