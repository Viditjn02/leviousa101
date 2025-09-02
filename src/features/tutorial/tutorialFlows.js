// Video tutorial configuration for the desktop Leviousa app

// Welcome video tutorial for first-time users
export const welcomeVideoTutorial = {
    id: 'welcome-video',
    name: 'Welcome to Leviousa',
    description: 'Watch the welcome video to get started',
    priority: 1,
    type: 'video',
    triggers: {
        onFirstTime: true,
        onAppStart: true,
        onManual: true, // Can be triggered via Cmd+T
    },
    videoPath: './src/ui/assets/welcome-video.mp4', // Bundled with app
    autoPlay: true,
};

// Export video tutorial configurations
export const allVideoTutorials = [
    welcomeVideoTutorial,
];

// Helper function to get video tutorial by ID
export function getVideoTutorialById(id) {
    return allVideoTutorials.find(tutorial => tutorial.id === id);
}

// Helper function to get the main welcome video
export function getWelcomeVideo() {
    return welcomeVideoTutorial;
}
