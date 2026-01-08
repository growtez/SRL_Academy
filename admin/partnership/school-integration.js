let schoolProjectsData = [];
let isSchoolProjectsLoading = false;
let isSchoolProjectsOperationInProgress = false;
let currentSchoolProjectId = null;
let schoolProjectIdToDelete = null;

function initializeSchoolIntegration() {
    const searchInput = document.getElementById('searchSchoolProjects');
    const tableBody = document.getElementById('schoolProjectsTableBody');
    const cardContainer = document.getElementById('schoolProjectsCardContainer'); // 1. Select the mobile container
    const deleteButton = document.getElementById('confirmDeleteSchoolProjectButton');
    const viewPdfButton = document.getElementById('viewPdfButton');

    if (!tableBody) {
        console.warn('School projects table body not found');
        return;
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterSchoolProjects);
    }

    // 2. Define a shared handler function for both Desktop and Mobile
    const handleProjectAction = function (event) {
        const actionButton = event.target.closest('[data-action]');
        if (!actionButton) return;

        const id = parseInt(actionButton.getAttribute('data-id'), 10);
        if (!id) return;

        const action = actionButton.getAttribute('data-action');
        
        if (action === 'pdf') {
            // Note: Currently downloads directly. Change this to 
            // openSchoolProjectView(id); 
            // if you want to see the Preview Modal first.
            handleDownloadPdf(id); 
        } else if (action === 'delete') {
            openSchoolProjectDeleteModal(id);
        }
    };

    // 3. Attach the listener to the Desktop Table
    tableBody.addEventListener('click', handleProjectAction);

    // 4. Attach the listener to the Mobile Card Container
    if (cardContainer) {
        cardContainer.addEventListener('click', handleProjectAction);
    }

    attachModalCloseHandlers();

    if (deleteButton) {
        deleteButton.addEventListener('click', deleteSchoolProject);
    }

    if (viewPdfButton) {
        viewPdfButton.addEventListener('click', function () {
            if (currentSchoolProjectId) {
                handleDownloadPdf(currentSchoolProjectId);
            }
        });
    }

    loadSchoolProjects();
}

async function loadSchoolProjects() {
    if (isSchoolProjectsLoading) return;

    const tableBody = document.getElementById('schoolProjectsTableBody');
    const emptyState = document.getElementById('schoolProjectsEmptyState');

    isSchoolProjectsLoading = true;

    // 1. Inject loader
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 3rem;">
                    <div class="loader" style="margin: 0 auto 1rem;"></div>
                    <p style="color: #6b7280;">Loading projects...</p>
                </td>
            </tr>
        `;
        if (emptyState) emptyState.classList.add('hidden');
    }

    try {
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
    const countBadge = document.getElementById('totalApplicationsCount')

    const data = filteredData || schoolProjectsData;

    // Update total count badge
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
    tableBody.innerHTML = data.map((project, index) => `
        <tr>
            <td>${index+1}</td>
            <td>${escapeHtml(project.school_name || '-')}</td>
            <td>${escapeHtml(project.principal_name || '-')}</td>
            <td>${formatDate(project.declaration_date)}</td>
            <td>
                <div class="projects-actions">
                    <button class="btn btn-primary btn-sm"
                        data-action="pdf"
                        data-id="${project.id}">
                        
                        PDF
                    </button>
                    <button class="btn btn-danger btn-sm"
                        data-action="delete"
                        data-id="${project.id}">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    /* =====================
       MOBILE / TABLET CARDS
    ====================== */
    cardContainer.innerHTML = data.map((project, index) => `
        <div class="application-card">
            <div class="row">
                <span class="label">#</span>
                <span class="value">#${index + 1}</span>
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

// ... existing initialization code ...

function openSchoolProjectView(id) {
    const project = getProjectById(id);
    if (!project) return;

    currentSchoolProjectId = id;

    // Header Info
    setTextContent('pdfAppId', project.id);
    setTextContent('pdfAppDate', formatDate(project.application_date));

    // School Info
    setTextContent('pdfSchoolName', project.school_name);
    setTextContent('pdfAddress', project.address);
    setTextContent('pdfPrincipalName', project.principal_name);
    setTextContent('pdfContact', project.contact_number);
    setTextContent('pdfEmail', project.email);
    setTextContent('pdfBoard', project.affiliated_board);

    // Project Type Checkboxes
    setPdfCheck('pdfCheckIIT', project['project_iit-jee']);
    setPdfCheck('pdfCheckNEET', project['project_neet']);
    setPdfCheck('pdfCheckOlympiad', project['project_olympiad']);
    setPdfCheck('pdfCheckBoard', project['project_board']);

    // Other Project Type
    const otherContainer = document.getElementById('pdfOtherContainer');
    if (project.project_other) {
        otherContainer.style.display = 'inline-block';
        setTextContent('pdfOtherText', project.project_other);
    } else {
        otherContainer.style.display = 'none';
    }

    // Project Details
    setTextContent('pdfObjective', project.objective);
    setTextContent('pdfTargetAudience', project.target_audience);
    setTextContent('pdfDuration', project.duration);
    setTextContent('pdfStudents', project.students_involved);
    setTextContent('pdfResources', project.resources_required);

    // Additional Info
    setTextContent('pdfPrevious', project.previous_projects);
    setTextContent('pdfBenefits', project.benefits);

    // Declaration
    setTextContent('pdfDecNameBold', project.declaration_principal);
    setTextContent('pdfDecName', project.declaration_principal);
    setTextContent('pdfDecDate', formatDate(project.declaration_date));

    // Footer Timestamp
    const today = new Date().toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: 'numeric', minute: 'numeric', hour12: true
    });
    setTextContent('pdfGeneratedDate', today);

    const modal = document.getElementById('schoolProjectViewModal');
    if (modal) modal.classList.remove('hidden');
}

// Helper for PDF-style Checkboxes
function setPdfCheck(elementId, value) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    // Check if truthy (1, '1', true)
    const isChecked = value == 1 || value === true || value === '1';
    
    el.textContent = isChecked ? '☑' : '☐';
    el.style.color = isChecked ? 'green' : '#999';
}

// Helper to color code Yes/No
function formatBooleanBadge(elementId, value) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    const isYes = value == 1 || value === true || value === '1';
    el.textContent = isYes ? 'Yes' : 'No';
    el.style.color = isYes ? '#15803d' : '#9ca3af'; // Green or Gray
    el.style.backgroundColor = isYes ? '#dcfce7' : '#f3f4f6';
    el.style.border = isYes ? '1px solid #86efac' : '1px solid #e5e7eb';
}

// ... rest of the file (loadSchoolProjects, delete, etc.) ...

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

    isSchoolProjectsOperationInProgress = true;

    try {
        if (typeof showLoading === 'function') showLoading();

        const endpoint = '/school-projects/' + schoolProjectIdToDelete;
        const response = await apiCall(endpoint, { method: 'DELETE' });

        if (typeof showNotification === 'function') {
            const message = (response && response.message) || 'Application deleted successfully';
            showNotification(message, 'success');
        }

        closeModal('schoolProjectDeleteModal');
        schoolProjectIdToDelete = null;

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
        if (typeof hideLoading === 'function') hideLoading();
    }
}

function handleDownloadPdf(id) {
    if (!id) return;

    // Build full API URL, e.g. http://127.0.0.1:8000/api/school-projects/{id}/pdf
    const url = `${API_BASE_URL}/school-projects/${id}/pdf`;

    // Open in a new tab / trigger browser download
    window.open(url, '_blank');
}

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

function setTextContent(elementId, value) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (value === null || value === undefined || value === '') {
        el.textContent = '-';
    } else {
        el.textContent = String(value);
    }
}

function formatDate(value) {
    if (!value) return '-';
    var date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
}

function formatBoolean(value) {
    return value ? 'Yes' : 'No';
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

initializeSchoolIntegration();