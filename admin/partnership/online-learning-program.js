let onlineLearningData = [];
let isOnlineLearningLoading = false;
let isOnlineLearningOperationInProgress = false;
let currentOnlineLearningId = null;
let onlineLearningIdToDelete = null;

function initializeOnlineLearning() {
    console.log('Initializing Online Learning module');

    const searchInput = document.getElementById('searchOnlineLearning');
    const tableBody = document.getElementById('onlineLearningTableBody');
    const deleteButton = document.getElementById('confirmDeleteOnlineLearningButton');
    const viewPdfButton = document.getElementById('viewOnlineLearningPdfButton');

    console.log('Online Learning elements found:', {
        searchInput: !!searchInput,
        tableBody: !!tableBody,
        deleteButton: !!deleteButton,
        viewPdfButton: !!viewPdfButton
    });

    if (!tableBody) {
        console.warn('Online learning table body not found');
        return;
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterOnlineLearning);
    }

    tableBody.addEventListener('click', function (event) {
        const actionButton = event.target.closest('[data-action]');
        if (!actionButton) return;

        const id = parseInt(actionButton.getAttribute('data-id'), 10);
        if (!id) return;

        const action = actionButton.getAttribute('data-action');
        if (action === 'view') {
            openOnlineLearningView(id);
        } else if (action === 'pdf') {
            handleDownloadOnlineLearningPdf(id);
        } else if (action === 'delete') {
            openOnlineLearningDeleteModal(id);
        }
    });

    attachOnlineLearningModalCloseHandlers();

    if (deleteButton) {
        deleteButton.addEventListener('click', deleteOnlineLearning);
    }

    if (viewPdfButton) {
        viewPdfButton.addEventListener('click', function () {
            if (currentOnlineLearningId) {
                handleDownloadOnlineLearningPdf(currentOnlineLearningId);
            }
        });
    }

    loadOnlineLearning();
}

async function loadOnlineLearning() {
    console.log('Loading Online Learning data...');

    if (isOnlineLearningLoading) return;

    const tableBody = document.getElementById('onlineLearningTableBody');
    const emptyState = document.getElementById('onlineLearningEmptyState');

    if (!tableBody || !emptyState) {
        console.warn('Online learning elements not found');
        return;
    }

    isOnlineLearningLoading = true;

    try {
        console.log('Calling API: /distance-learning');
        if (typeof showLoading === 'function') showLoading();

        const response = await apiCall('/distance-learning');
        console.log('API response:', response);

        if (Array.isArray(response)) {
            onlineLearningData = response;
        } else if (response && Array.isArray(response.data)) {
            onlineLearningData = response.data;
        } else {
            onlineLearningData = [];
        }

        console.log('Processed data:', onlineLearningData);
        renderOnlineLearningList();
    } catch (error) {
        console.error('Error loading online learning applications:', error);
        onlineLearningData = [];
        renderOnlineLearningList();
        if (typeof showNotification === 'function') {
            showNotification('Failed to load applications: ' + (error.message || ''), 'error');
        }
    } finally {
        isOnlineLearningLoading = false;
        if (typeof hideLoading === 'function') hideLoading();
    }
}

function renderOnlineLearningList(filteredData) {
    const tableBody = document.getElementById('onlineLearningTableBody');
    const emptyState = document.getElementById('onlineLearningEmptyState');

    if (!tableBody || !emptyState) return;

    const data = filteredData || onlineLearningData;

    if (!data || data.length === 0) {
        tableBody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    const rowsHtml = data
        .map(function (application) {
            const id = application.id;
            const applicantName = escapeHtml(application.applicant_name || '');
            const centerArea = escapeHtml(application.center_area || '');
            const date = formatDate(application.agreement_date);

            return (
                '<tr data-id="' + id + '">' +
                '<td>' + applicantName + '</td>' +
                '<td>' + centerArea + '</td>' +
                '<td>' + (application.number_of_schools || '') + '</td>' +
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

function filterOnlineLearning() {
    const input = document.getElementById('searchOnlineLearning');
    if (!input) return;

    const term = input.value.trim().toLowerCase();
    if (!term) {
        renderOnlineLearningList();
        return;
    }

    const filtered = onlineLearningData.filter(function (application) {
        const applicant = (application.applicant_name || '').toLowerCase();
        const center = (application.center_area || '').toLowerCase();
        const email = (application.email_address || '').toLowerCase();
        const qualification = (application.educational_qualification || '').toLowerCase();

        return (
            applicant.includes(term) ||
            center.includes(term) ||
            email.includes(term) ||
            qualification.includes(term)
        );
    });

    renderOnlineLearningList(filtered);
}

function openOnlineLearningView(id) {
    const application = getOnlineLearningById(id);
    if (!application) return;

    currentOnlineLearningId = id;

    // Center Info Section
    setTextContent('detailApplicantName', application.applicant_name);
    setTextContent('detailCenterArea', application.center_area);

    // Contact Information Card
    setTextContent('detailApplicantNameContact', application.applicant_name);
    setTextContent('detailContactNumber', application.contact_number);
    setTextContent('detailEmailAddress', application.email_address);
    setTextContent('detailApplicantAddress', application.applicant_address);

    // Program Details Card
    setTextContent('detailEducationalQualification', application.educational_qualification);
    setTextContent('detailNumberOfSchools', application.number_of_schools);
    setTextContent('detailAvgStudents', application.avg_students);
    setTextContent('detailInvestmentAmount', application.investment_amount);

    // Additional Information Card
    setTextContent('detailApplicationDate', formatDate(application.application_date));
    setTextContent('detailAgreementDate', formatDate(application.agreement_date));

    // Signature Card
    setTextContent('detailSignatureName', application.signature_name);
    setTextContent('detailSignatureDate', formatDate(application.signature_date));

    const modal = document.getElementById('onlineLearningViewModal');
    if (modal) modal.classList.remove('hidden');
}

function openOnlineLearningDeleteModal(id) {
    const application = getOnlineLearningById(id);
    if (!application) return;

    onlineLearningIdToDelete = id;

    const info = document.getElementById('deleteOnlineLearningInfo');
    if (info) {
        const applicant = escapeHtml(application.applicant_name || '');
        const center = escapeHtml(application.center_area || '');
        const date = formatDate(application.agreement_date);

        info.innerHTML =
            '<h4>' + applicant + '</h4>' +
            '<p><strong>Center Area:</strong> ' + center + '</p>' +
            '<p><strong>Date:</strong> ' + date + '</p>';
    }

    const modal = document.getElementById('onlineLearningDeleteModal');
    if (modal) modal.classList.remove('hidden');
}

async function deleteOnlineLearning() {
    if (!onlineLearningIdToDelete || isOnlineLearningOperationInProgress) return;

    isOnlineLearningOperationInProgress = true;

    try {
        if (typeof showLoading === 'function') showLoading();

        const endpoint = '/distance-learning/' + onlineLearningIdToDelete;
        const response = await apiCall(endpoint, { method: 'DELETE' });

        if (typeof showNotification === 'function') {
            const message = (response && response.message) || 'Application deleted successfully';
            showNotification(message, 'success');
        }

        closeOnlineLearningModal('onlineLearningDeleteModal');
        onlineLearningIdToDelete = null;

        setTimeout(function () {
            loadOnlineLearning();
        }, 300);
    } catch (error) {
        console.error('Error deleting online learning application:', error);
        if (typeof showNotification === 'function') {
            showNotification(error.message || 'Failed to delete application', 'error');
        }
    } finally {
        isOnlineLearningOperationInProgress = false;
        if (typeof hideLoading === 'function') hideLoading();
    }
}

function handleDownloadOnlineLearningPdf(id) {
    if (!id) return;

    const url = `${API_BASE_URL}/distance-learning/${id}/pdf`;
    window.open(url, '_blank');
}

function attachOnlineLearningModalCloseHandlers() {
    const closeButtons = document.querySelectorAll('[data-close-modal]');
    closeButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            const modalId = button.getAttribute('data-close-modal');
            if (modalId) closeOnlineLearningModal(modalId);
        });
    });

    const overlays = document.querySelectorAll('#onlineLearningViewModal .modal-overlay, #onlineLearningDeleteModal .modal-overlay');
    overlays.forEach(function (overlay) {
        overlay.addEventListener('click', function () {
            const modal = overlay.closest('.modal');
            if (modal && modal.id) {
                closeOnlineLearningModal(modal.id);
            }
        });
    });
}

function closeOnlineLearningModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('hidden');

    if (modalId === 'onlineLearningDeleteModal') {
        onlineLearningIdToDelete = null;
    }
}

function getOnlineLearningById(id) {
    return onlineLearningData.find(function (application) {
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

initializeOnlineLearning();