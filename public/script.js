// App State
const state = {
    currentUser: null,
    notes: [],
    publicNotes: [],
    bookmarks: [],
    currentView: 'dashboard',
    editingNoteId: null,
    isLoggedIn: false,
    darkMode: localStorage.getItem('darkMode') === 'true' || false,
    adminMode: false
};

// DOM Elements
const elements = {
    appContent: document.getElementById('appContent'),
    userAvatar: document.getElementById('userAvatar'),
    addNoteBtn: document.getElementById('addNoteBtn'),
    notificationBadge: document.getElementById('notificationBadge'),
    
    // Modals
    loginModal: document.getElementById('loginModal'),
    registerModal: document.getElementById('registerModal'),
    noteModal: document.getElementById('noteModal'),
    noteDetailModal: document.getElementById('noteDetailModal'),
    profileModal: document.getElementById('profileModal'),
    
    // Forms
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    noteForm: document.getElementById('noteForm'),
    commentForm: document.getElementById('commentForm'),
    
    // Note modal elements
    noteModalTitle: document.getElementById('noteModalTitle'),
    noteId: document.getElementById('noteId'),
    noteTitle: document.getElementById('noteTitle'),
    noteContent: document.getElementById('noteContent'),
    noteImage: document.getElementById('noteImage'),
    noteImagePreview: document.getElementById('noteImagePreview'),
    removeImageBtn: document.getElementById('removeImageBtn'),
    noteIsPublic: document.getElementById('noteIsPublic'),
    
    // Note detail modal elements
    noteDetailTitle: document.getElementById('noteDetailTitle'),
    noteDetailContent: document.getElementById('noteDetailContent'),
    noteDetailImageContainer: document.getElementById('noteDetailImageContainer'),
    noteDetailAuthorAvatar: document.getElementById('noteDetailAuthorAvatar'),
    noteDetailAuthorName: document.getElementById('noteDetailAuthorName'),
    noteDetailCreatedAt: document.getElementById('noteDetailCreatedAt'),
    noteDetailViews: document.getElementById('noteDetailViews'),
    noteDetailLikes: document.getElementById('noteDetailLikes'),
    noteDetailLikeBtn: document.getElementById('noteDetailLikeBtn'),
    noteDetailBookmarkBtn: document.getElementById('noteDetailBookmarkBtn'),
    noteDetailShareBtn: document.getElementById('noteDetailShareBtn'),
    noteDetailEditBtn: document.getElementById('noteDetailEditBtn'),
    noteDetailDeleteBtn: document.getElementById('noteDetailDeleteBtn'),
    
    // Profile modal elements
    profileModalAvatar: document.getElementById('profileModalAvatar'),
    profileModalName: document.getElementById('profileModalName'),
    profileModalBio: document.getElementById('profileModalBio'),
    profileModalNotes: document.getElementById('profileModalNotes'),
    profileModalFollowers: document.getElementById('profileModalFollowers'),
    profileModalFollowing: document.getElementById('profileModalFollowing'),
    profileModalActions: document.getElementById('profileModalActions'),
    profileModalFollowBtn: document.getElementById('profileModalFollowBtn'),
    profileModalNotesGrid: document.getElementById('profileModalNotesGrid'),
    
    // Other UI elements
    toastContainer: document.getElementById('toastContainer'),
    navLinks: document.getElementById('navLinks'),
    authButtons: document.getElementById('authButtons'),
    userMenu: document.getElementById('userMenu'),
    loginBtn: document.getElementById('loginBtn'),
    registerBtn: document.getElementById('registerBtn'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    themeToggle: document.getElementById('themeToggle'),
    showLogin: document.getElementById('showLogin'),
    showRegister: document.getElementById('showRegister')
};

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkAuthState();
    applyDarkMode();
});

// Setup all event listeners
function setupEventListeners() {
    // Auth buttons
    elements.loginBtn?.addEventListener('click', showLoginModal);
    elements.registerBtn?.addEventListener('click', showRegisterModal);
    elements.logoutBtn?.addEventListener('click', logout);
    
    // Modal buttons
    elements.closeLoginModal?.addEventListener('click', () => hideModal('loginModal'));
    elements.closeRegisterModal?.addEventListener('click', () => hideModal('registerModal'));
    elements.closeNoteModal?.addEventListener('click', () => hideModal('noteModal'));
    elements.closeNoteDetailModal?.addEventListener('click', () => hideModal('noteDetailModal'));
    elements.closeProfileModal?.addEventListener('click', () => hideModal('profileModal'));
    
    // Form submissions
    elements.loginForm?.addEventListener('submit', handleLogin);
    elements.registerForm?.addEventListener('submit', handleRegister);
    elements.noteForm?.addEventListener('submit', handleNoteSubmit);
    elements.commentForm?.addEventListener('submit', handleCommentSubmit);
    
    // Navigation links
    document.querySelectorAll('[data-view]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            state.currentView = e.currentTarget.getAttribute('data-view');
            renderView();
        });
    });
    
    // Add note button
    elements.addNoteBtn?.addEventListener('click', showAddNoteModal);
    
    // Mobile menu
    elements.mobileMenuBtn?.addEventListener('click', toggleMobileMenu);
    
    // User avatar dropdown
    elements.userAvatar?.addEventListener('click', toggleUserMenu);
    
    // Theme toggle
    elements.themeToggle?.addEventListener('change', toggleDarkMode);
    
    // Image upload preview
    elements.noteImage?.addEventListener('change', handleImageUpload);
    elements.removeImageBtn?.addEventListener('click', removeNoteImage);
}

// Apply dark mode
function applyDarkMode() {
    if (state.darkMode) {
        document.body.classList.add('dark-mode');
        if (elements.themeToggle) elements.themeToggle.checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        if (elements.themeToggle) elements.themeToggle.checked = false;
    }
}

// Toggle dark mode
function toggleDarkMode() {
    state.darkMode = !state.darkMode;
    localStorage.setItem('darkMode', state.darkMode);
    applyDarkMode();
}

// Show toast notification
function showToast(message, type = 'info', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close">&times;</button>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
    
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    });
}

// Toggle mobile menu
function toggleMobileMenu() {
    elements.navLinks.classList.toggle('active');
}

// Toggle user menu
function toggleUserMenu(e) {
    e.stopPropagation();
    const dropdown = document.querySelector('.dropdown-menu');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        const dropdown = document.querySelector('.dropdown-menu');
        if (dropdown) dropdown.style.display = 'none';
    }
});

// Check authentication state
async function checkAuthState() {
    const token = localStorage.getItem('mynotesToken');
    if (token) {
        try {
            const response = await fetch('/api/users/me', {
                headers: {
                    'Authorization': token
                }
            });

            if (response.ok) {
                const user = await response.json();
                state.currentUser = user;
                state.isLoggedIn = true;
                updateUI();
                loadPublicNotes();
            }
        } catch (error) {
            console.error('Error verifying user:', error);
            localStorage.removeItem('mynotesToken');
        }
    }
    renderView();
}

// Update UI based on auth state
function updateUI() {
    if (state.isLoggedIn) {
        elements.authButtons.style.display = 'none';
        elements.userMenu.style.display = 'flex';
        elements.userAvatar.src = state.currentUser.avatar || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(state.currentUser.name)}&background=4a6fa5&color=fff`;
        elements.addNoteBtn.style.display = 'flex';
    } else {
        elements.authButtons.style.display = 'flex';
        elements.userMenu.style.display = 'none';
        elements.addNoteBtn.style.display = 'none';
    }
}

// Load public notes
async function loadPublicNotes() {
    try {
        const response = await fetch('/api/notes/public');
        if (response.ok) {
            state.publicNotes = await response.json();
            renderView();
        }
    } catch (error) {
        console.error('Error loading public notes:', error);
        showToast('Error loading public notes', 'error');
    }
}

// Render the current view
function renderView() {
    if (!state.isLoggedIn) {
        renderWelcomeView();
        return;
    }

    switch (state.currentView) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'explore':
            renderExplore();
            break;
        case 'bookmarks':
            renderBookmarks();
            break;
        case 'profile':
            renderProfile();
            break;
        default:
            renderDashboard();
    }
}

// Render welcome view
function renderWelcomeView() {
    elements.appContent.innerHTML = `
        <div class="auth-container">
            <div class="auth-card">
                <h2>Welcome to MyNotes</h2>
                <p>Create, organize, and share your notes with the world.</p>
                <div style="margin-top: 30px; display: flex; flex-direction: column; gap: 10px;">
                    <button class="btn" onclick="showLoginModal()">Login</button>
                    <button class="btn btn-outline" onclick="showRegisterModal()">Register</button>
                </div>
            </div>
        </div>
    `;
}

// Render Dashboard View
function renderDashboard() {
    elements.appContent.innerHTML = `
        <div class="dashboard-header">
            <h1>Dashboard</h1>
        </div>
        <div id="notesContainer">
            ${renderNotesGrid(state.publicNotes)}
        </div>
    `;

    setupDashboardEventListeners();
}

// Render Explore View
function renderExplore() {
    elements.appContent.innerHTML = `
        <div class="dashboard-header">
            <h1>Explore</h1>
            <div class="search-bar">
                <input type="text" id="searchInput" placeholder="Search notes...">
                <button class="btn" id="searchBtn">Search</button>
            </div>
        </div>
        <div id="notesContainer">
            ${state.publicNotes.length > 0 ? renderNotesGrid(state.publicNotes) : renderEmptyState()}
        </div>
    `;

    setupDashboardEventListeners();
}

// Render Bookmarks View
function renderBookmarks() {
    elements.appContent.innerHTML = `
        <div class="dashboard-header">
            <h1>Saved Notes</h1>
        </div>
        <div id="notesContainer">
            ${state.bookmarks.length > 0 ? renderNotesGrid(state.bookmarks) : renderEmptyState('You have no saved notes')}
        </div>
    `;

    setupDashboardEventListeners();
}

// Render empty state
function renderEmptyState(message = 'No notes found') {
    return `
        <div class="empty-state">
            <i class="fas fa-book-open"></i>
            <h3>${message}</h3>
        </div>
    `;
}

// Render notes grid
function renderNotesGrid(notes) {
    return `
        <div class="notes-grid">
            ${notes.map(note => `
                <div class="note-card" data-id="${note.id}">
                    <div class="note-card-header">
                        <div class="note-author" data-user-id="${note.userId}">
                            <img src="${getUserAvatar(note.userId)}" alt="Author" class="note-author-avatar">
                            <span>${getUserName(note.userId)}</span>
                        </div>
                        <div class="note-stats">
                            <span class="note-stat"><i class="fas fa-eye"></i> ${note.views || 0}</span>
                            <span class="note-stat"><i class="fas fa-heart"></i> ${note.likes || 0}</span>
                        </div>
                    </div>
                    <h3>${note.title}</h3>
                    <p>${note.content.length > 100 ? note.content.substring(0, 100) + '...' : note.content}</p>
                    ${note.image ? `<div class="note-image-preview" style="background-image: url('${note.image}')"></div>` : ''}
                    <div class="note-meta">
                        <span>${formatDate(note.createdAt)}</span>
                        ${note.isPublic ? '<span class="note-public">Public</span>' : ''}
                    </div>
                    <div class="note-actions">
                        <button class="btn btn-outline btn-sm view-note" data-id="${note.id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                        ${note.userId === state.currentUser?.id ? `
                            <button class="btn btn-outline btn-sm edit-note" data-id="${note.id}">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Render Profile View
function renderProfile() {
    if (!state.currentUser) return;
    
    fetch(`/api/users/stats/${state.currentUser.id}`)
        .then(res => res.json())
        .then(stats => {
            elements.appContent.innerHTML = `
                <div class="profile-container">
                    <div class="profile-header">
                        <img src="${state.currentUser.avatar || 
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(state.currentUser.name)}&background=4a6fa5&color=fff`}" 
                             alt="Profile" class="profile-avatar">
                        <div class="profile-info">
                            <h2>${state.currentUser.name}</h2>
                            <p>${state.currentUser.email}</p>
                            ${state.currentUser.bio ? `<p class="profile-bio">${state.currentUser.bio}</p>` : ''}
                            <p>Member since ${formatDate(state.currentUser.createdAt)}</p>
                            <div class="profile-stats">
                                <div class="stat-item">
                                    <div class="stat-value">${stats.totalNotes}</div>
                                    <div class="stat-label">Notes</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">${stats.totalPublicNotes}</div>
                                    <div class="stat-label">Public</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">${stats.followers}</div>
                                    <div class="stat-label">Followers</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">${stats.following}</div>
                                    <div class="stat-label">Following</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="profile-actions">
                        <button class="btn" id="editProfileBtn">
                            <i class="fas fa-edit"></i> Edit Profile
                        </button>
                        <button class="btn btn-outline" id="logoutBtn">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            `;

            document.getElementById('editProfileBtn')?.addEventListener('click', showEditProfileModal);
        })
        .catch(error => {
            console.error('Error loading profile:', error);
            showToast('Error loading profile', 'error');
        });
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Get user name by ID
async function getUserName(userId) {
    if (state.currentUser?.id === userId) return 'You';
    
    try {
        const response = await fetch(`/api/users/${userId}`);
        if (response.ok) {
            const user = await response.json();
            return user.name || 'Unknown';
        }
    } catch (error) {
        console.error('Error fetching user:', error);
    }
    return 'Unknown';
}

// Get user avatar by ID
async function getUserAvatar(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        if (response.ok) {
            const user = await response.json();
            return user.avatar || `https://ui-avatars.com/api/?name=Unknown&background=4a6fa5&color=fff`;
        }
    } catch (error) {
        console.error('Error fetching user avatar:', error);
    }
    return `https://ui-avatars.com/api/?name=Unknown&background=4a6fa5&color=fff`;
}

// Setup dashboard event listeners
function setupDashboardEventListeners() {
    // Note actions
    document.querySelectorAll('.view-note').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const noteId = e.currentTarget.getAttribute('data-id');
            viewNote(noteId);
        });
    });

    document.querySelectorAll('.edit-note').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const noteId = e.currentTarget.getAttribute('data-id');
            editNote(noteId);
        });
    });

    // User profile clicks
    document.querySelectorAll('.note-author').forEach(author => {
        author.addEventListener('click', (e) => {
            const userId = e.currentTarget.getAttribute('data-user-id');
            if (userId) viewProfile(userId);
        });
    });
}

// View note details
async function viewNote(noteId) {
    try {
        const response = await fetch(`/api/notes/${noteId}`);
        if (!response.ok) {
            showToast('Note not found', 'error');
            return;
        }

        const note = await response.json();
        state.currentNoteDetail = note;

        // Get author info
        const authorResponse = await fetch(`/api/users/${note.userId}`);
        const author = await authorResponse.json();

        // Update modal content
        elements.noteDetailTitle.textContent = note.title;
        elements.noteDetailContent.textContent = note.content;
        elements.noteDetailAuthorName.textContent = author?.name || 'Unknown';
        elements.noteDetailAuthorAvatar.src = author?.avatar || `https://ui-avatars.com/api/?name=Unknown&background=4a6fa5&color=fff`;
        elements.noteDetailCreatedAt.textContent = formatDate(note.createdAt);
        
        // Update image
        elements.noteDetailImageContainer.innerHTML = note.image ? 
            `<img src="${note.image}" alt="Note Image" class="note-detail-image">` : '';
        
        // Show the modal
        showModal('noteDetailModal');
    } catch (error) {
        console.error('Error viewing note:', error);
        showToast('Error loading note details', 'error');
    }
}

// Show modal
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// Hide modal
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Show login modal
function showLoginModal() {
    showModal('loginModal');
    document.getElementById('loginEmail')?.focus();
}

// Show register modal
function showRegisterModal() {
    showModal('registerModal');
    document.getElementById('registerName')?.focus();
}

// Show edit profile modal
function showEditProfileModal() {
    if (!state.currentUser) return;
    
    elements.editProfileName.value = state.currentUser.name;
    elements.editProfileBio.value = state.currentUser.bio || '';
    
    // Show current avatar
    elements.editProfileAvatarPreview.innerHTML = state.currentUser.avatar ? 
        `<img src="${state.currentUser.avatar}" alt="Current Avatar" class="avatar-preview-image">` : 
        `<div class="avatar-preview-initials">${state.currentUser.name.charAt(0)}</div>`;
    
    showModal('editProfileModal');
}

// Handle image upload
function handleImageUpload() {
    const file = elements.noteImage.files[0];
    if (!file) return;
    
    if (!file.type.match('image.*')) {
        showToast('Only image files are allowed', 'error');
        elements.noteImage.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        elements.noteImagePreview.innerHTML = `
            <img src="${e.target.result}" alt="Image Preview" class="image-preview-image">
        `;
        elements.removeImageBtn.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// Remove note image
function removeNoteImage() {
    elements.noteImage.value = '';
    elements.noteImagePreview.innerHTML = '';
    elements.removeImageBtn.style.display = 'none';
}

// Show add/edit note modal
function showAddNoteModal() {
    if (!state.isLoggedIn) {
        showLoginModal();
        showToast('Please login to create notes', 'warning');
        return;
    }

    state.editingNoteId = null;
    elements.noteModalTitle.textContent = 'Create New Note';
    elements.noteId.value = '';
    elements.noteTitle.value = '';
    elements.noteContent.value = '';
    elements.noteImage.value = '';
    elements.noteImagePreview.innerHTML = '';
    elements.removeImageBtn.style.display = 'none';
    elements.noteIsPublic.checked = false;
    showModal('noteModal');
    elements.noteTitle.focus();
}

// Edit note
async function editNote(noteId) {
    try {
        const response = await fetch(`/api/notes/${noteId}`);
        if (!response.ok) {
            showToast('Note not found', 'error');
            return;
        }

        const note = await response.json();
        state.editingNoteId = noteId;
        elements.noteModalTitle.textContent = 'Edit Note';
        elements.noteId.value = note.id;
        elements.noteTitle.value = note.title;
        elements.noteContent.value = note.content;
        elements.noteIsPublic.checked = note.isPublic || false;
        
        if (note.image) {
            elements.noteImagePreview.innerHTML = `
                <img src="${note.image}" alt="Current Image" class="image-preview-image">
            `;
            elements.removeImageBtn.style.display = 'block';
        }
        
        showModal('noteModal');
    } catch (error) {
        console.error('Error editing note:', error);
        showToast('Error loading note for editing', 'error');
    }
}

// Handle note submission
async function handleNoteSubmit(e) {
    e.preventDefault();
    const title = elements.noteTitle.value;
    const content = elements.noteContent.value;
    const isPublic = elements.noteIsPublic.checked;

    if (!title || !content) {
        showToast('Title and content are required', 'error');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        formData.append('isPublic', isPublic);
        
        if (elements.noteImage.files[0]) {
            formData.append('image', elements.noteImage.files[0]);
        }

        let response;
        if (state.editingNoteId) {
            // Update existing note
            response = await fetch(`/api/notes/${state.editingNoteId}`, {
                method: 'PUT',
                body: formData
            });
        } else {
            // Create new note
            response = await fetch('/api/notes', {
                method: 'POST',
                body: formData
            });
        }

        if (response.ok) {
            const note = await response.json();
            showToast(
                state.editingNoteId ? 'Note updated successfully' : 'Note created successfully', 
                'success'
            );
            hideModal('noteModal');
            loadPublicNotes();
        } else {
            showToast('Failed to save note', 'error');
        }
    } catch (error) {
        console.error('Error saving note:', error);
        showToast('Error saving note', 'error');
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showToast('Email and password are required', 'error');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const user = await response.json();
            state.currentUser = user;
            state.isLoggedIn = true;
            
            // Store token
            localStorage.setItem('mynotesToken', user.token);
            
            hideModal('loginModal');
            updateUI();
            loadPublicNotes();
            showToast('Login successful!', 'success');
        } else {
            const error = await response.json();
            showToast(error.error || 'Invalid email or password', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Error during login', 'error');
    }
}

// Handle register
async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const bio = document.getElementById('registerBio').value;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
        showToast('All fields are required', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password, bio })
        });

        if (response.ok) {
            const user = await response.json();
            state.currentUser = user;
            state.isLoggedIn = true;
            
            // Store token
            localStorage.setItem('mynotesToken', user.token);
            
            hideModal('registerModal');
            updateUI();
            loadPublicNotes();
            showToast('Registration successful!', 'success');
        } else {
            const error = await response.json();
            showToast(error.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Error during registration', 'error');
    }
}

// Logout function
function logout() {
    localStorage.removeItem('mynotesToken');
    state.currentUser = null;
    state.isLoggedIn = false;
    state.publicNotes = [];
    state.bookmarks = [];
    updateUI();
    renderView();
    showToast('You have been logged out', 'success');
}

// Global functions for HTML onclick
window.showLoginModal = showLoginModal;
window.showRegisterModal = showRegisterModal;