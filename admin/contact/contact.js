let contactsData = [];
let isContactsLoading = false;
let isContactsOperationInProgress = false;
let currentContactId = null;
let contactIdToDelete = null;
let isPdfDownloading = false;

function initializeContactManagement() {
    const searchInput = document.getElementById('searchContacts');
    const tableBody = document.getElementById('contactsTableBody');
    const deleteButton = document.getElementById('confirmDeleteContactButton');
    const pdfButton = document.getElementById('contactPdfButton');

    if (!tableBody) {
        return;
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterContacts);
    }

    tableBody.addEventListener('click', function (event) {
        const actionButton = event.target.closest('[data-action]');
        if (!actionButton) return;

        const id = parseInt(actionButton.getAttribute('data-id'), 10);
        if (!id) return;

        const action = actionButton.getAttribute('data-action');
        if (action === 'view') {
            openContactView(id);
        } else if (action === 'pdf') {
            handleContactPdf(id, event.target);
        } else if (action === 'delete') {
            openContactDeleteModal(id);
        }
    });

    attachContactModalCloseHandlers();

    if (deleteButton) {
        deleteButton.addEventListener('click', deleteContact);
    }

    if (pdfButton) {
        pdfButton.addEventListener('click', function () {
            if (currentContactId) {
                handleContactPdf(currentContactId, this);
            }
        });
    }

    loadContacts();
}

async function loadContacts() {
    if (isContactsLoading) return;

    const tableBody = document.getElementById('contactsTableBody');
    const emptyState = document.getElementById('contactsEmptyState');

    isContactsLoading = true;

    // 1. Inject loader into table row
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 3rem;">
                    <div class="loader" style="margin: 0 auto 1rem;"></div>
                    <p style="color: #6b7280;">Loading submissions...</p>
                </td>
            </tr>
        `;
        if (emptyState) emptyState.classList.add('hidden');
    }

    try {
        const response = await apiCall('/contacts');

        if (Array.isArray(response)) {
            contactsData = response;
        } else if (response && Array.isArray(response.data)) {
            contactsData = response.data;
        } else {
            contactsData = [];
        }

        renderContactsList();
    } catch (error) {
        console.error('Error loading contacts:', error);
        contactsData = [];
        renderContactsList();
        if (typeof showNotification === 'function') {
            showNotification('Failed to load contacts: ' + (error.message || ''), 'error');
        }
    } finally {
        isContactsLoading = false;
    }
}
function renderContactsList(filteredData) {
    const tableBody = document.getElementById('contactsTableBody');
    const emptyState = document.getElementById('contactsEmptyState');

    if (!tableBody || !emptyState) return;

    const data = filteredData || contactsData;

    if (!data || data.length === 0) {
        tableBody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    const rowsHtml = data
        .map(function (contact) {
            const id = contact.id;
            const name = escapeHtml(contact.name || '');
            const email = escapeHtml(contact.email || '');
            const date = formatDate(contact.created_at);

            return (
                '<tr data-id="' + id + '">' +
                '<td>' + name + '</td>' +
                '<td>' + email + '</td>' +
                '<td>' + date + '</td>' +
                '<td>' +
                '<div class="contacts-actions">' +
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

function filterContacts() {
    const input = document.getElementById('searchContacts');
    if (!input) return;

    const term = input.value.trim().toLowerCase();
    if (!term) {
        renderContactsList();
        return;
    }

    const filtered = contactsData.filter(function (contact) {
        const name = (contact.name || '').toLowerCase();
        const email = (contact.email || '').toLowerCase();

        return name.includes(term) || email.includes(term);
    });

    renderContactsList(filtered);
}

function openContactView(id) {
    const contact = getContactById(id);
    if (!contact) return;

    currentContactId = id;

    setTextContent('detailContactName', contact.name);
    setTextContent('detailContactEmail', contact.email);
    setTextContent('detailContactPhone', contact.phone);
    setTextContent('detailContactGoal', contact.goal);
    setTextContent('detailContactClass', contact.class);
    setTextContent('detailContactClassType', contact.class_type);
    setTextContent('detailContactCreatedAt', formatDate(contact.created_at));

    const modal = document.getElementById('contactViewModal');
    if (modal) modal.classList.remove('hidden');
}

function openContactDeleteModal(id) {
    const contact = getContactById(id);
    if (!contact) return;

    contactIdToDelete = id;

    const info = document.getElementById('deleteContactInfo');
    if (info) {
        const name = escapeHtml(contact.name || '');
        const email = escapeHtml(contact.email || '');
        const date = formatDate(contact.created_at);

        info.innerHTML =
            '<h4>' + name + '</h4>' +
            '<p><strong>Email:</strong> ' + email + '</p>' +
            '<p><strong>Date:</strong> ' + date + '</p>';
    }

    const modal = document.getElementById('contactDeleteModal');
    if (modal) modal.classList.remove('hidden');
}

async function deleteContact() {
    if (!contactIdToDelete || isContactsOperationInProgress) return;

    isContactsOperationInProgress = true;

    try {
        if (typeof showLoading === 'function') showLoading();

        const endpoint = '/contacts/' + contactIdToDelete;
        const response = await apiCall(endpoint, { method: 'DELETE' });

        if (typeof showNotification === 'function') {
            const message = (response && response.message) || 'Submission deleted successfully';
            showNotification(message, 'success');
        }

        closeContactModal('contactDeleteModal');
        contactIdToDelete = null;

        setTimeout(function () {
            loadContacts();
        }, 300);
    } catch (error) {
        console.error('Error deleting contact:', error);
        if (typeof showNotification === 'function') {
            showNotification(error.message || 'Failed to delete submission', 'error');
        }
    } finally {
        isContactsOperationInProgress = false;
        if (typeof hideLoading === 'function') hideLoading();
    }
}


async function handleContactPdf(id, clickedElement) {
    if (!id || isPdfDownloading) return;

    const token = localStorage.getItem('adminToken');
    if (!token) {
        alert("You are not logged in.");
        return;
    }

    // ✅ Resolve actual button (important)
    const btnElement = clickedElement
        ? clickedElement.closest('button')
        : null;

    const originalContent = btnElement ? btnElement.innerHTML : '';

    isPdfDownloading = true;

    if (btnElement) {
        btnElement.disabled = true;
        btnElement.style.opacity = '0.7';
        btnElement.style.cursor = 'not-allowed';
        btnElement.innerHTML = `
            <span class="material-symbols-outlined spin">progress_activity</span>
            Downloading...
        `;
    }

    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const url = `${API_BASE_URL}/contacts/${id}/pdf`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/pdf'
            }
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const blob = await response.blob();
        const fileURL = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = fileURL;
        a.download = `contact-${id}.pdf`;
        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
        window.URL.revokeObjectURL(fileURL);

    } catch (error) {
        console.error('Error downloading PDF:', error);
        if (typeof showNotification === 'function') {
            showNotification('Failed to download PDF', 'error');
        }
    } finally {
        isPdfDownloading = false;

        if (btnElement) {
            btnElement.disabled = false;
            btnElement.style.opacity = '1';
            btnElement.style.cursor = 'pointer';
            btnElement.innerHTML = originalContent;
        }
    }
}


function attachContactModalCloseHandlers() {
    const closeButtons = document.querySelectorAll('[data-close-modal]');
    closeButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            const modalId = button.getAttribute('data-close-modal');
            if (modalId) closeContactModal(modalId);
        });
    });

    const overlays = document.querySelectorAll('#contactViewModal .modal-overlay, #contactDeleteModal .modal-overlay');
    overlays.forEach(function (overlay) {
        overlay.addEventListener('click', function () {
            const modal = overlay.closest('.modal');
            if (modal && modal.id) {
                closeContactModal(modal.id);
            }
        });
    });
}

function closeContactModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('hidden');

    if (modalId === 'contactDeleteModal') {
        contactIdToDelete = null;
    }
}

function getContactById(id) {
    return contactsData.find(function (contact) {
        return Number(contact.id) === Number(id);
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

initializeContactManagement();
