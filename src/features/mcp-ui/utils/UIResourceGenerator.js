/**
 * Utility class for generating UI resources for MCP tools
 */
class UIResourceGenerator {
  /**
   * Generate an email composer UI resource
   * @param {Object} options - Options for the email composer
   * @returns {Object} UI resource object
   */
  static generateEmailComposer(options = {}) {
    const {
      to = '',
      cc = '',
      bcc = '',
      subject = '',
      body = '',
      attachments = [],
      serverId = 'gmail',
      draftId = null
    } = options;

    const html = `
      <div class="email-composer">
        <h3>Compose Email</h3>
        <form id="email-form">
          <div class="form-group">
            <label for="to">To:</label>
            <input type="email" id="to" name="to" value="${UIResourceGenerator._escapeHtml(to)}" 
                   placeholder="recipient@example.com" multiple required>
          </div>
          
          <div class="form-group">
            <label for="cc">CC:</label>
            <input type="email" id="cc" name="cc" value="${UIResourceGenerator._escapeHtml(cc)}" 
                   placeholder="cc@example.com" multiple>
          </div>
          
          <div class="form-group">
            <label for="bcc">BCC:</label>
            <input type="email" id="bcc" name="bcc" value="${UIResourceGenerator._escapeHtml(bcc)}" 
                   placeholder="bcc@example.com" multiple>
          </div>
          
          <div class="form-group">
            <label for="subject">Subject:</label>
            <input type="text" id="subject" name="subject" value="${UIResourceGenerator._escapeHtml(subject)}" 
                   placeholder="Email subject" required>
          </div>
          
          <div class="form-group">
            <label for="body">Message:</label>
            <textarea id="body" name="body" rows="10" 
                      placeholder="Type your message here..." required>${UIResourceGenerator._escapeHtml(body)}</textarea>
          </div>
          
          ${attachments.length > 0 ? `
            <div class="form-group">
              <label>Attachments:</label>
              <ul class="attachments-list">
                ${attachments.map((att, i) => `
                  <li>${UIResourceGenerator._escapeHtml(att.name)} 
                    <button type="button" onclick="removeAttachment(${i})">Remove</button>
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
          
          <div class="form-actions">
            <button type="button" onclick="sendEmail()" class="primary">Send</button>
            <button type="button" onclick="saveDraft()">Save Draft</button>
            <button type="button" onclick="discardEmail()">Discard</button>
          </div>
        </form>
      </div>
      
      <script>
        function getFormData() {
          const form = document.getElementById('email-form');
          const formData = new FormData(form);
          return {
            to: formData.get('to').split(',').map(e => e.trim()).filter(e => e),
            cc: formData.get('cc').split(',').map(e => e.trim()).filter(e => e),
            bcc: formData.get('bcc').split(',').map(e => e.trim()).filter(e => e),
            subject: formData.get('subject'),
            body: formData.get('body')
          };
        }
        
        function sendEmail() {
          const data = getFormData();
          if (!data.to.length || !data.subject || !data.body) {
            alert('Please fill in required fields');
            return;
          }
          
          window.parent.postMessage({
            type: 'ui-action',
            tool: 'gmail.send',
            params: {
              ...data,
              draftId: '${draftId || ''}'
            }
          }, '*');
        }
        
        function saveDraft() {
          const data = getFormData();
          window.parent.postMessage({
            type: 'ui-action',
            tool: 'gmail.saveDraft',
            params: data
          }, '*');
        }
        
        function discardEmail() {
          if (confirm('Discard this email?')) {
            window.parent.postMessage({
              type: 'ui-action',
              tool: 'gmail.discard',
              params: { draftId: '${draftId || ''}' }
            }, '*');
          }
        }
        
        function removeAttachment(index) {
          window.parent.postMessage({
            type: 'ui-action',
            tool: 'gmail.removeAttachment',
            params: { index }
          }, '*');
        }
      </script>
      
      <style>
        .email-composer { max-width: 600px; margin: 0 auto; }
        .form-group { margin-bottom: 16px; }
        .form-actions { display: flex; gap: 8px; margin-top: 20px; }
        .form-actions button { padding: 8px 16px; }
        .form-actions .primary { background: #0066ff; color: white; }
        .attachments-list { list-style: none; padding: 0; }
        .attachments-list li { padding: 8px; background: #f5f5f5; margin-bottom: 4px; 
                               display: flex; justify-content: space-between; }
      </style>
    `;

    return {
      type: 'resource',
      resource: {
        uri: `ui://email-composer/${Date.now()}`,
        mimeType: 'text/html',
        title: 'Email Composer',
        text: html
      }
    };
  }

  /**
   * Generate a calendar booking widget UI resource
   * @param {Object} options - Options for the calendar widget
   * @returns {Object} UI resource object
   */
  static generateCalendarWidget(options = {}) {
    const {
      title = '',
      description = '',
      location = '',
      startTime = '',
      endTime = '',
      attendees = [],
      availableSlots = [],
      serverId = 'google-calendar'
    } = options;

    const html = `
      <div class="calendar-widget">
        <h3>Schedule Meeting</h3>
        <form id="meeting-form">
          <div class="form-group">
            <label for="title">Meeting Title:</label>
            <input type="text" id="title" name="title" value="${UIResourceGenerator._escapeHtml(title)}" 
                   placeholder="Meeting title" required>
          </div>
          
          <div class="form-group">
            <label for="description">Description:</label>
            <textarea id="description" name="description" rows="3" 
                      placeholder="Meeting description">${UIResourceGenerator._escapeHtml(description)}</textarea>
          </div>
          
          <div class="form-group">
            <label for="location">Location:</label>
            <input type="text" id="location" name="location" value="${UIResourceGenerator._escapeHtml(location)}" 
                   placeholder="Meeting location or video link">
          </div>
          
          ${availableSlots.length > 0 ? `
            <div class="form-group">
              <label>Available Time Slots:</label>
              <div class="time-slots">
                ${availableSlots.map((slot, i) => `
                  <button type="button" class="time-slot" onclick="selectSlot(${i})" 
                          data-start="${slot.start}" data-end="${slot.end}">
                    ${this._formatTime(slot.start)} - ${this._formatTime(slot.end)}
                  </button>
                `).join('')}
              </div>
            </div>
          ` : `
            <div class="form-group">
              <label for="startTime">Start Time:</label>
              <input type="datetime-local" id="startTime" name="startTime" 
                     value="${startTime}" required>
            </div>
            
            <div class="form-group">
              <label for="endTime">End Time:</label>
              <input type="datetime-local" id="endTime" name="endTime" 
                     value="${endTime}" required>
            </div>
          `}
          
          <div class="form-group">
            <label for="attendees">Attendees (email addresses):</label>
            <input type="text" id="attendees" name="attendees" 
                   value="${attendees.join(', ')}" 
                   placeholder="email1@example.com, email2@example.com">
          </div>
          
          <div class="form-actions">
            <button type="button" onclick="scheduleMeeting()" class="primary">Schedule Meeting</button>
            <button type="button" onclick="checkAvailability()">Check Availability</button>
            <button type="button" onclick="cancel()">Cancel</button>
          </div>
        </form>
      </div>
      
      <script>
        let selectedSlot = null;
        
        function selectSlot(index) {
          const slots = document.querySelectorAll('.time-slot');
          slots.forEach(s => s.classList.remove('selected'));
          slots[index].classList.add('selected');
          selectedSlot = {
            start: slots[index].dataset.start,
            end: slots[index].dataset.end
          };
        }
        
        function getFormData() {
          const form = document.getElementById('meeting-form');
          const formData = new FormData(form);
          
          let startTime, endTime;
          if (selectedSlot) {
            startTime = selectedSlot.start;
            endTime = selectedSlot.end;
          } else {
            startTime = formData.get('startTime');
            endTime = formData.get('endTime');
          }
          
          return {
            title: formData.get('title'),
            description: formData.get('description'),
            location: formData.get('location'),
            startTime,
            endTime,
            attendees: formData.get('attendees').split(',').map(e => e.trim()).filter(e => e)
          };
        }
        
        function scheduleMeeting() {
          const data = getFormData();
          if (!data.title || !data.startTime || !data.endTime) {
            alert('Please fill in required fields');
            return;
          }
          
          window.parent.postMessage({
            type: 'ui-action',
            tool: 'calendar.createEvent',
            params: data
          }, '*');
        }
        
        function checkAvailability() {
          const data = getFormData();
          window.parent.postMessage({
            type: 'ui-action',
            tool: 'calendar.checkAvailability',
            params: {
              attendees: data.attendees,
              startTime: data.startTime,
              duration: 60 // default 60 minutes
            }
          }, '*');
        }
        
        function cancel() {
          window.parent.postMessage({
            type: 'ui-action',
            tool: 'calendar.cancel',
            params: {}
          }, '*');
        }
      </script>
      
      <style>
        .calendar-widget { max-width: 500px; margin: 0 auto; }
        .time-slots { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .time-slot { padding: 8px; background: #f0f0f0; border: 1px solid #ddd; 
                     cursor: pointer; transition: all 0.2s; }
        .time-slot:hover { background: #e0e0e0; }
        .time-slot.selected { background: #0066ff; color: white; }
      </style>
    `;

    return {
      type: 'resource',
      resource: {
        uri: `ui://calendar-widget/${Date.now()}`,
        mimeType: 'text/html',
        title: 'Calendar Booking',
        text: html
      }
    };
  }

  /**
   * Generate a LinkedIn profile card UI resource
   * @param {Object} profile - LinkedIn profile data
   * @returns {Object} UI resource object
   */
  static generateLinkedInProfileCard(profile = {}) {
    const {
      name = '',
      headline = '',
      photo = '',
      connections = 0,
      followers = 0,
      about = '',
      experience = [],
      skills = [],
      profileUrl = ''
    } = profile;

    const html = `
      <div class="linkedin-profile-card">
        <div class="profile-header">
          ${photo ? `<img src="${photo}" alt="${UIResourceGenerator._escapeHtml(name)}" class="profile-photo">` : ''}
          <div class="profile-info">
            <h2>${UIResourceGenerator._escapeHtml(name)}</h2>
            <p class="headline">${UIResourceGenerator._escapeHtml(headline)}</p>
            <div class="stats">
              <span>${connections} connections</span>
              <span>${followers} followers</span>
            </div>
          </div>
        </div>
        
        ${about ? `
          <div class="section">
            <h3>About</h3>
            <p>${UIResourceGenerator._escapeHtml(about)}</p>
          </div>
        ` : ''}
        
        ${experience.length > 0 ? `
          <div class="section">
            <h3>Experience</h3>
            <ul class="experience-list">
              ${experience.slice(0, 3).map(exp => `
                <li>
                  <strong>${UIResourceGenerator._escapeHtml(exp.title)}</strong>
                  <br>${UIResourceGenerator._escapeHtml(exp.company)}
                  <br><span class="date">${exp.startDate} - ${exp.endDate || 'Present'}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${skills.length > 0 ? `
          <div class="section">
            <h3>Skills</h3>
            <div class="skills-list">
              ${skills.slice(0, 6).map(skill => `
                <span class="skill-tag">${UIResourceGenerator._escapeHtml(skill)}</span>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <div class="profile-actions">
          <button onclick="connect()">Connect</button>
          <button onclick="sendMessage()">Message</button>
          ${profileUrl ? `<button onclick="viewFullProfile()">View Full Profile</button>` : ''}
        </div>
      </div>
      
      <script>
        function connect() {
          window.parent.postMessage({
            type: 'ui-action',
            tool: 'linkedin.connect',
            params: { profileUrl: '${profileUrl}' }
          }, '*');
        }
        
        function sendMessage() {
          window.parent.postMessage({
            type: 'ui-action',
            tool: 'linkedin.message',
            params: { profileUrl: '${profileUrl}' }
          }, '*');
        }
        
        function viewFullProfile() {
          window.parent.postMessage({
            type: 'ui-action',
            tool: 'linkedin.openProfile',
            params: { profileUrl: '${profileUrl}' }
          }, '*');
        }
      </script>
      
      <style>
        .linkedin-profile-card { max-width: 400px; margin: 0 auto; }
        .profile-header { display: flex; gap: 16px; margin-bottom: 20px; }
        .profile-photo { width: 80px; height: 80px; border-radius: 50%; }
        .headline { color: #666; margin: 4px 0; }
        .stats { display: flex; gap: 16px; font-size: 14px; color: #666; }
        .section { margin: 20px 0; }
        .experience-list { list-style: none; padding: 0; }
        .experience-list li { margin-bottom: 12px; padding-bottom: 12px; 
                             border-bottom: 1px solid #eee; }
        .date { color: #666; font-size: 14px; }
        .skills-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .skill-tag { padding: 4px 12px; background: #e6f2ff; 
                    border-radius: 16px; font-size: 14px; }
        .profile-actions { display: flex; gap: 8px; margin-top: 20px; }
        .profile-actions button { flex: 1; padding: 8px 16px; }
      </style>
    `;

    return {
      type: 'resource',
      resource: {
        uri: `ui://linkedin-profile/${Date.now()}`,
        mimeType: 'text/html',
        title: 'LinkedIn Profile',
        text: html
      }
    };
  }

  /**
   * Generate a Notion document saver UI resource
   * @param {Object} options - Options for the Notion saver
   * @returns {Object} UI resource object
   */
  static generateNotionSaver(options = {}) {
    const {
      title = '',
      content = '',
      workspace = '',
      workspaces = [],
      parentPage = '',
      tags = [],
      serverId = 'notion'
    } = options;

    const html = `
      <div class="notion-saver">
        <h3>Save to Notion</h3>
        <form id="notion-form">
          <div class="form-group">
            <label for="title">Page Title:</label>
            <input type="text" id="title" name="title" value="${UIResourceGenerator._escapeHtml(title)}" 
                   placeholder="Enter page title" required>
          </div>
          
          ${workspaces.length > 0 ? `
            <div class="form-group">
              <label for="workspace">Workspace:</label>
              <select id="workspace" name="workspace" required>
                <option value="">Select workspace</option>
                ${workspaces.map(ws => `
                  <option value="${ws.id}" ${ws.id === workspace ? 'selected' : ''}>
                    ${UIResourceGenerator._escapeHtml(ws.name)}
                  </option>
                `).join('')}
              </select>
            </div>
          ` : ''}
          
          <div class="form-group">
            <label for="parentPage">Parent Page (optional):</label>
            <input type="text" id="parentPage" name="parentPage" 
                   value="${UIResourceGenerator._escapeHtml(parentPage)}" 
                   placeholder="Parent page URL or ID">
          </div>
          
          <div class="form-group">
            <label for="content">Content:</label>
            <textarea id="content" name="content" rows="10" required>${UIResourceGenerator._escapeHtml(content)}</textarea>
          </div>
          
          <div class="form-group">
            <label for="tags">Tags (comma-separated):</label>
            <input type="text" id="tags" name="tags" 
                   value="${tags.join(', ')}" 
                   placeholder="tag1, tag2, tag3">
          </div>
          
          <div class="preview-section">
            <h4>Preview</h4>
            <div id="preview" class="preview-content"></div>
          </div>
          
          <div class="form-actions">
            <button type="button" onclick="saveToNotion()" class="primary">Save to Notion</button>
            <button type="button" onclick="saveAsTemplate()">Save as Template</button>
            <button type="button" onclick="cancel()">Cancel</button>
          </div>
        </form>
      </div>
      
      <script>
        // Update preview on content change
        document.getElementById('content').addEventListener('input', updatePreview);
        document.getElementById('title').addEventListener('input', updatePreview);
        
        function updatePreview() {
          const title = document.getElementById('title').value;
          const content = document.getElementById('content').value;
          const preview = document.getElementById('preview');
          
          preview.innerHTML = \`
            <h3>\${title || 'Untitled'}</h3>
            <div>\${content.replace(/\\n/g, '<br>')}</div>
          \`;
        }
        
        function getFormData() {
          const form = document.getElementById('notion-form');
          const formData = new FormData(form);
          
          return {
            title: formData.get('title'),
            content: formData.get('content'),
            workspace: formData.get('workspace'),
            parentPage: formData.get('parentPage'),
            tags: formData.get('tags').split(',').map(t => t.trim()).filter(t => t)
          };
        }
        
        function saveToNotion() {
          const data = getFormData();
          if (!data.title || !data.content) {
            alert('Please fill in required fields');
            return;
          }
          
          window.parent.postMessage({
            type: 'ui-action',
            tool: 'notion.createPage',
            params: data
          }, '*');
        }
        
        function saveAsTemplate() {
          const data = getFormData();
          window.parent.postMessage({
            type: 'ui-action',
            tool: 'notion.saveTemplate',
            params: data
          }, '*');
        }
        
        function cancel() {
          window.parent.postMessage({
            type: 'ui-action',
            tool: 'notion.cancel',
            params: {}
          }, '*');
        }
        
        // Initial preview update
        updatePreview();
      </script>
      
      <style>
        .notion-saver { max-width: 600px; margin: 0 auto; }
        .preview-section { margin: 20px 0; padding: 16px; background: #f5f5f5; 
                          border-radius: 8px; }
        .preview-content { max-height: 200px; overflow-y: auto; padding: 12px; 
                          background: white; border-radius: 4px; }
        textarea { font-family: monospace; }
      </style>
    `;

    return {
      type: 'resource',
      resource: {
        uri: `ui://notion-saver/${Date.now()}`,
        mimeType: 'text/html',
        title: 'Save to Notion',
        text: html
      }
    };
  }

  /**
   * Escape HTML to prevent XSS
   * @private
   */
  static _escapeHtml(text) {
    if (!text) return '';
    
    // If document is available (browser), use it
    if (typeof document !== 'undefined') {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    // Otherwise, use manual escaping (Node.js)
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Format time for display
   * @private
   */
  static _formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      month: 'short',
      day: 'numeric'
    });
  }
}

module.exports = { UIResourceGenerator }; 