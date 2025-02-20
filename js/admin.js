document.addEventListener('DOMContentLoaded', () => {
    const promotionForm = document.getElementById('promotionForm');
    const promotionsTable = document.getElementById('promotionsTable');
    
    // Temporary storage for promotions (will be replaced with backend storage)
    let promotions = [];

    // Initialize datetime-local input with current time
    const scheduledTimeInput = document.getElementById('scheduledTime');
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    scheduledTimeInput.value = now.toISOString().slice(0, 16);
    scheduledTimeInput.min = now.toISOString().slice(0, 16);

    // Handle form submission
    promotionForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = {
            id: Date.now(), // Temporary ID generation
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            scheduledTime: document.getElementById('scheduledTime').value,
            status: 'SCHEDULED'
        };

        // Handle image file
        const imageFile = document.getElementById('image').files[0];
        if (imageFile) {
            // TODO: Implement image upload to backend
            formData.imageName = imageFile.name;
        }

        // Add to local storage (temporary)
        promotions.push(formData);
        updatePromotionsTable();
        promotionForm.reset();

        // Reset datetime to current
        const newNow = new Date();
        newNow.setMinutes(newNow.getMinutes() - newNow.getTimezoneOffset());
        scheduledTimeInput.value = newNow.toISOString().slice(0, 16);

        // Show success message (temporary)
        alert('Promotion scheduled successfully!');
    });

    // Update promotions table
    function updatePromotionsTable() {
        const tbody = promotionsTable.querySelector('tbody');
        
        if (promotions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">No promotions scheduled</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = promotions
            .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime))
            .map(promotion => `
                <tr>
                    <td>${escapeHtml(promotion.title)}</td>
                    <td>${formatDateTime(promotion.scheduledTime)}</td>
                    <td>${promotion.status}</td>
                    <td>
                        <button onclick="editPromotion(${promotion.id})" class="action-button edit-button">Edit</button>
                        <button onclick="deletePromotion(${promotion.id})" class="action-button delete-button">Delete</button>
                    </td>
                </tr>
            `)
            .join('');
    }

    // Helper function to format datetime
    function formatDateTime(dateTimeStr) {
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateTimeStr).toLocaleString('en-US', options);
    }

    // Helper function to escape HTML (prevent XSS)
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Placeholder edit function (to be implemented)
    window.editPromotion = (id) => {
        const promotion = promotions.find(p => p.id === id);
        if (promotion) {
            // TODO: Implement edit functionality
            alert('Edit functionality will be implemented with backend integration');
        }
    };

    // Placeholder delete function
    window.deletePromotion = (id) => {
        if (confirm('Are you sure you want to delete this promotion?')) {
            promotions = promotions.filter(p => p.id !== id);
            updatePromotionsTable();
        }
    };

    // Update subscriber statistics (placeholder)
    function updateStats() {
        // TODO: Fetch real statistics from backend
        document.querySelectorAll('.stat-number').forEach(stat => {
            stat.textContent = '0';
        });
    }

    // Initialize the admin interface
    updatePromotionsTable();
    updateStats();
});
