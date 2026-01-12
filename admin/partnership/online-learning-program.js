{ // Start Block Scope

    let onlineLearningData = [];
    let isOnlineLearningLoading = false;
    let isOnlineLearningOperationInProgress = false;
    let currentOnlineLearningId = null;
    let onlineLearningIdToDelete = null;
    let isPdfOpening = false;

    // --- FIX 1: Attach to window so admin.html can call it later ---
    window.initializeOnlineLearning = function() {
        console.log('Initializing Online Learning module');
        
        // --- FIX 2: Reset state on load ---
        isOnlineLearningLoading = false;
        isOnlineLearningOperationInProgress = false;
        isPdfOpening = false;

        const searchInput = document.getElementById('searchOnlineLearning');
        const tableBody = document.getElementById('onlineLearningTableBody');
        const cardContainer = document.getElementById('onlineLearningCardContainer');
        const deleteButton = document.getElementById('confirmDeleteOnlineLearningButton');
        const viewPdfButton = document.getElementById('viewOnlineLearningPdfButton');

        if (!tableBody) {
            console.warn('Online learning table body not found');
            return;
        }

        if (searchInput) {
            searchInput.value = ''; // Clear search
            searchInput.removeEventListener('input', filterOnlineLearning);
            searchInput.addEventListener('input', filterOnlineLearning);
        }

        // Shared handler function
        const handleApplicationAction = function (event) {
            const actionButton = event.target.closest('[data-action]');

            if (actionButton) {
                const id = parseInt(actionButton.getAttribute('data-id'), 10);
                const action = actionButton.getAttribute('data-action');

                event.stopPropagation();

                if (action === 'pdf') {
                    handleDownloadOnlineLearningPdf(id);
                } else if (action === 'delete') {
                    openOnlineLearningDeleteModal(id);
                }
                return;
            }

            const rowOrCard = event.target.closest('tr, .application-card');
            if (rowOrCard) {
                const id = parseInt(rowOrCard.getAttribute('data-id'), 10);
                if (id) {
                    handleDownloadOnlineLearningPdf(id);
                }
            }
        };

        // Attach listeners (Remove old ones first)
        tableBody.removeEventListener('click', handleApplicationAction);
        tableBody.addEventListener('click', handleApplicationAction);

        if (cardContainer) {
            cardContainer.removeEventListener('click', handleApplicationAction);
            cardContainer.addEventListener('click', handleApplicationAction);
        }

        attachOnlineLearningModalCloseHandlers();

        if (deleteButton) {
            // Clone to strip old listeners
            const newDeleteBtn = deleteButton.cloneNode(true);
            deleteButton.parentNode.replaceChild(newDeleteBtn, deleteButton);
            newDeleteBtn.addEventListener('click', deleteOnlineLearning);
        }

        if (viewPdfButton) {
            viewPdfButton.onclick = function () {
                if (currentOnlineLearningId) {
                    handleDownloadOnlineLearningPdf(currentOnlineLearningId);
                }
            };
        }

        loadOnlineLearning();
    };

    async function loadOnlineLearning() {
        if (isOnlineLearningLoading) return;

        const tableBody = document.getElementById('onlineLearningTableBody');
        const cardContainer = document.getElementById('onlineLearningCardContainer');
        const emptyState = document.getElementById('onlineLearningEmptyState');

        isOnlineLearningLoading = true;

        if (tableBody) {
            tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 3rem;">
                    <div class="loader" style="margin: 0 auto 1rem;"></div>
                    <p style="color: #6b7280;">Loading applications...</p>
                </td>
            </tr>
        `;
            if (cardContainer) cardContainer.innerHTML = '';
            if (emptyState) emptyState.classList.add('hidden');
        }

        try {
            // Add timestamp to prevent caching
            const response = await apiCall('/distance-learning?_t=' + Date.now());

            if (Array.isArray(response)) {
                onlineLearningData = response;
            } else if (response && Array.isArray(response.data)) {
                onlineLearningData = response.data;
            } else {
                onlineLearningData = [];
            }

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
        }
    }

    function renderOnlineLearningList(filteredData) {
        const tableBody = document.getElementById('onlineLearningTableBody');
        const cardContainer = document.getElementById('onlineLearningCardContainer');
        const emptyState = document.getElementById('onlineLearningEmptyState');
        const countBadge = document.getElementById('totalApplicationsCount');

        const data = filteredData || onlineLearningData;

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

        if (tableBody) {
            tableBody.innerHTML = data.map((application, index) => `
            <tr data-id="${application.id}" style="cursor: pointer;">
                <td>${data.length - index}</td>
                <td>${escapeHtml(application.applicant_name || '-')}</td>
                <td>${escapeHtml(application.center_area || '-')}</td>
                <td>${application.number_of_schools || '-'}</td>
                <td>${formatDate(application.agreement_date)}</td>
                <td>
                    <div class="projects-actions">
                        <button class="btn btn-primary btn-sm"
                            data-action="pdf"
                            data-id="${application.id}">
                            <span class="material-symbols-outlined">picture_as_pdf</span>
                        </button>
                        <button class="btn btn-danger btn-sm"
                            data-action="delete"
                            data-id="${application.id}">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        }

        if (cardContainer) {
            cardContainer.innerHTML = data.map((application, index) => `
            <div class="application-card" data-id="${application.id}" style="cursor: pointer;">
                <div class="row">
                    <span class="label">#</span>
                    <span class="value">#${data.length - index}</span>
                </div>
                <div class="row">
                    <span class="label">Applicant</span>
                    <span class="value">${escapeHtml(application.applicant_name || '-')}</span>
                </div>
                <div class="row">
                    <span class="label">Center Area</span>
                    <span class="value">${escapeHtml(application.center_area || '-')}</span>
                </div>
                <div class="row">
                    <span class="label">Schools</span>
                    <span class="value">${application.number_of_schools || '-'}</span>
                </div>
                <div class="row">
                    <span class="label">Date</span>
                    <span class="value">${formatDate(application.agreement_date)}</span>
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

        const deleteBtn = document.getElementById('confirmDeleteOnlineLearningButton');
        const originalContent = deleteBtn ? deleteBtn.innerHTML : 'Delete';

        isOnlineLearningOperationInProgress = true;

        if (deleteBtn) {
            deleteBtn.innerHTML = '<span class="material-symbols-outlined spin">progress_activity</span> Deleting...';
            deleteBtn.disabled = true;
            deleteBtn.style.opacity = '0.7';
            deleteBtn.style.cursor = 'not-allowed';
        }

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

            if (deleteBtn) {
                deleteBtn.innerHTML = originalContent;
                deleteBtn.disabled = false;
                deleteBtn.style.opacity = '1';
                deleteBtn.style.cursor = 'pointer';
            }

            if (typeof hideLoading === 'function') hideLoading();
        }
    }

    async function handleDownloadOnlineLearningPdf(id) {
        if (isPdfOpening) return;
        if (!id) return;

        const token = localStorage.getItem('adminToken');
        if (!token) {
            alert("You are not logged in.");
            return;
        }
        const pdfWindow = window.open('', '_blank');
        if (!pdfWindow) {
            alert("Please allow popups for this site to view the PDF.");
            return;
        }
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
        const originalContent = btn ? btn.innerHTML : ''; 

        if (btn) {
            btn.innerHTML = '<span class="material-symbols-outlined spin">downloading</span> ...';
            btn.disabled = true;
            btn.style.opacity = '0.7';
        }
        try {
            const baseUrl = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://127.0.0.1:8000/api';

            const response = await fetch(`${baseUrl}/distance-learning/${id}/pdf`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/pdf'
                }
            })
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }
            const blob = await response.blob();
            const pdfBlob = new Blob([blob], { type: 'application/pdf' });
            const fileURL = window.URL.createObjectURL(pdfBlob);

            pdfWindow.location.href = fileURL;
        } catch (error) {
            console.error('PDF Error:', error);
            if (pdfWindow) pdfWindow.close(); 

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

    // --- FIX 3: Removed the auto-call at the end ---
    // initializeOnlineLearning(); // <--- DELETED THIS LINE

} // End Block Scope