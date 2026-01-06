// Faculty Management JavaScript
let facultyData = [];
let editingFacultyId = null;
let isLoading = false;
let isOperationInProgress = false;

// Debounce Utility for Search
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Initializer called from admin.html
function initializeFaculty() {
    console.log('Initializing faculty module');
    
    // Check if we already bound listeners to prevent duplicates
    if (document.getElementById('facultyList')?.dataset.initialized === 'true') {
        // Just reload data if coming back to tab
        loadFaculty(); 
        return;
    }

    setupEventListeners();
    loadFaculty();
    
    // Mark as initialized
    const list = document.getElementById('facultyList');
    if(list) list.dataset.initialized = 'true';
}

function setupEventListeners() {
    const addBtn = document.getElementById('addFacultyBtn');
    const form = document.getElementById('facultyForm');
    const saveBtn = document.getElementById('saveFacultyBtn');
    const searchInput = document.getElementById('searchFaculty');
    const statusFilter = document.getElementById('statusFilter');
    const photoInput = document.getElementById('photo');

    // Clean Event Binding (No Cloning needed if we check flags)
    if (addBtn && !addBtn.dataset.bound) {
        addBtn.addEventListener('click', openAddFacultyModal);
        addBtn.dataset.bound = 'true';
    }

    if (form && !form.dataset.bound) {
        form.addEventListener('submit', handleFacultySubmit);
        form.dataset.bound = 'true';
    }

    if (saveBtn && !saveBtn.dataset.bound) {
        // Optional: The form submit handles this, but if button is outside form:
        saveBtn.addEventListener('click', (e) => {
            // Only trigger if button type is not submit, otherwise it submits twice
            if(saveBtn.type !== 'submit') handleFacultySubmit(e);
        });
        saveBtn.dataset.bound = 'true';
    }

    if (searchInput && !searchInput.dataset.bound) {
        // Debounce search by 300ms
        searchInput.addEventListener('input', debounce(filterFaculty, 300));
        searchInput.dataset.bound = 'true';
    }

    if (statusFilter && !statusFilter.dataset.bound) {
        statusFilter.addEventListener('change', filterFaculty);
        statusFilter.dataset.bound = 'true';
    }

    if (photoInput && !photoInput.dataset.bound) {
        photoInput.addEventListener('change', handlePhotoPreview);
        photoInput.dataset.bound = 'true';
    }
}

async function loadFaculty() {
    if (isLoading) return;

    isLoading = true;
    showLoading();

    try {
        const response = await apiCall('/admin/faculty');
        
        if (response.data) {
            facultyData = Array.isArray(response.data) ? response.data : [];
        } else {
            facultyData = Array.isArray(response) ? response : [];
        }
        
        renderFacultyList();
    } catch (error) {
        console.error('Error loading faculty:', error);
        showNotification('Failed to load faculty members', 'error');
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
    
    if (!facultyList || !emptyState) return;

    const data = filteredData || facultyData;

    if (data.length === 0) {
        facultyList.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    // Use map and join for efficient rendering
    facultyList.innerHTML = data.map(faculty => {
        let photoUrl = '';
        if (faculty.photo_url) {
            photoUrl = faculty.photo_url.startsWith('http') 
                ? faculty.photo_url 
                : `${API_BASE_URL.replace('/api', '')}/${faculty.photo_url.replace(/^\//, '')}`;
        }

        // Fallback image logic handled inline for simplicity in template literal
        const imgHtml = photoUrl
            ? `<img src="${photoUrl}" alt="${escapeHtml(faculty.name)}" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'material-symbols-outlined\\'>person</span>'">`
            : `<span class="material-symbols-outlined">person</span>`;

        return `
        <div class="faculty-card ${!faculty.is_active ? 'inactive' : ''}" data-id="${faculty.id}">
            <div class="faculty-photo">
                ${imgHtml}
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
    
    if (!searchInput || !statusFilter) return;

    const searchTerm = searchInput.value.toLowerCase().trim();
    const statusFilterValue = statusFilter.value;

    const filtered = facultyData.filter(faculty => {
        const matchesSearch = !searchTerm ||
            faculty.name.toLowerCase().includes(searchTerm) ||
            faculty.department.toLowerCase().includes(searchTerm);

        const matchesStatus = statusFilterValue === '' ||
            (faculty.is_active ? '1' : '0') === statusFilterValue;

        return matchesSearch && matchesStatus;
    });

    renderFacultyList(filtered);
}

// --- CRUD Operations ---

function openAddFacultyModal() {
    editingFacultyId = null;
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('facultyForm');
    const photoPreview = document.getElementById('photoPreview');
    
    if (modalTitle) modalTitle.textContent = 'Add Faculty Member';
    if (form) form.reset();
    if (photoPreview) photoPreview.classList.add('hidden');
    
    clearFormErrors();
    toggleModal('facultyModal', true);
}

async function editFaculty(id) {
    if (isOperationInProgress) return;

    try {
        showLoading();
        isOperationInProgress = true;
        
        // Find locally first to save an API call (Optional, but faster UX)
        let faculty = facultyData.find(f => f.id === id);
        
        if (!faculty) {
            const response = await apiCall(`/admin/faculty/${id}`);
            faculty = response.data || response;
        }

        editingFacultyId = id;
        document.getElementById('modalTitle').textContent = 'Edit Faculty Member';
        document.getElementById('name').value = faculty.name || '';
        document.getElementById('department').value = faculty.department || '';
        document.getElementById('description').value = faculty.description || '';
        document.getElementById('is_active').checked = !!faculty.is_active;

        // Handle Photo Preview
        const photoPreview = document.getElementById('photoPreview');
        const previewImg = photoPreview?.querySelector('img');
        
        if (faculty.photo_url) {
            let photoUrl = faculty.photo_url.startsWith('http') 
                ? faculty.photo_url 
                : `${API_BASE_URL.replace('/api', '')}/${faculty.photo_url.replace(/^\//, '')}`;
            
            if (photoPreview && previewImg) {
                photoPreview.classList.remove('hidden');
                previewImg.src = photoUrl;
            }
        } else {
            if (photoPreview) photoPreview.classList.add('hidden');
        }

        clearFormErrors();
        toggleModal('facultyModal', true);
        
    } catch (error) {
        console.error(error);
        showNotification('Failed to load faculty details', 'error');
    } finally {
        isOperationInProgress = false;
        hideLoading();
    }
}

async function handleFacultySubmit(e) {
    e.preventDefault();
    if (isOperationInProgress) return;

    isOperationInProgress = true;

    try {
        const name = document.getElementById('name').value.trim();
        const department = document.getElementById('department').value.trim();
        const description = document.getElementById('description').value.trim();
        const isActive = document.getElementById('is_active').checked;
        const photoInput = document.getElementById('photo');

        if (!name || !department || !description) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('department', department);
        formData.append('description', description);
        formData.append('is_active', isActive ? '1' : '0');

        if (photoInput && photoInput.files[0]) {
            formData.append('photo', photoInput.files[0]);
        }

        // Method spoofing for Laravel if editing
        if (editingFacultyId) formData.append('_method', 'POST'); 
        // Note: Usually Update is PUT/PATCH, but FormData with files often requires POST 
        // combined with _method field in PHP frameworks.

        showLoading();

        const endpoint = editingFacultyId 
            ? `/admin/faculty/${editingFacultyId}` 
            : '/admin/faculty';
            
        // Always POST when sending FormData with files in many frameworks
        const response = await apiCall(endpoint, {
            method: 'POST',
            body: formData
        });

        showNotification(response.message || 'Saved successfully', 'success');
        closeFacultyModal();
        loadFaculty(); // Reload list

    } catch (error) {
        console.error(error);
        if (error.errors) {
            displayFormErrors(error.errors);
            showNotification('Please fix the form errors', 'error');
        } else {
            showNotification(error.message || 'Failed to save', 'error');
        }
    } finally {
        isOperationInProgress = false;
        hideLoading();
    }
}

async function toggleFacultyStatus(id) {
    if (isOperationInProgress) return;
    isOperationInProgress = true;

    try {
        showLoading();
        await apiCall(`/admin/faculty/${id}/toggle-status`, { method: 'PATCH' });
        showNotification('Status updated', 'success');
        
        // Optimistic update locally
        const f = facultyData.find(i => i.id === id);
        if(f) f.is_active = !f.is_active;
        renderFacultyList(); // Re-render without network call if possible, or call loadFaculty()

    } catch (error) {
        showNotification('Failed to update status', 'error');
        loadFaculty(); // Revert on error
    } finally {
        isOperationInProgress = false;
        hideLoading();
    }
}

function deleteFaculty(id) {
    const faculty = facultyData.find(f => f.id === id);
    if (!faculty) return;

    document.getElementById('deleteFacultyInfo').innerHTML = `
        <h4>${escapeHtml(faculty.name)}</h4>
        <p><strong>Department:</strong> ${escapeHtml(faculty.department)}</p>
    `;
    window.facultyToDeleteId = id;
    toggleModal('deleteModal', true);
}

async function confirmDelete() {
    const id = window.facultyToDeleteId;
    if (!id || isOperationInProgress) return;

    isOperationInProgress = true;
    showLoading();

    try {
        await apiCall(`/admin/faculty/${id}`, { method: 'DELETE' });
        showNotification('Faculty member deleted', 'success');
        closeDeleteModal();
        
        // Remove locally
        facultyData = facultyData.filter(f => f.id !== id);
        renderFacultyList();
        
    } catch (error) {
        showNotification(error.message || 'Delete failed', 'error');
        loadFaculty();
    } finally {
        isOperationInProgress = false;
        hideLoading();
    }
}

// --- Helpers ---

function handlePhotoPreview(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        showNotification('File too large (>2MB)', 'error');
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
        const preview = document.getElementById('photoPreview');
        const img = preview.querySelector('img');
        if (preview && img) {
            preview.classList.remove('hidden');
            img.src = ev.target.result;
        }
    };
    reader.readAsDataURL(file);
}

function removePhoto() {
    document.getElementById('photo').value = '';
    document.getElementById('photoPreview').classList.add('hidden');
}

function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    if (show) {
        modal.classList.remove('hidden');
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    } else {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function closeFacultyModal() {
    toggleModal('facultyModal', false);
    document.getElementById('facultyForm').reset();
    editingFacultyId = null;
    clearFormErrors();
    removePhoto();
}

function closeDeleteModal() {
    toggleModal('deleteModal', false);
    window.facultyToDeleteId = null;
}

function clearFormErrors() {
    document.querySelectorAll('.error-text').forEach(el => el.textContent = '');
    document.querySelectorAll('.form-group input').forEach(el => el.style.borderColor = '');
}

function displayFormErrors(errors) {
    clearFormErrors();
    Object.keys(errors).forEach(field => {
        const input = document.getElementById(field);
        const errorText = input?.closest('.form-group')?.querySelector('.error-text');
        if (input && errorText) {
            input.style.borderColor = 'var(--danger)';
            errorText.textContent = Array.isArray(errors[field]) ? errors[field][0] : errors[field];
        }
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}