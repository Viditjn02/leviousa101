#!/usr/bin/env node

const path = require('path');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { readFileSync } = require('fs');

console.log('🔄 Session Title Fix Utility');
console.log('===========================');

// Initialize Firebase
const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

const app = initializeApp({
    credential: require('firebase-admin/app').cert(serviceAccount),
    projectId: 'leviousa'
});

const firestore = getFirestore(app);

async function fixSessionTitles(userId = '7J1iNQy1GSTH0iyJWXHOIfI2D6G2') {
    try {
        console.log(`\n🔍 Finding sessions for user: ${userId}`);
        
        // Get all sessions for the user
        const sessionsRef = firestore.collection('sessions');
        const sessionsSnapshot = await sessionsRef.where('uid', '==', userId).get();
        
        console.log(`📋 Found ${sessionsSnapshot.size} sessions`);
        
        for (const sessionDoc of sessionsSnapshot.docs) {
            const sessionId = sessionDoc.id;
            const sessionData = sessionDoc.data();
            
            console.log(`\n📄 Processing session: ${sessionId}`);
            console.log(`   Current title: "${sessionData.title}"`);
            console.log(`   Session type: ${sessionData.session_type || 'ask'}`);
            console.log(`   Created: ${sessionData.started_at?.toDate?.() || sessionData.started_at}`);
            
            // Check if it has a generic title
            const hasGenericTitle = sessionData.title && (
                sessionData.title.includes('Q&A Session -') || 
                sessionData.title.includes('Listen Session -') ||
                sessionData.title.includes('Conversation -')
            );
            
            if (!hasGenericTitle) {
                console.log(`   ✅ Already has meaningful title, skipping`);
                continue;
            }
            
            // Get AI messages to generate better title
            const aiMessagesRef = sessionsRef.doc(sessionId).collection('ai_messages');
            const aiMessagesSnapshot = await aiMessagesRef.orderBy('sent_at', 'asc').limit(10).get();
            
            if (aiMessagesSnapshot.empty) {
                console.log(`   ⚠️  No AI messages found, keeping default title`);
                continue;
            }
            
            console.log(`   💬 Found ${aiMessagesSnapshot.size} AI messages`);
            
            // Extract conversation content
            const messages = aiMessagesSnapshot.docs.map(doc => doc.data());
            const userMessages = messages.filter(m => m.role === 'user' && m.content && m.content.trim().length > 10);
            
            if (userMessages.length === 0) {
                console.log(`   ⚠️  No meaningful user messages found`);
                continue;
            }
            
            // Generate a simple meaningful title based on the first user message
            const firstUserMessage = userMessages[0].content;
            const newTitle = generateSimpleTitle(firstUserMessage);
            
            console.log(`   🎯 Generated new title: "${newTitle}"`);
            
            // Update the session title
            await sessionDoc.ref.update({
                title: newTitle,
                title_updated_at: new Date()
            });
            
            console.log(`   ✅ Updated title successfully`);
        }
        
        console.log(`\n🎉 Session title fix completed!`);
        
    } catch (error) {
        console.error('❌ Error fixing session titles:', error);
    }
}

function generateSimpleTitle(userMessage) {
    const message = userMessage.trim();
    
    // Simple title generation rules
    if (message.toLowerCase().includes('email') && message.toLowerCase().includes('meeting')) {
        return 'Welcome Email and Meeting Scheduling';
    }
    
    if (message.toLowerCase().includes('email')) {
        return 'Email Communication';
    }
    
    if (message.toLowerCase().includes('meeting') || message.toLowerCase().includes('schedule')) {
        return 'Meeting Scheduling';
    }
    
    if (message.toLowerCase().includes('calendar')) {
        return 'Calendar Management';
    }
    
    if (message.toLowerCase().includes('book') && message.toLowerCase().includes('meeting')) {
        return 'Meeting Booking Request';
    }
    
    if (message.toLowerCase().includes('send') && message.toLowerCase().includes('email')) {
        return 'Email Sending Task';
    }
    
    // For generic messages, take the first few meaningful words
    const words = message.split(' ').filter(word => 
        word.length > 2 && 
        !['the', 'and', 'for', 'with', 'can', 'you', 'please', 'help', 'how', 'what', 'when', 'where'].includes(word.toLowerCase())
    );
    
    if (words.length > 0) {
        const titleWords = words.slice(0, 4).map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        );
        return titleWords.join(' ') + (words.length > 4 ? ' Discussion' : ' Query');
    }
    
    // Fallback
    return 'General Discussion';
}

// Run the fix
if (require.main === module) {
    fixSessionTitles().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });
}

module.exports = { fixSessionTitles };
