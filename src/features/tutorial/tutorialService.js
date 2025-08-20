// Tutorial service for managing onboarding flows in the desktop app

class TutorialService {
    constructor() {
        this.isActive = false;
        this.currentFlow = null;
        this.currentStepIndex = 0;
        this.completedFlows = new Set();
        this.skippedFlows = new Set();
        this.dismissedHints = new Set();
        this.showHints = true;
        this.tutorialFlows = new Map();
        
        // Load persisted data
        this.loadProgress();
        
        // Initialize tutorial overlay and manager
        this.overlay = null;
        this.manager = null;
        this.initializeOverlay();
        this.initializeManager();
        
        console.log('[TutorialService] ✅ Initialized successfully');
    }

    initializeOverlay() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createOverlay());
        } else {
            this.createOverlay();
        }
    }

    createOverlay() {
        console.log('[TutorialService] 🎯 Creating tutorial overlay...');
        
        // Check if tutorial-overlay custom element is already defined
        if (customElements.get('tutorial-overlay')) {
            console.log('[TutorialService] ✅ tutorial-overlay already defined, creating element...');
            this.createOverlayElement();
        } else {
            console.log('[TutorialService] 📦 Importing TutorialOverlay component...');
            // Import the TutorialOverlay component
            import('../ui/components/TutorialOverlay.js').then(() => {
                console.log('[TutorialService] ✅ TutorialOverlay imported successfully');
                this.createOverlayElement();
            }).catch(error => {
                console.error('[TutorialService] ❌ Failed to load overlay:', error);
            });
        }
    }
    
    createOverlayElement() {
        console.log('[TutorialService] 🔧 Creating tutorial overlay element...');
        console.log('[TutorialService] 🔍 Current window location:', window.location.href);
        
        // Only create overlay in the main header window, not in child windows like settings
        const isHeaderWindow = !window.location.search.includes('view=');
        console.log('[TutorialService] 🔍 Is header window (main):', isHeaderWindow);
        
        if (!isHeaderWindow) {
            console.log('[TutorialService] ⚠️ Not creating overlay in child window, will use main window overlay');
            return;
        }
        
        // Remove any existing overlay
        const existingOverlay = document.querySelector('tutorial-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
            console.log('[TutorialService] 🗑️ Removed existing overlay');
        }
        
        this.overlay = document.createElement('tutorial-overlay');
        
        // Attach to the tutorial container in header window for screen-level overlay
        const container = document.getElementById('tutorial-overlay-container');
        if (container) {
            container.appendChild(this.overlay);
            console.log('[TutorialService] ✅ Overlay attached to tutorial container in header window');
        } else {
            // Fallback to body
            document.body.appendChild(this.overlay);
            console.log('[TutorialService] ⚠️ Tutorial container not found, attached to body');
        }
        
        // Position as screen-level overlay
        this.overlay.style.position = 'fixed';
        this.overlay.style.top = '0';
        this.overlay.style.left = '0';
        this.overlay.style.right = '0';
        this.overlay.style.bottom = '0';
        this.overlay.style.width = '100vw';
        this.overlay.style.height = '100vh';
        this.overlay.style.zIndex = '99999'; // Above all windows
        
        // Listen for tutorial events
        this.overlay.addEventListener('tutorial-next', () => this.nextStep());
        this.overlay.addEventListener('tutorial-previous', () => this.previousStep());
        this.overlay.addEventListener('tutorial-skip', () => this.skipTutorial());
        
        console.log('[TutorialService] ✅ Screen-level overlay created in header window');
    }

    initializeManager() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createManager());
        } else {
            this.createManager();
        }
    }

    createManager() {
        console.log('[TutorialService] 🔧 Creating tutorial manager...');
        
        // Check if tutorial-manager custom element is already defined
        if (customElements.get('tutorial-manager')) {
            console.log('[TutorialService] ✅ tutorial-manager already defined, creating element...');
            this.createManagerElement();
        } else {
            console.log('[TutorialService] 📦 Importing TutorialManager component...');
            import('../ui/components/TutorialManager.js').then(() => {
                console.log('[TutorialService] ✅ TutorialManager imported successfully');
                this.createManagerElement();
            }).catch(error => {
                console.error('[TutorialService] ❌ Failed to load manager:', error);
            });
        }
    }

    createManagerElement() {
        console.log('[TutorialService] 🔧 Creating tutorial manager element...');
        
        // Remove any existing manager
        const existingManager = document.querySelector('tutorial-manager');
        if (existingManager) {
            existingManager.remove();
            console.log('[TutorialService] 🗑️ Removed existing manager');
        }
        
        this.manager = document.createElement('tutorial-manager');
        
        // Attach directly to body as independent floating element
        document.body.appendChild(this.manager);
        
        console.log('[TutorialService] ✅ Manager created and attached to document body');
    }

    // Register a tutorial flow
    registerFlow(flow) {
        this.tutorialFlows.set(flow.id, flow);
        console.log(`[TutorialService] Registered flow: ${flow.name}`);
    }

    // Start a tutorial
    startTutorial(flowId) {
        console.log(`[TutorialService] 🎯 Attempting to start tutorial: ${flowId}`);
        console.log(`[TutorialService] 🔍 Available flows:`, Array.from(this.tutorialFlows.keys()));
        
        const flow = this.tutorialFlows.get(flowId);
        if (!flow) {
            console.warn(`[TutorialService] ❌ Flow ${flowId} not found`);
            console.log(`[TutorialService] 🔍 Registered flows:`, Array.from(this.tutorialFlows.entries()).map(([id, f]) => `${id}: ${f.name}`));
            return false;
        }

        if (this.completedFlows.has(flowId)) {
            console.log(`[TutorialService] 🔄 Flow ${flowId} already completed, restarting`);
        }

        console.log(`[TutorialService] 🎬 Setting up tutorial state...`);
        this.isActive = true;
        this.currentFlow = flow;
        this.currentStepIndex = 0;
        
        console.log(`[TutorialService] 🔍 Overlay available:`, !!this.overlay);
        this.updateOverlay();
        
        console.log(`[TutorialService] ✅ Started tutorial: ${flow.name}`);
        return true;
    }

    // Stop current tutorial
    stopTutorial() {
        console.log('[TutorialService] 🛑 Stopping tutorial...');
        
        this.isActive = false;
        this.currentFlow = null;
        this.currentStepIndex = 0;
        
        // Restore normal settings behavior
        this.preventSettingsHide(false);
        
        this.updateOverlay();
        
        console.log('[TutorialService] ✅ Tutorial stopped and settings behavior restored');
    }

    // Move to next step
    nextStep() {
        if (!this.currentFlow || !this.isActive) return;

        console.log('[TutorialService] ➡️ Moving to next step...');

        if (this.currentStepIndex < this.currentFlow.steps.length - 1) {
            this.currentStepIndex++;
            
            // Execute the action for the new step (like switching views)
            const newStep = this.getCurrentStep();
            if (newStep?.action) {
                console.log('[TutorialService] 🎬 Executing action for step:', newStep.title);
                newStep.action();
                
                // Wait for view change before updating overlay
                setTimeout(() => {
                    this.updateOverlay();
                }, 800);
            } else {
                this.updateOverlay();
            }
        } else {
            // Tutorial completed
            this.completeTutorial();
        }
    }

    // Move to previous step
    previousStep() {
        if (!this.currentFlow || !this.isActive) return;

        if (this.currentStepIndex > 0) {
            this.currentStepIndex--;
            this.updateOverlay();
        }
    }

    // Skip current tutorial
    skipTutorial() {
        if (!this.currentFlow) return;

        console.log(`[TutorialService] ⏭️ Skipping tutorial: ${this.currentFlow.name}`);
        this.skippedFlows.add(this.currentFlow.id);
        this.stopTutorial(); // This will restore settings behavior
        this.saveProgress();
    }

    // Complete current tutorial
    completeTutorial() {
        if (!this.currentFlow) return;

        console.log(`[TutorialService] 🎉 Completing tutorial: ${this.currentFlow.name}`);
        this.completedFlows.add(this.currentFlow.id);
        this.stopTutorial(); // This will restore settings behavior
        this.saveProgress();
        
        // Show completion message
        this.showCompletionMessage();
    }

    // Update overlay component
    updateOverlay() {
        console.log(`[TutorialService] 🔄 updateOverlay called - overlay:`, !!this.overlay, 'isActive:', this.isActive);
        
        if (!this.overlay) {
            console.warn('[TutorialService] ⚠️ No overlay available for update');
            return;
        }

        const currentStep = this.getCurrentStep();
        console.log(`[TutorialService] 🔍 Current step:`, currentStep?.title || 'none');

        // Handle settings window interaction during tutorials
        if (this.isActive && this.isSettingsRelatedTutorial()) {
            console.log('[TutorialService] 🔧 Settings-related tutorial active, preventing settings window auto-hide');
            this.preventSettingsHide(true);
        } else if (!this.isActive) {
            console.log('[TutorialService] 🔄 Tutorial inactive, restoring normal settings behavior');
            this.preventSettingsHide(false);
        }

        this.overlay.isActive = this.isActive;
        this.overlay.currentStep = currentStep;
        this.overlay.totalSteps = this.currentFlow ? this.currentFlow.steps.length : 0;
        this.overlay.currentStepIndex = this.currentStepIndex;
        this.overlay.tutorialName = this.currentFlow ? this.currentFlow.name : '';
        this.overlay.classList.toggle('active', this.isActive);
        
        // Enable/disable display based on active state
        // Note: pointer-events are handled by CSS - backdrop allows pass-through, tooltip captures events
        this.overlay.style.display = this.isActive ? 'block' : 'none';
        
        console.log(`[TutorialService] ✅ Overlay updated - active:`, this.isActive, 'step:', this.currentStepIndex + 1, 'of', this.overlay.totalSteps);
    }

    // Get current step
    getCurrentStep() {
        if (!this.currentFlow || !this.isActive) return null;
        return this.currentFlow.steps[this.currentStepIndex] || null;
    }

    // Switch to a different view during tutorial (cross-window communication)
    switchToView(viewName) {
        console.log(`[TutorialService] 🔄 Switching to view: ${viewName}`);
        
        try {
            // Use Electron IPC to show the appropriate window
            if (window.api && window.api.tutorial && window.api.tutorial.showWindow) {
                console.log(`[TutorialService] 📞 Using IPC to show ${viewName} window`);
                window.api.tutorial.showWindow(viewName);
                
                // Small delay to allow window to show before continuing tutorial
                setTimeout(() => {
                    console.log(`[TutorialService] 🎯 Window switched, updating tutorial positions`);
                    this.updateOverlay();
                }, 800);
            } else {
                console.log(`[TutorialService] ⚠️ IPC not available, trying direct approach...`);
                
                // Fallback: try to find and update app component (for single-window mode)
                const app = document.querySelector('leviousa-app');
                if (app) {
                    console.log(`[TutorialService] ✅ Found app, switching to ${viewName} view`);
                    app.currentView = viewName;
                    app.requestUpdate();
                    
                    setTimeout(() => {
                        this.updateOverlay();
                    }, 500);
                } else {
                    console.error('[TutorialService] ❌ Could not switch view - no communication method available');
                }
            }
        } catch (error) {
            console.error('[TutorialService] ❌ Failed to switch view:', error);
        }
    }

    // Check if flow is completed
    isFlowCompleted(flowId) {
        return this.completedFlows.has(flowId);
    }

    // Get completion statistics
    getCompletionRate() {
        const totalFlows = this.tutorialFlows.size;
        const completedCount = this.completedFlows.size;
        
        console.log('[TutorialService] 📊 Progress calculation:');
        console.log('  - Total flows:', totalFlows);
        console.log('  - Completed flows:', completedCount);
        console.log('  - Completed flow IDs:', Array.from(this.completedFlows));
        console.log('  - Registered flow IDs:', Array.from(this.tutorialFlows.keys()));
        
        if (totalFlows === 0) return 0;
        const rate = (completedCount / totalFlows) * 100;
        console.log('  - Calculated rate:', rate);
        return rate;
    }

    // Auto-trigger tutorials based on conditions
    checkAutoTriggers() {
        if (this.isActive) return; // Don't interrupt active tutorials

        for (const [flowId, flow] of this.tutorialFlows) {
            if (this.shouldAutoTrigger(flow)) {
                this.startTutorial(flowId);
                break; // Only start one tutorial at a time
            }
        }
    }

    shouldAutoTrigger(flow) {
        if (this.completedFlows.has(flow.id) || this.skippedFlows.has(flow.id)) {
            return false;
        }

        // Check if this is first time user and flow should auto-trigger
        if (flow.triggers?.onFirstTime && this.completedFlows.size === 0) {
            console.log(`[TutorialService] 🎯 First-time user detected, should trigger ${flow.id}`);
            return true;
        }

        // Check if flow should trigger on app start
        if (flow.triggers?.onAppStart && this.completedFlows.size === 0) {
            console.log(`[TutorialService] 🚀 App start trigger for ${flow.id}`);
            return true;
        }

        // Check if current view matches trigger
        if (flow.triggers?.onView) {
            const currentView = this.getCurrentView();
            return flow.triggers.onView === currentView;
        }

        return false;
    }

    getCurrentView() {
        // Get current view from LeviousaApp
        const app = document.querySelector('leviousa-app');
        return app ? app.currentView : null;
    }

    // Show completion message
    showCompletionMessage() {
        // You could implement a toast notification here
        console.log('[TutorialService] 🎉 Tutorial completed!');
        
        // Optionally show a completion overlay
        setTimeout(() => {
            if (window.api && window.api.common && window.api.common.showNotification) {
                window.api.common.showNotification('Tutorial completed! 🎉', 'You\'re ready to use Leviousa effectively.');
            }
        }, 500);
    }

    // Persistence methods
    loadProgress() {
        console.log('[TutorialService] 📥 Loading progress from localStorage...');
        try {
            const stored = localStorage.getItem('leviousa-tutorial-progress');
            console.log('[TutorialService] 🔍 Raw localStorage data:', stored);
            
            if (stored) {
                const data = JSON.parse(stored);
                console.log('[TutorialService] 🔍 Parsed localStorage data:', data);
                
                this.completedFlows = new Set(data.completedFlows || []);
                this.skippedFlows = new Set(data.skippedFlows || []);
                this.dismissedHints = new Set(data.dismissedHints || []);
                this.showHints = data.showHints !== false;
                
                console.log('[TutorialService] ✅ Loaded progress:');
                console.log('  - Completed flows:', Array.from(this.completedFlows));
                console.log('  - Skipped flows:', Array.from(this.skippedFlows));
                console.log('  - Show hints:', this.showHints);
            } else {
                console.log('[TutorialService] 📭 No stored progress found, using defaults');
            }
        } catch (error) {
            console.warn('[TutorialService] ❌ Failed to load progress:', error);
        }
    }

    saveProgress() {
        try {
            const data = {
                version: '1.0',
                completedFlows: Array.from(this.completedFlows),
                skippedFlows: Array.from(this.skippedFlows),
                dismissedHints: Array.from(this.dismissedHints),
                showHints: this.showHints,
            };
            localStorage.setItem('leviousa-tutorial-progress', JSON.stringify(data));
        } catch (error) {
            console.warn('[TutorialService] Failed to save progress:', error);
        }
    }

    // Reset all progress
    resetProgress() {
        console.log('[TutorialService] 🔄 Resetting all tutorial progress...');
        console.log('[TutorialService] 🔍 Before reset - completed:', Array.from(this.completedFlows));
        
        this.completedFlows.clear();
        this.skippedFlows.clear();
        this.dismissedHints.clear();
        this.showHints = true;
        this.saveProgress();
        
        console.log('[TutorialService] ✅ Progress reset complete');
        console.log('[TutorialService] 🔍 After reset - completed:', Array.from(this.completedFlows));
    }

    // Check if current tutorial is settings-related
    isSettingsRelatedTutorial() {
        if (!this.currentFlow) return false;
        
        // Check if tutorial ID or current step involves settings
        const settingsRelatedIds = ['settings-customization', 'welcome'];
        const isSettingsFlow = settingsRelatedIds.includes(this.currentFlow.id);
        
        // Check if current step targets settings elements
        const currentStep = this.getCurrentStep();
        const isSettingsStep = currentStep && (
            currentStep.target.includes('settings-container') ||
            currentStep.target.includes('header-help-button') ||
            this.currentFlow.id === 'settings-customization'
        );
        
        return isSettingsFlow || isSettingsStep;
    }

    // Prevent/allow settings window auto-hide
    preventSettingsHide(prevent) {
        // Store the tutorial state globally so settings components can check it
        if (typeof window !== 'undefined') {
            window._tutorialPreventSettingsHide = prevent;
            console.log('[TutorialService] 📌 Set tutorialPreventSettingsHide:', prevent);
        }
        
        // Also try to communicate with settings view directly
        const settingsView = document.querySelector('settings-view');
        if (settingsView && settingsView._tutorialModeActive !== undefined) {
            settingsView._tutorialModeActive = prevent;
            console.log('[TutorialService] 📌 Set settings view tutorial mode:', prevent);
        }
    }

    // Debug method to check current state
    debugState() {
        console.log('[TutorialService] 🔍 CURRENT STATE DEBUG:');
        console.log('  - isActive:', this.isActive);
        console.log('  - currentFlow:', this.currentFlow?.name || 'none');
        console.log('  - currentStepIndex:', this.currentStepIndex);
        console.log('  - Total flows registered:', this.tutorialFlows.size);
        console.log('  - Registered flows:', Array.from(this.tutorialFlows.keys()));
        console.log('  - Completed flows:', Array.from(this.completedFlows));
        console.log('  - Skipped flows:', Array.from(this.skippedFlows));
        console.log('  - Progress rate:', this.getCompletionRate() + '%');
        console.log('  - Overlay element:', !!this.overlay);
        console.log('  - Manager element:', !!this.manager);
    }

    // Hint management
    dismissHint(hintId) {
        this.dismissedHints.add(hintId);
        this.saveProgress();
    }

    isHintDismissed(hintId) {
        return this.dismissedHints.has(hintId);
    }

    // Get available flows
    getAvailableFlows() {
        return Array.from(this.tutorialFlows.values()).sort((a, b) => 
            (a.priority || 999) - (b.priority || 999)
        );
    }
}

// Create singleton instance
console.log('[TutorialService] 🚀 Creating tutorial service singleton...');
const tutorialService = new TutorialService();

// Make tutorialService available globally for easy access
if (typeof window !== 'undefined') {
    window.tutorialService = tutorialService;
    
    // Add debug helpers to window for easy console access
    window.debugTutorials = () => tutorialService.debugState();
    window.resetTutorials = () => {
        tutorialService.resetProgress();
        alert('Tutorial progress reset to 0%');
    };
    window.clearTutorialStorage = () => {
        localStorage.removeItem('leviousa-tutorial-progress');
        alert('Tutorial localStorage cleared');
    };
    
    console.log('[TutorialService] ✅ Tutorial service attached to window.tutorialService');
    console.log('[TutorialService] 🛠️ Debug helpers available: window.debugTutorials(), window.resetTutorials(), window.clearTutorialStorage()');
} else {
    console.warn('[TutorialService] ⚠️ Window object not available, tutorial service not global');
}

// Export the class and singleton instance
export { TutorialService, tutorialService };
