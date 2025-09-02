import { NextApiRequest, NextApiResponse } from 'next';
import { sendConfirmationEmail } from '../../utils/emailService';

interface TestEmailResponse {
  success: boolean;
  message: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestEmailResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { email, name } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and name are required' 
      });
    }

    console.log('🧪 Testing Resend API integration...');
    
    const result = await sendConfirmationEmail(email, name);
    
    if (result.success) {
      console.log('✅ Resend test email sent successfully');
      return res.status(200).json({
        success: true,
        message: `Test email sent successfully to ${email}`
      });
    } else {
      console.error('❌ Resend test email failed:', result.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: result.error
      });
    }
    
  } catch (error: any) {
    console.error('❌ Test email API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
