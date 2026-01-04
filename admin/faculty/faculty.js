// Faculty Management JavaScript
let facultyData = [];
let editingFacultyId = null;
let isInitialized = false;
let isLoading = false;
let initializationAttempts = 0;
let isOperationInProgress = false; // Prevent multiple operations

// Explicit initializer called from admin.html after faculty.html is injected
function initializeFaculty() {
    console.log('Initializing faculty module');

    const addBtn = document.getElementById('addFacultyBtn');
    const form = document.getElementById('facultyForm');
    const saveBtn = document.getElementById('saveFacultyBtn');

    console.log('initializeFaculty elements:', {
        hasAddBtn: !!addBtn,
        hasForm: !!form,
        hasSaveBtn: !!saveBtn
    });

    if (!addBtn || !form) {
        console.warn('Faculty DOM elements not found, cannot initialize');
        return;
    }

    setupEventListeners();
    loadFaculty();
}

function setupEventListeners() {
    console.log('Setting up faculty event listeners');

    // Add faculty button
    const addBtn = document.getElementById('addFacultyBtn');
    if (addBtn) {
        // Remove existing listener to prevent duplicates
        const newAddBtn = addBtn.cloneNode(true);
        addBtn.parentNode.replaceChild(newAddBtn, addBtn);
        newAddBtn.addEventListener('click', openAddFacultyModal);
        console.log('Bound click handler to addFacultyBtn');
    } else {
        console.warn('addFacultyBtn not found when setting up listeners');
    }

    // Faculty form submission
    const form = document.getElementById('facultyForm');
    if (form) {
        form.removeEventListener('submit', handleFacultySubmit);
        form.addEventListener('submit', handleFacultySubmit);
        console.log('Bound submit handler to facultyForm');
    } else {
        console.warn('facultyForm not found when setting up listeners');
    }

    // Save button click handler
    const saveBtn = document.getElementById('saveFacultyBtn');
    if (saveBtn) {
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Save Faculty button clicked');
            handleFacultySubmit(e);
        });
        console.log('Bound click handler to saveFacultyBtn');
    } else {
        console.warn('saveFacultyBtn not found when setting up listeners');
    }

    // Search and filter
    const searchInput = document.getElementById('searchFaculty');
    const statusFilter = document.getElementById('statusFilter');
    if (searchInput) {
        searchInput.addEventListener('input', filterFaculty);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', filterFaculty);
    }

    // Photo input change
    const photoInput = document.getElementById('photo');
    if (photoInput) {
        photoInput.addEventListener('change', handlePhotoPreview);
    }
}

async function loadFaculty() {
    if (isLoading) {
        console.log('Already loading faculty, skipping...');
        return;
    }

    if (!document.getElementById('facultyList')) {
        console.log('Faculty list element not found, skipping load');
        return;
    }

    isLoading = true;
    console.log('Loading faculty data...');

    try {
        showLoading();
        const response = await apiCall('/admin/faculty');
        
        // Handle different response structures
        if (response.data) {
            facultyData = Array.isArray(response.data) ? response.data : [];
        } else if (Array.isArray(response)) {
            facultyData = response;
        } else {
            facultyData = [];
        }
        
        renderFacultyList();
        console.log('Faculty data loaded successfully:', facultyData.length, 'items');
    } catch (error) {
        console.error('Error loading faculty:', error);
        showNotification('Failed to load faculty members: ' + error.message, 'error');
        facultyData = [];
        renderFacultyList();
    } finally {
        isLoading = false;
        hideLoading();
    }
}

function renderFacultyList(filteredData = null) {
    const facultyList = document.getElementById('facultyList');
    const emptyState = document.getElementById('emptyState');
    const data = filteredData || facultyData;

    if (!facultyList || !emptyState) {
        console.error('Faculty list or empty state element not found');
        return;
    }

    if (data.length === 0) {
        facultyList.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    facultyList.innerHTML = data.map(faculty => {
        // Construct proper photo URL
        let photoUrl = '';
        if (faculty.photo_url) {
            // If it's already a full URL, use it as is
            if (faculty.photo_url.startsWith('http')) {
                photoUrl = faculty.photo_url;
            } else {
                // Otherwise, construct the full URL
                const baseUrl = API_BASE_URL.replace('/api', '');
                photoUrl = faculty.photo_url.startsWith('/') 
                    ? `${baseUrl}${faculty.photo_url}` 
                    : `${baseUrl}/${faculty.photo_url}`;
            }
        }

        console.log('Faculty:', faculty.name, 'Photo URL:', photoUrl);

        return `
        <div class="faculty-card ${!faculty.is_active ? 'inactive' : ''}" data-id="${faculty.id}">
            <div class="faculty-photo">
                ${photoUrl
                ? `<img src="${photoUrl}" alt="${faculty.name}" onerror="console.error('Image failed to load:', this.src); this.parentElement.innerHTML='<span class=\\'material-symbols-outlined\\'>person</span>'">`
                : `<span class="material-symbols-outlined">person</span>`
            }
            </div>
            <div class="faculty-info">
                <h3 class="faculty-name">${escapeHtml(faculty.name)}</h3>
                <div class="faculty-department">
                    <span class="material-symbols-outlined">business</span>
                    ${escapeHtml(faculty.department)}
                </div>
                <p class="faculty-description">${escapeHtml(faculty.description)}</p>
                <span class="faculty-status ${faculty.is_active ? 'status-active' : 'status-inactive'}">
                    <span class="material-symbols-outlined">${faculty.is_active ? 'check_circle' : 'cancel'}</span>
                    ${faculty.is_active ? 'Active' : 'Inactive'}
                </span>
                <div class="faculty-actions">
                    <button class="btn btn-outline btn-sm" onclick="editFaculty(${faculty.id})">
                        <span class="material-symbols-outlined">edit</span>
                        Edit
                    </button>
                    <button class="btn btn-${faculty.is_active ? 'warning' : 'success'} btn-sm" onclick="toggleFacultyStatus(${faculty.id})">
                        <span class="material-symbols-outlined">${faculty.is_active ? 'visibility_off' : 'visibility'}</span>
                        ${faculty.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteFaculty(${faculty.id})">
                        <span class="material-symbols-outlined">delete</span>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    `;
    }).join('');
}

function filterFaculty() {
    const searchInput = document.getElementById('searchFaculty');
    const statusFilter = document.getElementById('statusFilter');
    
    if (!searchInput || !statusFilter) {
        console.warn('Search or filter elements not found');
        return;
    }

    const searchTerm = searchInput.value.toLowerCase();
    const statusFilterValue = statusFilter.value;

    const filtered = facultyData.filter(faculty => {
        const matchesSearch = !searchTerm ||
            faculty.name.toLowerCase().includes(searchTerm) ||
            faculty.department.toLowerCase().includes(searchTerm) ||
            faculty.description.toLowerCase().includes(searchTerm);

        const matchesStatus = statusFilterValue === '' ||
            (faculty.is_active ? '1' : '0') === statusFilterValue;

        return matchesSearch && matchesStatus;
    });

    renderFacultyList(filtered);
}

function openAddFacultyModal() {
    editingFacultyId = null;
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('facultyForm');
    const photoPreview = document.getElementById('photoPreview');
    
    if (modalTitle) modalTitle.textContent = 'Add Faculty Member';
    if (form) form.reset();
    if (photoPreview) photoPreview.classList.add('hidden');
    
    clearFormErrors();
    
    const modal = document.getElementById('facultyModal');
    if (modal) modal.classList.remove('hidden');
}

async function editFaculty(id) {
    if (isOperationInProgress) {
        console.log('Operation already in progress, skipping...');
        return;
    }

    try {
        showLoading();
        isOperationInProgress = true;
        console.log('Loading faculty for edit, ID:', id);
        
        const response = await apiCall(`/admin/faculty/${id}`);
        const faculty = response.data || response;
        console.log('Faculty data received:', faculty);

        editingFacultyId = id;
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) modalTitle.textContent = 'Edit Faculty Member';

        // Check if elements exist before trying to populate them
        const nameField = document.getElementById('name');
        const departmentField = document.getElementById('department');
        const descriptionField = document.getElementById('description');
        const activeField = document.getElementById('is_active');

        if (!nameField || !departmentField || !descriptionField || !activeField) {
            throw new Error('Form elements not found in DOM');
        }

        // Populate form
        nameField.value = faculty.name || '';
        departmentField.value = faculty.department || '';
        descriptionField.value = faculty.description || '';
        activeField.checked = faculty.is_active ? true : false;

        // Show photo preview if exists
        if (faculty.photo_url) {
            const photoPreview = document.getElementById('photoPreview');
            const previewImg = photoPreview?.querySelector('img');
            
            if (photoPreview && previewImg) {
                // Construct proper photo URL
                let photoUrl = faculty.photo_url;
                if (!photoUrl.startsWith('http')) {
                    const baseUrl = API_BASE_URL.replace('/api', '');
                    photoUrl = photoUrl.startsWith('/') 
                        ? `${baseUrl}${photoUrl}` 
                        : `${baseUrl}/${photoUrl}`;
                }
                
                photoPreview.classList.remove('hidden');
                previewImg.src = photoUrl;
            }
        } else {
            const photoPreview = document.getElementById('photoPreview');
            if (photoPreview) photoPreview.classList.add('hidden');
        }

        clearFormErrors();
        const modal = document.getElementById('facultyModal');
        if (modal) modal.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading faculty:', error);
        showNotification('Failed to load faculty member: ' + error.message, 'error');
    } finally {
        isOperationInProgress = false;
        hideLoading();
    }
}

async function handleFacultySubmit(e) {
    e.preventDefault();
    console.log('Form submission started');

    if (isOperationInProgress) {
        console.log('Operation already in progress, skipping...');
        return;
    }

    isOperationInProgress = true;
    console.log('Operation in progress set to true');

    try {
        // Get form values
        const nameField = document.getElementById('name');
        const departmentField = document.getElementById('department');
        const descriptionField = document.getElementById('description');
        const activeField = document.getElementById('is_active');

        if (!nameField || !departmentField || !descriptionField || !activeField) {
            throw new Error('Form fields not found');
        }

        const name = nameField.value.trim();
        const department = departmentField.value.trim();
        const description = descriptionField.value.trim();
        const isActive = activeField.checked;

        // Client-side validation
        if (!name || !department || !description) {
            showNotification('Please fill in all required fields', 'error');
            isOperationInProgress = false;
            return;
        }

        console.log('Form values:', { name, department, description, isActive });

        const formData = new FormData();
        formData.append('name', name);
        formData.append('department', department);
        formData.append('description', description);
        formData.append('is_active', isActive ? '1' : '0');

        // Add photo if selected
        const photoInput = document.getElementById('photo');
        if (photoInput && photoInput.files[0]) {
            console.log('Photo file found:', photoInput.files[0].name);
            formData.append('photo', photoInput.files[0]);
        } else {
            console.log('No photo file found');
        }

        // If editing, some Laravel backends expect a _method field for PUT
        if (editingFacultyId) {
            formData.append('_method', 'POST');
        }

        showLoading();
        console.log('Loading shown, making API call...');

        const endpoint = editingFacultyId 
            ? `/admin/faculty/${editingFacultyId}` 
            : '/admin/faculty';
        
        // Use POST for both create and update (Laravel will see _method=PUT for updates)
        const method = 'POST';
        
        console.log('API endpoint:', endpoint);
        console.log('Method:', method);
        console.log('Is editing:', !!editingFacultyId);

        const response = await apiCall(endpoint, {
            method: method,
            body: formData
        });

        console.log('API response received:', response);

        showNotification(response.message || 'Faculty member saved successfully', 'success');
        closeFacultyModal();

        // Add a small delay before reload to prevent rapid calls
        setTimeout(() => {
            console.log('Reloading faculty list...');
            loadFaculty();
        }, 500);

    } catch (error) {
        console.error('Error in form submission:', error);
        
        // Handle validation errors
        if (error.errors) {
            displayFormErrors(error.errors);
            showNotification('Please fix the form errors', 'error');
        } else {
            showNotification(error.message || 'Failed to save faculty member', 'error');
        }
    } finally {
        isOperationInProgress = false;
        hideLoading();
        console.log('Operation completed, cleanup done');
    }
}

async function toggleFacultyStatus(id) {
    if (isOperationInProgress) {
        console.log('Operation already in progress, skipping...');
        return;
    }

    isOperationInProgress = true;

    try {
        showLoading();
        const response = await apiCall(`/admin/faculty/${id}/toggle-status`, {
            method: 'PATCH'
        });

        showNotification(response.message || 'Faculty status updated successfully', 'success');

        // Add delay before reload
        setTimeout(() => {
            loadFaculty();
        }, 300);

    } catch (error) {
        console.error('Error toggling status:', error);
        showNotification(error.message || 'Failed to update faculty status', 'error');
    } finally {
        isOperationInProgress = false;
        hideLoading();
    }
}

function deleteFaculty(id) {
    const faculty = facultyData.find(f => f.id === id);
    if (!faculty) {
        console.error('Faculty not found:', id);
        return;
    }

    // Show delete confirmation modal
    const deleteFacultyInfo = document.getElementById('deleteFacultyInfo');
    if (deleteFacultyInfo) {
        deleteFacultyInfo.innerHTML = `
            <h4>${escapeHtml(faculty.name)}</h4>
            <p><strong>Department:</strong> ${escapeHtml(faculty.department)}</p>
            <p><strong>Status:</strong> ${faculty.is_active ? 'Active' : 'Inactive'}</p>
        `;
    }

    // Store the ID for deletion
    window.facultyToDeleteId = id;
    
    const deleteModal = document.getElementById('deleteModal');
    if (deleteModal) deleteModal.classList.remove('hidden');
}

async function confirmDelete() {
    const id = window.facultyToDeleteId;
    if (!id) {
        console.error('No faculty ID to delete');
        return;
    }

    if (isOperationInProgress) {
        console.log('Operation already in progress, skipping...');
        return;
    }

    isOperationInProgress = true;

    try {
        showLoading();
        const response = await apiCall(`/admin/faculty/${id}`, {
            method: 'DELETE'
        });

        showNotification(response.message || 'Faculty member deleted successfully', 'success');
        closeDeleteModal();

        // Add delay before reload
        setTimeout(() => {
            loadFaculty();
        }, 300);

    } catch (error) {
        console.error('Error deleting faculty:', error);
        showNotification(error.message || 'Failed to delete faculty member', 'error');
    } finally {
        isOperationInProgress = false;
        hideLoading();
    }
}

function handlePhotoPreview(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showNotification('Invalid file type. Please select a valid image file (JPEG, PNG, GIF, WebP).', 'error');
        e.target.value = '';
        return;
    }

    // Validate file size (2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
        showNotification('File size must be less than 2MB', 'error');
        e.target.value = '';
        return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = function (e) {
        const photoPreview = document.getElementById('photoPreview');
        const previewImg = photoPreview?.querySelector('img');
        
        if (photoPreview && previewImg) {
            photoPreview.classList.remove('hidden');
            previewImg.src = e.target.result;
        }
    };
    reader.onerror = function() {
        showNotification('Failed to read file', 'error');
    };
    reader.readAsDataURL(file);
}

function removePhoto() {
    const photoInput = document.getElementById('photo');
    const photoPreview = document.getElementById('photoPreview');
    
    if (photoInput) photoInput.value = '';
    if (photoPreview) photoPreview.classList.add('hidden');
}

function closeFacultyModal() {
    const modal = document.getElementById('facultyModal');
    const form = document.getElementById('facultyForm');
    const photoInput = document.getElementById('photo');
    const photoPreview = document.getElementById('photoPreview');
    
    if (modal) modal.classList.add('hidden');
    if (form) form.reset();
    if (photoInput) photoInput.value = '';
    if (photoPreview) photoPreview.classList.add('hidden');
    
    editingFacultyId = null;
    clearFormErrors();
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (modal) modal.classList.add('hidden');
    window.facultyToDeleteId = null;
}

function clearFormErrors() {
    document.querySelectorAll('.error-text').forEach(el => el.textContent = '');
    document.querySelectorAll('.form-group input, .form-group textarea').forEach(el => {
        el.style.borderColor = '';
    });
}

function displayFormErrors(errors) {
    clearFormErrors();

    Object.keys(errors).forEach(field => {
        const input = document.getElementById(field);
        const errorText = input?.parentElement?.querySelector('.error-text');

        if (input && errorText) {
            input.style.borderColor = 'var(--danger)';
            errorText.textContent = Array.isArray(errors[field]) 
                ? errors[field][0] 
                : errors[field];
        }
    });
}

// Utility function to escape HTML and prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Loading functions (reuse from main admin.js)
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
}

// Notification function (reuse from main admin.js)
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}