export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      countdownActive: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    // COUNTDOWN IS NOW ACTIVE - ENABLE IMMEDIATELY
    const countdownActive = true; // Force active for launch
    
    return res.status(200).json({
      countdownActive: countdownActive,
      countdownCompleted: !countdownActive,
      message: countdownActive ? 'Countdown is active' : 'Countdown completed'
    });
    
  } catch (error) {
    console.error('❌ Failed to check countdown status:', error);
    
    // Default to landing page if there's an error
    return res.status(200).json({
      countdownActive: false,
      message: 'Error checking status, defaulting to landing page'
    });
  }
}
