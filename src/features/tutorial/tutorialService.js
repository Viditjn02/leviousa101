// Tutorial service for managing video tutorial display in the desktop app

class TutorialService {
    constructor() {
        this.isVideoShown = false;
        this.completedVideos = new Set();
        this.skippedVideos = new Set();
        
        // Load persisted data
        this.loadProgress();
        
        console.log('[TutorialService] ✅ Video tutorial service initialized');
    }

    // Show tutorial video (triggered by Cmd+T or first-time user)
    showTutorialVideo() {
        console.log('[TutorialService] 🎬 Showing welcome video tutorial');
        
        try {
            // Use window manager to show tutorial window
            if (window.api?.tutorial?.showTutorialWindow) {
                window.api.tutorial.showTutorialWindow();
                this.isVideoShown = true;
                console.log('[TutorialService] ✅ Tutorial video window opened');
                return true;
            } else {
                console.warn('[TutorialService] ⚠️ No tutorial window API available');
                return false;
            }
        } catch (error) {
            console.error('[TutorialService] ❌ Failed to show tutorial video:', error);
            return false;
        }
    }

    // Check if this is a first-time user
    isFirstTimeUser() {
        return this.completedVideos.size === 0 && this.skippedVideos.size === 0;
    }

    // Mark video as completed
    markVideoCompleted() {
        console.log('[TutorialService] ✅ Video tutorial completed');
        this.completedVideos.add('welcome-video');
        this.isVideoShown = false;
        this.saveProgress();
    }

    // Mark video as skipped
    markVideoSkipped() {
        console.log('[TutorialService] ⏭️ Video tutorial skipped');
        this.skippedVideos.add('welcome-video');
        this.isVideoShown = false;
        this.saveProgress();
    }

    // Auto-trigger video for first-time users
    checkAutoTriggers() {
        if (this.isVideoShown) return; // Don't show if already showing

        if (this.isFirstTimeUser()) {
            console.log('[TutorialService] 🎯 First-time user detected, showing welcome video');
            this.showTutorialVideo();
        }
    }

    // Persistence methods
    loadProgress() {
        console.log('[TutorialService] 📥 Loading video tutorial progress from localStorage...');
        try {
            const stored = localStorage.getItem('leviousa-video-tutorial-progress');
            
            if (stored) {
                const data = JSON.parse(stored);
                this.completedVideos = new Set(data.completedVideos || []);
                this.skippedVideos = new Set(data.skippedVideos || []);
                
                console.log('[TutorialService] ✅ Loaded video progress:');
                console.log('  - Completed videos:', Array.from(this.completedVideos));
                console.log('  - Skipped videos:', Array.from(this.skippedVideos));
            } else {
                console.log('[TutorialService] 📭 No stored video progress found, using defaults');
            }
        } catch (error) {
            console.warn('[TutorialService] ❌ Failed to load video progress:', error);
        }
    }

    saveProgress() {
        try {
            const data = {
                version: '2.0',
                completedVideos: Array.from(this.completedVideos),
                skippedVideos: Array.from(this.skippedVideos),
            };
            localStorage.setItem('leviousa-video-tutorial-progress', JSON.stringify(data));
            console.log('[TutorialService] 💾 Video progress saved');
        } catch (error) {
            console.warn('[TutorialService] ❌ Failed to save video progress:', error);
        }
    }

    // Reset all progress
    resetProgress() {
        console.log('[TutorialService] 🔄 Resetting video tutorial progress...');
        
        this.completedVideos.clear();
        this.skippedVideos.clear();
        this.isVideoShown = false;
        this.saveProgress();
        
        console.log('[TutorialService] ✅ Video progress reset complete');
    }

    // Debug method to check current state
    debugState() {
        console.log('[TutorialService] 🔍 VIDEO TUTORIAL STATE DEBUG:');
        console.log('  - isVideoShown:', this.isVideoShown);
        console.log('  - isFirstTimeUser:', this.isFirstTimeUser());
        console.log('  - Completed videos:', Array.from(this.completedVideos));
        console.log('  - Skipped videos:', Array.from(this.skippedVideos));
    }
}

// Create singleton instance
console.log('[TutorialService] 🚀 Creating video tutorial service singleton...');
const tutorialService = new TutorialService();

// Make tutorialService available globally for easy access
if (typeof window !== 'undefined') {
    window.tutorialService = tutorialService;
    
    // Add debug helpers to window for easy console access
    window.debugVideoTutorial = () => tutorialService.debugState();
    window.resetVideoTutorial = () => {
        tutorialService.resetProgress();
        alert('Video tutorial progress reset');
    };
    window.showVideoTutorial = () => {
        tutorialService.showTutorialVideo();
    };
    
    console.log('[TutorialService] ✅ Video tutorial service attached to window.tutorialService');
    console.log('[TutorialService] 🛠️ Debug helpers available: window.debugVideoTutorial(), window.resetVideoTutorial(), window.showVideoTutorial()');
} else {
    console.warn('[TutorialService] ⚠️ Window object not available, tutorial service not global');
}

// Export the class and singleton instance
export { TutorialService, tutorialService };
