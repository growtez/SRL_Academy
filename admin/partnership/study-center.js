let studyCentreData = [];
let isStudyCentreLoading = false;
let isStudyCentreOperationInProgress = false;
let currentStudyCentreId = null;
let studyCentreIdToDelete = null;

function initializeStudyCentre() {
    const searchInput = document.getElementById('searchStudyCentres');
    const tableBody = document.getElementById('studyCentresTableBody');
    const cardContainer = document.getElementById('studyCentresCardContainer');
    const deleteButton = document.getElementById('confirmDeleteStudyCentreButton');
    const viewPdfButton = document.getElementById('viewStudyCentrePdfButton');

    if (!tableBody) {
        console.warn('Study centre table body not found');
        return;
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterStudyCentres);
    }

    // UPDATED: Shared handler function for both Desktop and Mobile
    const handleApplicationAction = function (event) {
        // 1. Check if an ACTION BUTTON (PDF/Delete) was clicked first
        const actionButton = event.target.closest('[data-action]');
        
        if (actionButton) {
            const id = parseInt(actionButton.getAttribute('data-id'), 10);
            const action = actionButton.getAttribute('data-action');
            
            // Stop the click from bubbling up to the row
            event.stopPropagation();

            if (action === 'pdf') {
                handleDownloadStudyCentrePdf(id);
            } else if (action === 'delete') {
                openStudyCentreDeleteModal(id);
            }
            return;
        }

        // 2. If NOT a button, check if the ROW or CARD was clicked
        const rowOrCard = event.target.closest('tr, .application-card');
        if (rowOrCard) {
            const id = parseInt(rowOrCard.getAttribute('data-id'), 10);
            if (id) {
                // Open the View Details Modal
                openStudyCentreView(id);
            }
        }
    };

    // Attach listener to Desktop Table
    tableBody.addEventListener('click', handleApplicationAction);

    // Attach listener to Mobile Card Container
    if (cardContainer) {
        cardContainer.addEventListener('click', handleApplicationAction);
    }

    attachStudyCentreModalCloseHandlers();

    if (deleteButton) {
        deleteButton.addEventListener('click', deleteStudyCentre);
    }

    if (viewPdfButton) {
        viewPdfButton.addEventListener('click', function () {
            if (currentStudyCentreId) {
                handleDownloadStudyCentrePdf(currentStudyCentreId);
            }
        });
    }

    loadStudyCentres();
}
async function loadStudyCentres() {
    if (isStudyCentreLoading) return;

    const tableBody = document.getElementById('studyCentresTableBody');
    const cardContainer = document.getElementById('studyCentresCardContainer');
    const emptyState = document.getElementById('studyCentresEmptyState');

    isStudyCentreLoading = true;

    // Inject loader
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 3rem;">
                    <div class="loader" style="margin: 0 auto 1rem;"></div>
                    <p style="color: #6b7280;">Loading applications...</p>
                </td>
            </tr>
        `;
        if (cardContainer) cardContainer.innerHTML = '';
        if (emptyState) emptyState.classList.add('hidden');
    }

    try {
        const response = await apiCall('/study-centre-applications');

        if (Array.isArray(response)) {
            studyCentreData = response;
        } else if (response && Array.isArray(response.data)) {
            studyCentreData = response.data;
        } else {
            studyCentreData = [];
        }

        renderStudyCentreList();
    } catch (error) {
        console.error('Error loading study centre applications:', error);
        studyCentreData = [];
        renderStudyCentreList();
        if (typeof showNotification === 'function') {
            showNotification('Failed to load applications: ' + (error.message || ''), 'error');
        }
    } finally {
        isStudyCentreLoading = false;
    }
}

function renderStudyCentreList(filteredData) {
    const tableBody = document.getElementById('studyCentresTableBody');
    const cardContainer = document.getElementById('studyCentresCardContainer');
    const emptyState = document.getElementById('studyCentresEmptyState');
    const countBadge = document.getElementById('totalApplicationsCount');

    const data = filteredData || studyCentreData;

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
    tableBody.innerHTML = data.map((application, index) => `
        <tr data-id="${application.id}" style="cursor: pointer;">
            <td>${index + 1}</td>
            <td>${escapeHtml(application.centre_name || '-')}</td>
            <td>${escapeHtml(application.principal_name || '-')}</td>
            <td>${formatDate(application.declaration_date)}</td>
            <td>
                <div class="projects-actions">
                    <button class="btn btn-primary btn-sm"
                        data-action="pdf"
                        data-id="${application.id}"
                        title="Download PDF">
                        <span class="material-symbols-outlined">picture_as_pdf</span>
                    </button>
                    <button class="btn btn-danger btn-sm"
                        data-action="delete"
                        data-id="${application.id}"
                        title="Delete">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    /* =====================
       MOBILE / TABLET CARDS
    ====================== */
    cardContainer.innerHTML = data.map((application, index) => `
        <div class="application-card" data-id="${application.id}" style="cursor: pointer;">
            <div class="row">
                <span class="label">Sl. No.</span>
                <span class="value">#${index + 1}</span>
            </div>
            <div class="row">
                <span class="label">Centre</span>
                <span class="value">${escapeHtml(application.centre_name || '-')}</span>
            </div>
            <div class="row">
                <span class="label">Principal</span>
                <span class="value">${escapeHtml(application.principal_name || '-')}</span>
            </div>
            <div class="row">
                <span class="label">Date</span>
                <span class="value">${formatDate(application.declaration_date)}</span>
            </div>

            <div class="card-actions">
                <button class="btn btn-primary btn-sm"
                    data-action="pdf"
                    data-id="${application.id}">
                    <span class="material-symbols-outlined">picture_as_pdf</span>
                    PDF
                </button>

                <button class="btn btn-danger btn-sm"
                    data-action="delete"
                    data-id="${application.id}">
                    <span class="material-symbols-outlined">delete</span>
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}
function filterStudyCentres() {
    const input = document.getElementById('searchStudyCentres');
    if (!input) return;

    const term = input.value.trim().toLowerCase();
    if (!term) {
        renderStudyCentreList();
        return;
    }

    const filtered = studyCentreData.filter(function (application) {
        const centre = (application.centre_name || '').toLowerCase();
        const principal = (application.principal_name || '').toLowerCase();
        const email = (application.email || '').toLowerCase();
        const board = (application.affiliated_board || '').toLowerCase();

        return (
            centre.includes(term) ||
            principal.includes(term) ||
            email.includes(term) ||
            board.includes(term)
        );
    });

    renderStudyCentreList(filtered);
}

function openStudyCentreView(id) {
    const application = getStudyCentreById(id);
    if (!application) return;

    currentStudyCentreId = id;

    // Header section
    setTextContent('detailCentreNameHeader', application.centre_name);
    setTextContent('detailAddressHeader', application.address);

    // Contact Information Card
    setTextContent('detailPrincipalName', application.principal_name);
    setTextContent('detailContactNumber', application.contact_number);
    setTextContent('detailEmail', application.email);
    setTextContent('detailAffiliatedBoard', application.affiliated_board);
    setTextContent('detailExperience', application.experience);

    // Intro Information Card
    setTextContent('detailPrincipalIntro', application.principal_name_intro);
    setTextContent('detailApplicationDate', formatDate(application.application_date));

    // Study Centre Details Card
    setTextContent('detailAvailableCourses', application.available_courses);
    setTextContent('detailInfrastructure', application.infrastructure);
    setTextContent('detailStaffStrength', application.staff_strength);
    setTextContent('detailStudentCapacity', application.student_capacity);
    setTextContent('detailResourcesRequired', application.resources_required);

    // Additional Information Card
    setTextContent('detailPreviousExperience', application.previous_experience);
    setTextContent('detailBenefits', application.benefits);

    // Declaration Card
    setTextContent('detailDeclarationPrincipal', application.declaration_principal);
    setTextContent('detailDeclarationDate', formatDate(application.declaration_date));

    const modal = document.getElementById('studyCentreViewModal');
    if (modal) modal.classList.remove('hidden');
}

function openStudyCentreDeleteModal(id) {
    const application = getStudyCentreById(id);
    if (!application) return;

    studyCentreIdToDelete = id;

    const info = document.getElementById('deleteStudyCentreInfo');
    if (info) {
        const centre = escapeHtml(application.centre_name || '');
        const principal = escapeHtml(application.principal_name || '');
        const date = formatDate(application.declaration_date);

        info.innerHTML =
            '<h4>' + centre + '</h4>' +
            '<p><strong>Principal:</strong> ' + principal + '</p>' +
            '<p><strong>Date:</strong> ' + date + '</p>';
    }

    const modal = document.getElementById('studyCentreDeleteModal');
    if (modal) modal.classList.remove('hidden');
}

async function deleteStudyCentre() {
    if (!studyCentreIdToDelete || isStudyCentreOperationInProgress) return;

    isStudyCentreOperationInProgress = true;

    try {
        if (typeof showLoading === 'function') showLoading();

        const endpoint = '/study-centre-applications/' + studyCentreIdToDelete;
        const response = await apiCall(endpoint, { method: 'DELETE' });

        if (typeof showNotification === 'function') {
            const message = (response && response.message) || 'Application deleted successfully';
            showNotification(message, 'success');
        }

        closeStudyCentreModal('studyCentreDeleteModal');
        studyCentreIdToDelete = null;

        setTimeout(function () {
            loadStudyCentres();
        }, 300);
    } catch (error) {
        console.error('Error deleting study centre application:', error);
        if (typeof showNotification === 'function') {
            showNotification(error.message || 'Failed to delete application', 'error');
        }
    } finally {
        isStudyCentreOperationInProgress = false;
        if (typeof hideLoading === 'function') hideLoading();
    }
}

function handleDownloadStudyCentrePdf(id) {
    if (!id) return;

    const url = `${API_BASE_URL}/study-centre-applications/${id}/pdf`;
    window.open(url, '_blank');
}

function attachStudyCentreModalCloseHandlers() {
    const closeButtons = document.querySelectorAll('[data-close-modal]');
    closeButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            const modalId = button.getAttribute('data-close-modal');
            if (modalId) closeStudyCentreModal(modalId);
        });
    });

    const overlays = document.querySelectorAll('#studyCentreViewModal .modal-overlay, #studyCentreDeleteModal .modal-overlay');
    overlays.forEach(function (overlay) {
        overlay.addEventListener('click', function () {
            const modal = overlay.closest('.modal');
            if (modal && modal.id) {
                closeStudyCentreModal(modal.id);
            }
        });
    });
}

function closeStudyCentreModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('hidden');

    if (modalId === 'studyCentreDeleteModal') {
        studyCentreIdToDelete = null;
    }
}

function getStudyCentreById(id) {
    return studyCentreData.find(function (application) {
        return Number(application.id) === Number(id);
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
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
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

// initializeStudyCentre();