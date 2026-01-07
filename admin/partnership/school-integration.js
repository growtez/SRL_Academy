let schoolProjectsData = [];
let isSchoolProjectsLoading = false;
let isSchoolProjectsOperationInProgress = false;
let currentSchoolProjectId = null;
let schoolProjectIdToDelete = null;

function initializeSchoolIntegration() {
    const searchInput = document.getElementById('searchSchoolProjects');
    const tableBody = document.getElementById('schoolProjectsTableBody');
    const deleteButton = document.getElementById('confirmDeleteSchoolProjectButton');
    const viewPdfButton = document.getElementById('viewPdfButton');

    if (!tableBody) {
        console.warn('School projects table body not found');
        return;
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterSchoolProjects);
    }

    tableBody.addEventListener('click', function (event) {
        const actionButton = event.target.closest('[data-action]');
        if (!actionButton) return;

        const id = parseInt(actionButton.getAttribute('data-id'), 10);
        if (!id) return;

        const action = actionButton.getAttribute('data-action');
        if (action === 'view') {
            openSchoolProjectView(id);
        } else if (action === 'pdf') {
            handleDownloadPdf(id);
        } else if (action === 'delete') {
            openSchoolProjectDeleteModal(id);
        }
    });

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
    const emptyState = document.getElementById('schoolProjectsEmptyState');

    if (!tableBody || !emptyState) return;

    const data = filteredData || schoolProjectsData;

    if (!data || data.length === 0) {
        tableBody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    const rowsHtml = data
        .map(function (project) {
            const id = project.id;
            const principalName = escapeHtml(project.principal_name || '');
            const schoolName = escapeHtml(project.school_name || '');
            const date = formatDate(project.declaration_date);

            return (
                '<tr data-id="' + id + '">' +
                // FIX: Swapped these two lines to match HTML Header (School first)
                '<td>' + schoolName + '</td>' +    
                '<td>' + principalName + '</td>' + 
                
                '<td>' + date + '</td>' +
                '<td>' +
                    '<div class="projects-actions">' +
                        '<button type="button" class="btn btn-outline btn-sm" data-action="view" data-id="' + id + '">' +
                            '<span class="material-symbols-outlined">visibility</span>' +
                            'View' +
                        '</button>' +
                        '<button type="button" class="btn btn-primary btn-sm" data-action="pdf" data-id="' + id + '">' +
                            '<span class="material-symbols-outlined">picture_as_pdf</span>' +
                            'PDF' +
                        '</button>' +
                        '<button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="' + id + '">' +
                            '<span class="material-symbols-outlined">delete</span>' +
                            'Delete' +
                        '</button>' +
                    '</div>' +
                '</td>' +
                '</tr>'
            );
        })
        .join('');

    tableBody.innerHTML = rowsHtml;
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

    // SECTION 1: School Info
    setTextContent('detailApplicationDate', formatDate(project.application_date));
    setTextContent('detailAffiliatedBoard', project.affiliated_board);
    setTextContent('detailSchoolName', project.school_name);
    setTextContent('detailAddress', project.address); // Now visible!
    setTextContent('detailPrincipalName', project.principal_name);
    setTextContent('detailContactNumber', project.contact_number);
    setTextContent('detailEmail', project.email);

    // SECTION 2: Project Type (Yes/No styling)
    formatBooleanBadge('detailProjectIITJEE', project['project_iit-jee']);
    formatBooleanBadge('detailProjectNEET', project['project_neet']);
    formatBooleanBadge('detailProjectOlympiad', project['project_olympiad']);
    formatBooleanBadge('detailProjectBoard', project['project_board']);
    setTextContent('detailProjectOther', project.project_other || 'None');

    // SECTION 3: Project Details
    setTextContent('detailObjective', project.objective);
    setTextContent('detailTargetAudience', project.target_audience);
    setTextContent('detailDuration', project.duration);
    setTextContent('detailStudentsInvolved', project.students_involved);
    setTextContent('detailResourcesRequired', project.resources_required);

    // SECTION 4: Additional Info
    setTextContent('detailPreviousProjects', project.previous_projects);
    setTextContent('detailBenefits', project.benefits);

    // SECTION 5: Declaration
    setTextContent('detailDeclarationPrincipal', project.declaration_principal);
    setTextContent('detailDeclarationDate', formatDate(project.declaration_date));

    const modal = document.getElementById('schoolProjectViewModal');
    if (modal) modal.classList.remove('hidden');
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