{ // <--- START BLOCK SCOPE (Isolates these variables from other tabs)

    let studyCentreData = [];
    let isStudyCentreLoading = false;
    let isStudyCentreOperationInProgress = false;
    let currentStudyCentreId = null;
    let studyCentreIdToDelete = null;
    let isPdfOpening = false; // Now this won't conflict with school-integration.js

    // Attach function to window so admin.html can find it
    window.initializeStudyCentre = function() {
        // --- 1. RESET STATE ---
        isStudyCentreLoading = false;
        isStudyCentreOperationInProgress = false;
        isPdfOpening = false;

        // --- 2. SELECT ELEMENTS (Fixed for Spelling Mismatch) ---
        const searchInput = document.getElementById('searchStudyCentres');
        
        // TRY BOTH SPELLINGS: CentREs (British) OR CentERs (American)
        const tableBody = document.getElementById('studyCentresTableBody') || document.getElementById('studyCentersTableBody');
        const cardContainer = document.getElementById('studyCentresCardContainer') || document.getElementById('studyCentersCardContainer');
        const deleteButton = document.getElementById('confirmDeleteStudyCentreButton');
        const viewPdfButton = document.getElementById('viewStudyCentrePdfButton');

        if (!tableBody) {
            console.error('CRITICAL ERROR: Table body not found in HTML.');
            return;
        }

        if (searchInput) {
            searchInput.value = ''; 
            searchInput.removeEventListener('input', filterStudyCentres);
            searchInput.addEventListener('input', filterStudyCentres);
        }

        // --- 3. DEFINE SHARED HANDLER ---
        const handleApplicationAction = function (event) {
            const actionButton = event.target.closest('[data-action]');

            if (actionButton) {
                const id = parseInt(actionButton.getAttribute('data-id'), 10);
                const action = actionButton.getAttribute('data-action');
                event.stopPropagation();

                if (action === 'pdf') {
                    handleDownloadStudyCentrePdf(id);
                } else if (action === 'delete') {
                    openStudyCentreDeleteModal(id);
                }
                return;
            }

            const rowOrCard = event.target.closest('tr, .application-card');
            if (rowOrCard) {
                const id = parseInt(rowOrCard.getAttribute('data-id'), 10);
                if (id) {
                    handleDownloadStudyCentrePdf(id);
                }
            }
        };

        // --- 4. ATTACH LISTENERS ---
        tableBody.removeEventListener('click', handleApplicationAction);
        tableBody.addEventListener('click', handleApplicationAction);

        if (cardContainer) {
            cardContainer.removeEventListener('click', handleApplicationAction);
            cardContainer.addEventListener('click', handleApplicationAction);
        }

        attachStudyCentreModalCloseHandlers();

        if (deleteButton) {
            const newDeleteBtn = deleteButton.cloneNode(true);
            deleteButton.parentNode.replaceChild(newDeleteBtn, deleteButton);
            newDeleteBtn.addEventListener('click', deleteStudyCentre);
        }

        if (viewPdfButton) {
            viewPdfButton.onclick = function () {
                if (currentStudyCentreId) handleDownloadStudyCentrePdf(currentStudyCentreId);
            };
        }

        // --- 5. LOAD DATA ---
        loadStudyCentres();
    };

    async function loadStudyCentres() {
        if (isStudyCentreLoading) return;

        const tableBody = document.getElementById('studyCentresTableBody') || document.getElementById('studyCentersTableBody');
        const cardContainer = document.getElementById('studyCentresCardContainer') || document.getElementById('studyCentersCardContainer');
        const emptyState = document.getElementById('studyCentresEmptyState') || document.getElementById('studyCentersEmptyState');

        isStudyCentreLoading = true;

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
            const response = await apiCall('/study-centre-applications?_t=' + Date.now());

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
                showNotification('Failed to load: ' + (error.message || ''), 'error');
            }
        } finally {
            isStudyCentreLoading = false;
        }
    }

    function renderStudyCentreList(filteredData) {
        const tableBody = document.getElementById('studyCentresTableBody') || document.getElementById('studyCentersTableBody');
        const cardContainer = document.getElementById('studyCentresCardContainer') || document.getElementById('studyCentersCardContainer');
        const emptyState = document.getElementById('studyCentresEmptyState') || document.getElementById('studyCentersEmptyState');
        const countBadge = document.getElementById('totalApplicationsCount');

        const data = filteredData || studyCentreData;

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
        }

        if (cardContainer) {
            cardContainer.innerHTML = data.map((application, index) => `
                <div class="application-card" data-id="${application.id}" style="cursor: pointer;">
                    <div class="row">
                        <span class="label">Sl. No.</span>
                        <span class="value">#${data.length - index}</span>
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

        const deleteBtn = document.getElementById('confirmDeleteStudyCentreButton');
        const originalContent = deleteBtn ? deleteBtn.innerHTML : 'Delete';

        isStudyCentreOperationInProgress = true;

        if (deleteBtn) {
            deleteBtn.innerHTML = '<span class="material-symbols-outlined spin">progress_activity</span> Deleting...';
            deleteBtn.disabled = true;
            deleteBtn.style.opacity = '0.7';
            deleteBtn.style.cursor = 'not-allowed';
        }

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

            if (deleteBtn) {
                deleteBtn.innerHTML = originalContent;
                deleteBtn.disabled = false;
                deleteBtn.style.opacity = '1';
                deleteBtn.style.cursor = 'pointer';
            }

            if (typeof hideLoading === 'function') hideLoading();
        }
    }

    async function handleDownloadStudyCentrePdf(id) {
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
            
            const response = await fetch(`${baseUrl}/study-centre-applications/${id}/pdf`, {
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
            const pdfBlob = new Blob([blob], { type: 'application/pdf' });
            const fileURL = window.URL.createObjectURL(pdfBlob);

            pdfWindow.location.href = fileURL;

        } catch (error) {
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

} // <--- END BLOCK SCOPE