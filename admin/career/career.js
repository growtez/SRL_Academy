let careerData = [];
let isCareerLoading = false;
let isCareerOperationInProgress = false;
let currentCareerId = null;
let careerIdToDelete = null;

function initializeCareer() {
    const searchInput = document.getElementById('searchCareerApplications');
    const tableBody = document.getElementById('careerTableBody');
    const deleteButton = document.getElementById('confirmDeleteCareerButton');

    // Get the new buttons
    const downloadAppBtn = document.getElementById('downloadApplicationButton');
    const downloadResumeBtn = document.getElementById('downloadResumeButton');

    // Configuration - Update these URLs for your Laravel setup
    const API_BASE_URL = 'http://127.0.0.1:8000/api'; // Laravel's default dev server


    if (!tableBody) return;

    if (searchInput) {
        searchInput.addEventListener('input', filterCareerApplications);
    }

    tableBody.addEventListener('click', function (event) {
        const actionButton = event.target.closest('[data-action]');
        if (!actionButton) return;

        const id = parseInt(actionButton.getAttribute('data-id'), 10);
        if (!id) return;

        const action = actionButton.getAttribute('data-action');
        if (action === 'view') {
            openCareerView(id);
        } else if (action === 'delete') {
            openCareerDeleteModal(id);
        }
    });

    attachModalCloseHandlers();

    if (deleteButton) {
        deleteButton.addEventListener('click', deleteCareerApplication);
    }

    // --- NEW BUTTON LOGIC ---

    // 2. Download Application (Generates PDF of the form)
    if (downloadAppBtn) {
        downloadAppBtn.addEventListener('click', function () {
            if (currentCareerId) {
                // Request type 'pdf'
                handleDownloadFile(currentCareerId, 'pdf');
            }
        });
    }

    // 3. Download Resume (Downloads uploaded file)
    if (downloadResumeBtn) {
        downloadResumeBtn.addEventListener('click', function () {
            if (currentCareerId) {
                // Request type 'resume'
                handleDownloadFile(currentCareerId, 'resume');
            }
        });
    }

    loadCareerApplications();
}

// Handles BOTH application PDF and resume downloads by opening the API URL
function handleDownloadFile(id, type) {
    if (!id) return;

    const url = `${API_BASE_URL}/career/${id}/${type}`;
    window.open(url, '_blank');
}

async function loadCareerApplications() {
    if (isCareerLoading) return;
    
    const tableBody = document.getElementById('careerTableBody');
    const emptyState = document.getElementById('careerEmptyState');
    
    isCareerLoading = true;

    // 1. Inject loader into table row
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 3rem;">
                    <div class="loader" style="margin: 0 auto 1rem;"></div>
                    <p style="color: #6b7280;">Loading applications...</p>
                </td>
            </tr>
        `;
        if (emptyState) emptyState.classList.add('hidden');
    }

    try {
        const response = await apiCall('/career');

        if (Array.isArray(response)) {
            careerData = response;
        } else if (response && Array.isArray(response.data)) {
            careerData = response.data;
        } else {
            careerData = [];
        }
        renderCareerList();
    } catch (error) {
        console.error('Error loading career applications:', error);
        careerData = [];
        renderCareerList();
        if (typeof showNotification === 'function') showNotification('Failed to load data', 'error');
    } finally {
        isCareerLoading = false;
    }
}

function renderCareerList(filteredData) {
    const tableBody = document.getElementById('careerTableBody');
    const emptyState = document.getElementById('careerEmptyState');
    if (!tableBody || !emptyState) return;

    const data = filteredData || careerData;

    if (!data || data.length === 0) {
        tableBody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');

    const rowsHtml = data.map(item => {
        const id = item.id;
        const name = escapeHtml(item.full_name || '');
        const subjects = escapeHtml(item.subjects || '-');
        const experience = escapeHtml(item.experience || '-');
        const date = formatDate(item.created_at || item.application_date);

        return `
            <tr data-id="${id}">
                <td>${name}</td>
                <td>${subjects}</td>
                <td>${experience}</td>
                <td>${date}</td>
                <td>
                    <div class="career-actions">
                        <button type="button" class="btn btn-outline btn-sm" data-action="view" data-id="${id}">
                            <span class="material-symbols-outlined">visibility</span> View
                        </button>
                        <button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="${id}">
                            <span class="material-symbols-outlined">delete</span> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = rowsHtml;
}

function filterCareerApplications() {
    const input = document.getElementById('searchCareerApplications');
    if (!input) return;
    const term = input.value.trim().toLowerCase();

    if (!term) {
        renderCareerList();
        return;
    }

    const filtered = careerData.filter(item => {
        const name = (item.full_name || '').toLowerCase();
        const email = (item.email || '').toLowerCase();
        const subjects = (item.subjects || '').toLowerCase();
        return name.includes(term) || email.includes(term) || subjects.includes(term);
    });
    renderCareerList(filtered);
}

function openCareerView(id) {
    const item = getCareerById(id);
    if (!item) return;

    currentCareerId = id;

    // Header Info
    setTextContent('detailFullNameHeader', item.full_name);
    setTextContent('detailSubjectsHeader', item.subjects || 'Educator Applicant');
    setTextContent('detailAppliedDate', formatDate(item.created_at));

    // Photo
    const photoImg = document.getElementById('detailPhoto');
    const photoPlaceholder = document.getElementById('detailPhotoPlaceholder');
    if (item.photo_url) {
        photoImg.src = item.photo_url;
        photoImg.classList.remove('hidden');
        photoPlaceholder.classList.add('hidden');
    } else {
        photoImg.classList.add('hidden');
        photoPlaceholder.classList.remove('hidden');
    }

    // Populate Fields
    setTextContent('detailFullName', item.full_name);
    setTextContent('detailEmail', item.email);
    setTextContent('detailPhone', item.phone);
    setTextContent('detailDob', formatDate(item.dob));
    setTextContent('detailGender', item.gender);
    setTextContent('detailExperience', item.experience);
    setTextContent('detailSalary', item.current_salary);
    setTextContent('detailNoticePeriod', item.available_days);
    setTextContent('detailSource', item.job_source);
    setTextContent('detailHomeState', item.home_state);
    setTextContent('detailHomeDistrict', item.home_district);
    setTextContent('detailCurrentLocation', item.current_location);
    setTextContent('detailSubjects', item.subjects);
    setTextContent('detailClasses', item.classes);
    setTextContent('detailAbout', item.about_yourself);

    // Lists
    const eduContainer = document.getElementById('detailEducationList');
    if (eduContainer) {
        if (item.education && item.education.length > 0) {
            eduContainer.innerHTML = item.education.map(edu => `
                <div class="list-entry-block">
                    <div class="list-entry-title">${escapeHtml(edu.qualification)}</div>
                    <div class="list-entry-subtitle">${escapeHtml(edu.college_name)}</div>
                    <div class="list-entry-grid">
                        <span><strong>Graduated:</strong> ${escapeHtml(edu.graduation_year)}</span>
                    </div>
                </div>
            `).join('');
        } else {
            eduContainer.innerHTML = '<p class="text-muted" style="padding:10px;">No education details provided.</p>';
        }
    }

    const workContainer = document.getElementById('detailWorkList');
    if (workContainer) {
        if (item.work_experience && item.work_experience.length > 0) {
            workContainer.innerHTML = item.work_experience.map(work => `
                <div class="list-entry-block">
                    <div class="list-entry-title">${escapeHtml(work.job_title)}</div>
                    <div class="list-entry-subtitle">${escapeHtml(work.organization_name)}</div>
                    <div class="list-entry-grid">
                        <span><strong>Duration:</strong> ${formatDate(work.joining_date)} - ${work.currently_working ? 'Present' : formatDate(work.relieving_date)}</span>
                        <span><strong>Location:</strong> ${escapeHtml(work.work_location)}</span>
                    </div>
                </div>
            `).join('');
        } else {
            workContainer.innerHTML = '<p class="text-muted" style="padding:10px;">No work experience listed.</p>';
        }
    }

    const modal = document.getElementById('careerViewModal');
    if (modal) modal.classList.remove('hidden');
}

function openCareerDeleteModal(id) {
    const item = getCareerById(id);
    if (!item) return;
    careerIdToDelete = id;

    const info = document.getElementById('deleteCareerInfo');
    if (info) {
        info.innerHTML = `<h4>${escapeHtml(item.full_name)}</h4><p>Applied: ${formatDate(item.created_at)}</p>`;
    }
    const modal = document.getElementById('careerDeleteModal');
    if (modal) modal.classList.remove('hidden');
}

async function deleteCareerApplication() {
    if (!careerIdToDelete || isCareerOperationInProgress) return;
    isCareerOperationInProgress = true;
    try {
        if (typeof showLoading === 'function') showLoading();
        await apiCall('/career/' + careerIdToDelete, { method: 'DELETE' });

        if (typeof showNotification === 'function') showNotification('Deleted successfully', 'success');

        closeModal('careerDeleteModal');
        careerIdToDelete = null;
        setTimeout(loadCareerApplications, 300);
    } catch (error) {
        console.error(error);
        if (typeof showNotification === 'function') showNotification('Delete failed', 'error');
    } finally {
        isCareerOperationInProgress = false;
        if (typeof hideLoading === 'function') hideLoading();
    }
}

function attachModalCloseHandlers() {
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.getAttribute('data-close-modal')));
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => closeModal(overlay.closest('.modal').id));
    });
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
    if (modalId === 'careerDeleteModal') careerIdToDelete = null;
}

function getCareerById(id) {
    return careerData.find(item => Number(item.id) === Number(id));
}

function setTextContent(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = (value === null || value === undefined || value === '') ? '-' : String(value);
}

function formatDate(val) {
    if (!val) return '-';
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toLocaleDateString();
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

initializeCareer();