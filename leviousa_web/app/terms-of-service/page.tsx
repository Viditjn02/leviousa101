'use client'

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service - Leviousa</h1>
                
                <div className="prose max-w-none text-gray-700">
                    <p className="text-lg text-gray-600 mb-6">
                        Last updated: {new Date().toLocaleDateString()}
                    </p>

                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
                    <p className="mb-4">
                        By accessing and using Leviousa (the "Service"), you accept and agree to be bound by the terms 
                        and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                    </p>

                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Service Description</h2>
                    <p className="mb-4">
                        Leviousa is a commercial AI-powered meeting assistant that provides:
                    </p>
                    <ul className="list-disc pl-6 mb-4 space-y-2">
                        <li>Real-time meeting transcription and insights</li>
                        <li>Integration with Google Workspace services (Drive, Gmail, Calendar, Docs, Sheets, Tasks)</li>
                        <li>Automated meeting summaries and follow-ups</li>
                        <li>AI-powered task extraction and management</li>
                        <li>Meeting analytics and productivity insights</li>
                    </ul>

                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. User Responsibilities</h2>
                    
                    <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">Account Security</h3>
                    <ul className="list-disc pl-6 mb-4 space-y-1">
                        <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                        <li>You must notify us immediately of any unauthorized use of your account</li>
                        <li>You are responsible for all activities that occur under your account</li>
                    </ul>

                    <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">Acceptable Use</h3>
                    <p className="mb-2">You agree not to use the Service to:</p>
                    <ul className="list-disc pl-6 mb-4 space-y-1">
                        <li>Violate any applicable laws or regulations</li>
                        <li>Infringe on intellectual property rights of others</li>
                        <li>Upload or transmit malicious code or harmful content</li>
                        <li>Attempt to gain unauthorized access to our systems</li>
                        <li>Use the service for any illegal or harmful purposes</li>
                    </ul>

                    <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">Meeting Consent</h3>
                    <p className="mb-4">
                        You are responsible for obtaining proper consent from meeting participants before recording 
                        or transcribing meetings. This includes complying with local laws regarding recording consent.
                    </p>

                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Google Workspace Integration</h2>
                    
                    <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">OAuth Authorization</h3>
                    <p className="mb-4">
                        By connecting your Google account, you authorize Leviousa to access the specified Google 
                        services on your behalf. This authorization can be revoked at any time through your Google Account settings.
                    </p>

                    <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">Data Usage</h3>
                    <p className="mb-4">
                        We will only access and use your Google Workspace data for the purposes explicitly described 
                        in our Privacy Policy and as necessary to provide the Service.
                    </p>

                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Intellectual Property</h2>
                    
                    <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">Our Rights</h3>
                    <p className="mb-4">
                        The Service, including its software, design, content, and trademarks, is owned by Leviousa 
                        and is protected by copyright, trademark, and other intellectual property laws.
                    </p>

                    <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">Your Rights</h3>
                    <p className="mb-4">
                        You retain all rights to your original content, including meeting recordings, transcripts, 
                        and documents. By using the Service, you grant us a limited license to process this content 
                        solely to provide the Service.
                    </p>

                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Privacy and Data Protection</h2>
                    <p className="mb-4">
                        Your privacy is important to us. Our collection, use, and protection of your data is governed 
                        by our{' '}
                        <a href="/privacy-policy" className="text-blue-600 underline hover:text-blue-800">
                            Privacy Policy
                        </a>, which is incorporated into these Terms by reference.
                    </p>

                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Service Availability</h2>
                    <p className="mb-4">
                        We strive to maintain high service availability, but we do not guarantee uninterrupted service. 
                        We may need to perform maintenance, updates, or modifications that could temporarily affect service availability.
                    </p>

                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. Limitation of Liability</h2>
                    <p className="mb-4">
                        To the maximum extent permitted by law, Leviousa shall not be liable for any indirect, incidental, 
                        special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred 
                        directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
                    </p>

                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. Indemnification</h2>
                    <p className="mb-4">
                        You agree to defend, indemnify, and hold harmless Leviousa from any claims, damages, obligations, 
                        losses, liabilities, costs, or debt arising from your use of the Service or violation of these Terms.
                    </p>

                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">10. Termination</h2>
                    
                    <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">By You</h3>
                    <p className="mb-4">
                        You may terminate your use of the Service at any time by discontinuing use and revoking 
                        OAuth permissions through your Google Account settings.
                    </p>

                    <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">By Us</h3>
                    <p className="mb-4">
                        We may terminate or suspend your access to the Service immediately, without prior notice, 
                        for any violation of these Terms or for any other conduct that we deem harmful to the Service or other users.
                    </p>

                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">11. Changes to Terms</h2>
                    <p className="mb-4">
                        We reserve the right to modify these Terms at any time. We will notify you of material changes 
                        through the Service or via email. Your continued use of the Service after changes constitutes 
                        acceptance of the new Terms.
                    </p>

                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">12. Governing Law</h2>
                    <p className="mb-4">
                        These Terms are governed by and construed in accordance with the laws of the jurisdiction 
                        where Leviousa is based, without regard to its conflict of law principles.
                    </p>

                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">13. Contact Information</h2>
                    <p className="mb-4">
                        If you have any questions about these Terms, please contact us:
                    </p>
                    <ul className="list-disc pl-6 mb-4 space-y-1">
                        <li><strong>Email:</strong> viditjn02@gmail.com</li>
                        <li><strong>Subject:</strong> Terms of Service Inquiry - Leviousa</li>
                    </ul>

                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">14. Severability</h2>
                    <p className="mb-4">
                        If any provision of these Terms is found to be unenforceable or invalid, that provision 
                        will be limited or eliminated to the minimum extent necessary so that these Terms will 
                        otherwise remain in full force and effect.
                    </p>

                    <div className="mt-8 p-6 bg-green-50 rounded-lg border border-green-200">
                        <h3 className="text-lg font-semibold text-green-900 mb-2">Agreement</h3>
                        <p className="text-green-800">
                            By using Leviousa, you acknowledge that you have read, understood, and agree to be bound 
                            by these Terms of Service and our Privacy Policy.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
