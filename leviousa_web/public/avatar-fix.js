// Fix Sarah Rodriguez avatar on page load
document.addEventListener('DOMContentLoaded', function() {
  // Find all Sarah Rodriguez avatars and update them
  const sarahAvatars = document.querySelectorAll('img[alt="Sarah Rodriguez"]');
  sarahAvatars.forEach(img => {
    img.src = 'https://randomuser.me/api/portraits/women/44.jpg';
    img.onerror = function() {
      // Fallback if randomuser fails
      this.src = 'https://ui-avatars.com/api/?name=Sarah+Rodriguez&background=905151&color=fff&size=100';
    };
  });
});