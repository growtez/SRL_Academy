// Global State Variables
let schoolProjectsData = [];
let isSchoolProjectsLoading = false;
let isSchoolProjectsOperationInProgress = false;
let currentSchoolProjectId = null;
let schoolProjectIdToDelete = null;
let isPdfOpening = false;

function initializeSchoolIntegration() {
    // --- 1. RESET STATE (Fixes "Table not refreshing" bug) ---
    // Every time this tab is initialized, we reset these flags to ensure
    // the data fetch can run again, even if it was interrupted previously.
    isSchoolProjectsLoading = false;
    isPdfOpening = false;
    isSchoolProjectsOperationInProgress = false;

    // --- 2. SELECT ELEMENTS ---
    const searchInput = document.getElementById('searchSchoolProjects');
    const tableBody = document.getElementById('schoolProjectsTableBody');
    const cardContainer = document.getElementById('schoolProjectsCardContainer');
    const deleteButton = document.getElementById('confirmDeleteSchoolProjectButton');
    const viewPdfButton = document.getElementById('viewPdfButton');

    // Safety Check: If the table doesn't exist (DOM not ready), stop.
    if (!tableBody) {
        // console.warn('School projects table body not found - DOM might not be ready.');
        return;
    }

    if (searchInput) {
        searchInput.value = ''; // Clear search on reload
        searchInput.removeEventListener('input', filterSchoolProjects); // Remove old listener
        searchInput.addEventListener('input', filterSchoolProjects);
    }

    // --- 3. DEFINE ACTION HANDLER ---
    const handleProjectAction = function (event) {
        // A. Check for Buttons (Delete/PDF)
        const actionButton = event.target.closest('[data-action]');
        if (actionButton) {
            const id = parseInt(actionButton.getAttribute('data-id'), 10);
            const action = actionButton.getAttribute('data-action');

            event.stopPropagation(); // Stop row click

            if (action === 'pdf') {
                handleDownloadPdf(id);
            } else if (action === 'delete') {
                openSchoolProjectDeleteModal(id);
            }
            return;
        }

        // B. Check for Row/Card Clicks (View Details)
        const rowOrCard = event.target.closest('tr, .application-card');
        if (rowOrCard) {
            const id = parseInt(rowOrCard.getAttribute('data-id'), 10);
            if (id) {
                // Determine what a row click does. 
                // Currently set to open PDF based on your request, 
                // or you can uncomment openSchoolProjectView(id) to see details.
                handleDownloadPdf(id); 
                // openSchoolProjectView(id); 
            }
        }
    };

    // --- 4. ATTACH LISTENERS (With Cleanup) ---
    // We remove the listener first to prevent duplicates when switching tabs
    tableBody.removeEventListener('click', handleProjectAction);
    tableBody.addEventListener('click', handleProjectAction);

    if (cardContainer) {
        cardContainer.removeEventListener('click', handleProjectAction);
        cardContainer.addEventListener('click', handleProjectAction);
    }

    // Attach Modal Close Handlers
    attachModalCloseHandlers();

    // Attach Delete Confirmation
    if (deleteButton) {
        // Clone and replace to strip all old event listeners (safest method for modal buttons)
        const newDeleteBtn = deleteButton.cloneNode(true);
        deleteButton.parentNode.replaceChild(newDeleteBtn, deleteButton);
        newDeleteBtn.addEventListener('click', deleteSchoolProject);
    }

    // --- 5. LOAD DATA ---
    loadSchoolProjects();
}

async function loadSchoolProjects() {
    // If already loading, stop (unless we just forced a reset in initialize)
    if (isSchoolProjectsLoading) return;

    const tableBody = document.getElementById('schoolProjectsTableBody');
    const emptyState = document.getElementById('schoolProjectsEmptyState');

    isSchoolProjectsLoading = true;

    // Inject Loader
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 3rem;">
                    <div class="loader" style="margin: 0 auto 1rem;"></div>
                    <p style="color: #6b7280;">Loading projects...</p>
                </td>
            </tr>
        `;
        if (emptyState) emptyState.classList.add('hidden');
    }

    try {
        // Assuming 'apiCall' is defined in your main admin.html/js
        const response = await apiCall('/school-projects');

        if (Array.isArray(response)) {
            schoolProjectsData = response;
        } else if (response && Array.isArray(response.data)) {
            schoolProjectsData = response.data;
        } else {
            schoolProjectsData = [];
        }

        renderSchoolProjectsList();

    } catch (error) {
        console.error('Error loading school projects:', error);
        schoolProjectsData = [];
        renderSchoolProjectsList();
        
        if (typeof showNotification === 'function') {
            showNotification('Failed to load applications: ' + (error.message || ''), 'error');
        }
    } finally {
        isSchoolProjectsLoading = false;
    }
}

function renderSchoolProjectsList(filteredData) {
    const tableBody = document.getElementById('schoolProjectsTableBody');
    const cardContainer = document.getElementById('schoolProjectsCardContainer');
    const emptyState = document.getElementById('schoolProjectsEmptyState');
    const countBadge = document.getElementById('totalApplicationsCount'); // Ensure this ID exists in HTML

    const data = filteredData || schoolProjectsData;

    // Update Badge Count
    if (countBadge) {
        countBadge.textContent = data.length;
        countBadge.style.display = data.length > 0 ? 'inline-flex' : 'none';
    }

    if (!data || data.length === 0) {
        if (tableBody) tableBody.innerHTML = '';
        if (cardContainer) cardContainer.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    /* =====================
       DESKTOP TABLE ROWS
    ====================== */
    if (tableBody) {
        tableBody.innerHTML = data.map((project, index) => `
            <tr data-id="${project.id}" style="cursor: pointer;">
                <td>${data.length - index}</td>
                <td>${escapeHtml(project.school_name || '-')}</td>
                <td>${escapeHtml(project.principal_name || '-')}</td>
                <td>${formatDate(project.declaration_date)}</td>
                <td>
                    <div class="projects-actions">
                        <button class="btn btn-primary btn-sm"
                            data-action="pdf"
                            data-id="${project.id}"
                            title="View PDF">
                            <span class="material-symbols-outlined">picture_as_pdf</span>
                        </button>
                        <button class="btn btn-danger btn-sm"
                            data-action="delete"
                            data-id="${project.id}"
                            title="Delete">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    /* =====================
       MOBILE / TABLET CARDS
    ====================== */
    if (cardContainer) {
        cardContainer.innerHTML = data.map((project, index) => `
            <div class="application-card" data-id="${project.id}" style="cursor: pointer;">
                <div class="row">
                    <span class="label">#</span>
                    <span class="value">#${data.length - index}</span>
                </div>
                <div class="row">
                    <span class="label">School</span>
                    <span class="value">${escapeHtml(project.school_name || '-')}</span>
                </div>
                <div class="row">
                    <span class="label">Principal</span>
                    <span class="value">${escapeHtml(project.principal_name || '-')}</span>
                </div>
                <div class="row">
                    <span class="label">Date</span>
                    <span class="value">${formatDate(project.declaration_date)}</span>
                </div>

                <div class="card-actions">
                    <button class="btn btn-primary btn-sm"
                        data-action="pdf"
                        data-id="${project.id}">
                        <span class="material-symbols-outlined">picture_as_pdf</span>
                        PDF
                    </button>

                    <button class="btn btn-danger btn-sm"
                        data-action="delete"
                        data-id="${project.id}">
                        <span class="material-symbols-outlined">delete</span>
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }
}

// --- FILTER FUNCTION ---
function filterSchoolProjects() {
    const input = document.getElementById('searchSchoolProjects');
    if (!input) return;

    const term = input.value.trim().toLowerCase();
    if (!term) {
        renderSchoolProjectsList();
        return;
    }

    const filtered = schoolProjectsData.filter(function (project) {
        const principal = (project.principal_name || '').toLowerCase();
        const school = (project.school_name || '').toLowerCase();
        const email = (project.email || '').toLowerCase();
        const board = (project.affiliated_board || '').toLowerCase();

        return (
            principal.includes(term) ||
            school.includes(term) ||
            email.includes(term) ||
            board.includes(term)
        );
    });

    renderSchoolProjectsList(filtered);
}

// --- DELETE LOGIC ---
function openSchoolProjectDeleteModal(id) {
    const project = getProjectById(id);
    if (!project) return;

    schoolProjectIdToDelete = id;

    const info = document.getElementById('deleteSchoolProjectInfo');
    if (info) {
        const principal = escapeHtml(project.principal_name || '');
        const school = escapeHtml(project.school_name || '');
        const date = formatDate(project.declaration_date);

        info.innerHTML =
            '<h4>' + principal + '</h4>' +
            '<p><strong>School:</strong> ' + school + '</p>' +
            '<p><strong>Date:</strong> ' + date + '</p>';
    }

    const modal = document.getElementById('schoolProjectDeleteModal');
    if (modal) modal.classList.remove('hidden');
}

async function deleteSchoolProject() {
    if (!schoolProjectIdToDelete || isSchoolProjectsOperationInProgress) return;

    const deleteBtn = document.getElementById('confirmDeleteSchoolProjectButton');
    const originalContent = deleteBtn ? deleteBtn.innerHTML : 'Delete';

    isSchoolProjectsOperationInProgress = true;

    // Loading State
    if (deleteBtn) {
        deleteBtn.innerHTML = '<span class="material-symbols-outlined spin">progress_activity</span> Deleting...';
        deleteBtn.disabled = true;
        deleteBtn.style.opacity = '0.7';
        deleteBtn.style.cursor = 'not-allowed';
    }

    try {
        if (typeof showLoading === 'function') showLoading();

        // Ensure endpoint matches your API
        const endpoint = '/school-projects/' + schoolProjectIdToDelete;
        const response = await apiCall(endpoint, { method: 'DELETE' });

        if (typeof showNotification === 'function') {
            const message = (response && response.message) || 'Application deleted successfully';
            showNotification(message, 'success');
        }

        closeModal('schoolProjectDeleteModal');
        schoolProjectIdToDelete = null;

        // Slight delay to allow modal close animation
        setTimeout(function () {
            loadSchoolProjects();
        }, 300);

    } catch (error) {
        console.error('Error deleting school project:', error);
        if (typeof showNotification === 'function') {
            showNotification(error.message || 'Failed to delete application', 'error');
        }
    } finally {
        isSchoolProjectsOperationInProgress = false;

        // Restore Button
        if (deleteBtn) {
            deleteBtn.innerHTML = originalContent;
            deleteBtn.disabled = false;
            deleteBtn.style.opacity = '1';
            deleteBtn.style.cursor = 'pointer';
        }

        if (typeof hideLoading === 'function') hideLoading();
    }
}

// --- PDF VIEW LOGIC (Corrected) ---
async function handleDownloadPdf(id) {
    if (isPdfOpening) return;
    if (!id) return;

    const token = localStorage.getItem('adminToken');
    if (!token) {
        alert("You are not logged in.");
        return;
    }

    // 1. Open Tab IMMEDIATELY (Bypasses Popup Blocker)
    const pdfWindow = window.open('', '_blank');
    if (!pdfWindow) {
        alert("Please allow popups for this site to view the PDF.");
        return;
    }

    // 2. Show Loading UI in new tab
    pdfWindow.document.write(`
        <html>
            <head><title>Loading PDF...</title></head>
            <body style="background-color: #525659; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; color: white; font-family: sans-serif;">
                <div style="text-align: center;">
                    <div style="margin-bottom: 10px;">Please wait...</div>
                    <div style="font-size: 14px; opacity: 0.8;">Fetching secure document</div>
                </div>
            </body>
        </html>
    `);

    isPdfOpening = true;
    const btn = document.querySelector(`button[data-action="pdf"][data-id="${id}"]`);
    const originalContent = btn ? btn.innerHTML : ''; // Syntax Fixed

    if (btn) {
        btn.innerHTML = '<span class="material-symbols-outlined spin">downloading</span> ...';
        btn.disabled = true;
        btn.style.opacity = '0.7';
    }

    try {
        // 3. Fetch Data
        // Ensure API_BASE_URL is available from admin.html
        const baseUrl = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://127.0.0.1:8000/api';
        
        const response = await fetch(`${baseUrl}/school-projects/${id}/pdf`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/pdf'
            }
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        // 4. Load Blob
        const blob = await response.blob();
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        const fileURL = window.URL.createObjectURL(pdfBlob);

        // 5. Redirect Tab
        pdfWindow.location.href = fileURL;

    } catch (error) {
        console.error('PDF Error:', error);
        if (pdfWindow) pdfWindow.close(); // Close the blank tab on error

        if (typeof showNotification === 'function') {
            showNotification('Failed to open PDF. ' + error.message, 'error');
        } else {
            alert('Failed to open PDF.');
        }
    } finally {
        isPdfOpening = false;
        if (btn) {
            btn.innerHTML = originalContent;
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    }
}

// --- HELPER FUNCTIONS ---

function attachModalCloseHandlers() {
    const closeButtons = document.querySelectorAll('[data-close-modal]');
    closeButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            const modalId = button.getAttribute('data-close-modal');
            if (modalId) closeModal(modalId);
        });
    });

    const overlays = document.querySelectorAll('#schoolProjectViewModal .modal-overlay, #schoolProjectDeleteModal .modal-overlay');
    overlays.forEach(function (overlay) {
        overlay.addEventListener('click', function () {
            const modal = overlay.closest('.modal');
            if (modal && modal.id) {
                closeModal(modal.id);
            }
        });
    });
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('hidden');

    if (modalId === 'schoolProjectDeleteModal') {
        schoolProjectIdToDelete = null;
    }
}

function getProjectById(id) {
    return schoolProjectsData.find(function (project) {
        return Number(project.id) === Number(id);
    });
}

function formatDate(value) {
    if (!value) return '-';
    var date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text).replace(/[&<>"']/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return '&#039;';
    });
}

// --- INITIALIZATION CALL ---
// We keep this here so it runs when the script is first loaded.
// The checks inside initializeSchoolIntegration protect against errors.
initializeSchoolIntegration();