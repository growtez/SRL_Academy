let careerData = [];
let isCareerLoading = false;
let isCareerOperationInProgress = false;
let currentCareerId = null;
let careerIdToDelete = null;

function initializeCareer() {
    // Configuration - Update this URL for your Laravel setup
    window.API_BASE_URL = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
    const searchInput = document.getElementById('searchCareerApplications');
    const tableBody = document.getElementById('careerTableBody');
    const cardContainer = document.getElementById('careerCardContainer');
    const deleteButton = document.getElementById('confirmDeleteCareerButton');
    const downloadAppBtn = document.getElementById('downloadApplicationButton');
    const downloadResumeBtn = document.getElementById('downloadResumeButton');

    if (!tableBody) {
        console.warn('Career table body not found');
        return;
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterCareerApplications);
    }

    // UPDATED: Shared handler function for both Desktop and Mobile
    const handleApplicationAction = function (event) {
        // 1. Check if an ACTION BUTTON was clicked first
        const actionButton = event.target.closest('[data-action]');

        if (actionButton) {
            const id = parseInt(actionButton.getAttribute('data-id'), 10);
            const action = actionButton.getAttribute('data-action');

            // Stop the click from bubbling up to the row
            event.stopPropagation();

            if (action === 'view') {
                openCareerView(id);
            } else if (action === 'delete') {
                openCareerDeleteModal(id);
            }
            return;
        }

        // 2. If NOT a button, check if the ROW or CARD was clicked
        const rowOrCard = event.target.closest('tr, .application-card');
        if (rowOrCard) {
            const id = parseInt(rowOrCard.getAttribute('data-id'), 10);
            if (id) {
                // Open the View Details Modal
                openCareerView(id);
            }
        }
    };

    // Attach listener to Desktop Table
    tableBody.addEventListener('click', handleApplicationAction);

    // Attach listener to Mobile Card Container
    if (cardContainer) {
        cardContainer.addEventListener('click', handleApplicationAction);
    }

    attachModalCloseHandlers();

    if (deleteButton) {
        deleteButton.addEventListener('click', deleteCareerApplication);
    }

    // --- UPDATED LISTENERS TO PASS THE BUTTON ELEMENT ---

    // Download Application (Generates PDF of the form)
    if (downloadAppBtn) {
        downloadAppBtn.addEventListener('click', function () {
            if (currentCareerId) {
                // Pass 'this' (the button) as the 3rd argument
                handleDownloadFile(currentCareerId, 'pdf', this);
            }
        });
    }

    // Download Resume (Downloads uploaded file)
    if (downloadResumeBtn) {
        downloadResumeBtn.addEventListener('click', function () {
            if (currentCareerId) {
                // Pass 'this' (the button) as the 3rd argument
                handleDownloadFile(currentCareerId, 'resume', this);
            }
        });
    }

    loadCareerApplications();
}

// --- UPDATED DOWNLOAD FUNCTION WITH LOADING STATE ---
async function handleDownloadFile(id, type, btnElement) {
    if (!id) return;
    const token = localStorage.getItem('adminToken');
    if (!token) {
        alert("You are not logged in.");
        return;
    }

    // 1. Save Original Button State
    const originalContent = btnElement ? btnElement.innerHTML : '';
    
    // 2. Set Loading State
    if (btnElement) {
        btnElement.disabled = true;
        btnElement.style.opacity = '0.7';
        btnElement.style.cursor = 'not-allowed';
        // Add a spinner icon
        btnElement.innerHTML = `
            <span class="material-symbols-outlined spin">progress_activity</span> 
            Downloading...
        `;
    }

    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const response = await fetch(`${API_BASE_URL}/career/${id}/${type}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/pdf'
            }
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        // 3. Process the file (Force Download Logic)
        const blob = await response.blob();
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        const fileURL = window.URL.createObjectURL(pdfBlob);
        
        // Create invisible link to trigger "Save As" behavior
        const a = document.createElement('a');
        a.href = fileURL;
        a.download = `${type}_${id}.pdf`; // Ensure extension is .pdf
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        document.body.removeChild(a);
        window.URL.revokeObjectURL(fileURL);

        if (typeof showNotification === 'function') {
            showNotification('Download started successfully', 'success');
        }

    } catch (error) {
        console.error('Error downloading file:', error);
        if (typeof showNotification === 'function') {
            showNotification('Failed to download file', 'error');
        } else {
            alert('Failed to download file');
        }
    } finally {
        // 4. Restore Button State
        if (btnElement) {
            btnElement.innerHTML = originalContent;
            btnElement.disabled = false;
            btnElement.style.opacity = '1';
            btnElement.style.cursor = 'pointer';
        }
    }
}

async function loadCareerApplications() {
    if (isCareerLoading) return;

    const tableBody = document.getElementById('careerTableBody');
    const cardContainer = document.getElementById('careerCardContainer');
    const emptyState = document.getElementById('careerEmptyState');

    isCareerLoading = true;

    // Inject loader into table row
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 3rem;">
                    <div class="loader" style="margin: 0 auto 1rem;"></div>
                    <p style="color: #6b7280;">Loading applications...</p>
                </td>
            </tr>
        `;
        if (cardContainer) cardContainer.innerHTML = '';
        if (emptyState) emptyState.classList.add('hidden');
    }

    try {
        // Ensure apiCall is defined in your main script
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
async function loadCareerApplications() {
    if (isCareerLoading) return;

    const tableBody = document.getElementById('careerTableBody');
    const cardContainer = document.getElementById('careerCardContainer');
    const emptyState = document.getElementById('careerEmptyState');

    isCareerLoading = true;

    // Inject loader into table row
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 3rem;">
                    <div class="loader" style="margin: 0 auto 1rem;"></div>
                    <p style="color: #6b7280;">Loading applications...</p>
                </td>
            </tr>
        `;
        if (cardContainer) cardContainer.innerHTML = '';
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
    const cardContainer = document.getElementById('careerCardContainer');
    const emptyState = document.getElementById('careerEmptyState');
    const countBadge = document.getElementById('totalCareerCount');

    const data = filteredData || careerData;

    // UPDATE THE TOTAL COUNT
    if (countBadge) {
        countBadge.textContent = data.length;
        countBadge.style.display = data.length > 0 ? 'inline-flex' : 'none';
    }

    if (!data || data.length === 0) {
        tableBody.innerHTML = '';
        cardContainer.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');

    /* =====================
       DESKTOP TABLE ROWS
    ====================== */
    const rowsHtml = data.map((item, index) => {
        const id = item.id;
        const name = escapeHtml(item.full_name || '');
        const subjects = escapeHtml(item.subjects || '-');
        const experience = escapeHtml(item.experience || '-');
        const date = formatDate(item.created_at || item.application_date);

        return `
            <tr data-id="${id}" style="cursor: pointer;">
                <td>${data.length - index}</td>
                <td>${name}</td>
                <td>${subjects}</td>
                <td>${experience}</td>
                <td>${date}</td>
                <td>
                    <div class="career-actions">
                        <button type="button" class="btn btn-outline btn-sm" data-action="view" data-id="${id}">
                            <span class="material-symbols-outlined">visibility</span>
                        </button>
                        <button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="${id}">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = rowsHtml;

    /* =====================
       MOBILE / TABLET CARDS
    ====================== */
    const cardsHtml = data.map((item, index) => {
        const id = item.id;
        const name = escapeHtml(item.full_name || '');
        const subjects = escapeHtml(item.subjects || '-');
        const experience = escapeHtml(item.experience || '-');
        const date = formatDate(item.created_at || item.application_date);

        return `
            <div class="application-card" data-id="${id}">
                <div class="row">
                    <span class="label">Sl. No.</span>
                    <span class="value">#${data.length - index}</span>
                </div>
                <div class="row">
                    <span class="label">Name</span>
                    <span class="value">${name}</span>
                </div>
                <div class="row">
                    <span class="label">Subjects</span>
                    <span class="value">${subjects}</span>
                </div>
                <div class="row">
                    <span class="label">Experience</span>
                    <span class="value">${experience}</span>
                </div>
                <div class="row">
                    <span class="label">Date</span>
                    <span class="value">${date}</span>
                </div>

                <div class="card-actions">
                    <button class="btn btn-outline btn-sm"
                        data-action="view"
                        data-id="${id}">
                        <span class="material-symbols-outlined">visibility</span>
                        View
                    </button>

                    <button class="btn btn-danger btn-sm"
                        data-action="delete"
                        data-id="${id}">
                        <span class="material-symbols-outlined">delete</span>
                        Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');

    cardContainer.innerHTML = cardsHtml;
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

    // Personal Information
    setTextContent('detailFullName', item.full_name);
    setTextContent('detailEmail', item.email);
    setTextContent('detailPhone', item.phone);
    setTextContent('detailDob', formatDate(item.dob));
    setTextContent('detailGender', item.gender);

    // Job Information
    setTextContent('detailExperience', item.experience);
    setTextContent('detailSalary', item.current_salary);
    setTextContent('detailNoticePeriod', item.available_days);
    setTextContent('detailSource', item.job_source);
    setTextContent('detailAppliedDate', formatDate(item.created_at));

    // Location Information
    setTextContent('detailHomeState', item.home_state);
    setTextContent('detailHomeDistrict', item.home_district);
    setTextContent('detailCurrentLocation', item.current_location);

    // Teaching Details
    setTextContent('detailSubjects', item.subjects);
    setTextContent('detailClasses', item.classes);
    setTextContent('detailAbout', item.about_yourself);

    // Education List
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
            eduContainer.innerHTML = '<p style="padding:10px; color: #6b7280;">No education details provided.</p>';
        }
    }

    // Work Experience List
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
            workContainer.innerHTML = '<p style="padding:10px; color: #6b7280;">No work experience listed.</p>';
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
        info.innerHTML = `<h4>${escapeHtml(item.full_name)}</h4><p><strong>Applied:</strong> ${formatDate(item.created_at)}</p>`;
    }
    const modal = document.getElementById('careerDeleteModal');
    if (modal) modal.classList.remove('hidden');
}

async function deleteCareerApplication() {
    if (!careerIdToDelete || isCareerOperationInProgress) return;

    // Get the button and save original content
    const deleteBtn = document.getElementById('confirmDeleteCareerButton');
    const originalContent = deleteBtn ? deleteBtn.innerHTML : 'Delete';

    isCareerOperationInProgress = true;

    // Set Loading State on Button
    if (deleteBtn) {
        deleteBtn.innerHTML = '<span class="material-symbols-outlined spin">progress_activity</span> Deleting...';
        deleteBtn.disabled = true;
        deleteBtn.style.opacity = '0.7';
        deleteBtn.style.cursor = 'not-allowed';
    }

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

        // Restore Button State
        if (deleteBtn) {
            deleteBtn.innerHTML = originalContent;
            deleteBtn.disabled = false;
            deleteBtn.style.opacity = '1';
            deleteBtn.style.cursor = 'pointer';
        }

        if (typeof hideLoading === 'function') hideLoading();
    }
}

function attachModalCloseHandlers() {
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.getAttribute('data-close-modal')));
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            const modal = overlay.closest('.modal');
            if (modal && modal.id) closeModal(modal.id);
        });
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