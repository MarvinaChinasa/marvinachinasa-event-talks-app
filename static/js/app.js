// Application State
let state = {
    entries: [],          // Raw feed data
    bookmarks: new Set(), // Set of bookmarked update IDs
    filters: {
        type: 'all',      // 'all', 'feature', 'change', 'deprecation', 'other'
        search: '',       // Search query
        bookmarksOnly: false // Toggle for bookmarks
    },
    sort: 'desc'          // 'desc' (newest first) or 'asc' (oldest first)
};

// DOM Elements
const elements = {
    refreshBtn: document.getElementById('refresh-btn'),
    lastUpdatedText: document.getElementById('last-updated-text'),
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search'),
    typeFilters: document.getElementById('type-filters'),
    bookmarkToggleBtn: document.getElementById('bookmark-toggle-btn'),
    bookmarkCount: document.getElementById('bookmark-count'),
    sortSelect: document.getElementById('sort-select'),
    loadingContainer: document.getElementById('loading-container'),
    notesFeed: document.getElementById('notes-feed'),
    emptyState: document.getElementById('empty-state'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    // Stats
    statTotal: document.getElementById('stat-total'),
    statFeatures: document.getElementById('stat-features'),
    statChanges: document.getElementById('stat-changes'),
    statDeprecations: document.getElementById('stat-deprecations')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadBookmarks();
    setupEventListeners();
    fetchReleaseNotes();
});

// Load Bookmarks from LocalStorage
function loadBookmarks() {
    const saved = localStorage.getItem('bq_release_bookmarks');
    if (saved) {
        try {
            state.bookmarks = new Set(JSON.parse(saved));
        } catch (e) {
            console.error('Error parsing bookmarks', e);
            state.bookmarks = new Set();
        }
    }
    updateBookmarkBadge();
}

// Save Bookmarks to LocalStorage
function saveBookmarks() {
    localStorage.setItem('bq_release_bookmarks', JSON.stringify([...state.bookmarks]));
    updateBookmarkBadge();
}

// Update Bookmark Count Badge
function updateBookmarkBadge() {
    elements.bookmarkCount.textContent = state.bookmarks.size;
    if (state.filters.bookmarksOnly) {
        elements.bookmarkToggleBtn.classList.add('active');
    } else {
        elements.bookmarkToggleBtn.classList.remove('active');
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Refresh
    elements.refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));

    // Search
    elements.searchInput.addEventListener('input', (e) => {
        state.filters.search = e.target.value.trim().toLowerCase();
        elements.clearSearchBtn.style.display = state.filters.search ? 'block' : 'none';
        renderFeed();
    });

    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.filters.search = '';
        elements.clearSearchBtn.style.display = 'none';
        renderFeed();
    });

    // Type Filters (Pills)
    elements.typeFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('pill')) {
            // Remove active from all
            elements.typeFilters.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            // Add to clicked
            e.target.classList.add('active');
            
            state.filters.type = e.target.dataset.filter;
            renderFeed();
        }
    });

    // Bookmark Toggle
    elements.bookmarkToggleBtn.addEventListener('click', () => {
        state.filters.bookmarksOnly = !state.filters.bookmarksOnly;
        updateBookmarkBadge();
        renderFeed();
    });

    // Sorting
    elements.sortSelect.addEventListener('change', (e) => {
        state.sort = e.target.value;
        renderFeed();
    });

    // Reset Filters Button
    elements.resetFiltersBtn.addEventListener('click', resetFilters);
}

// Reset all filters to default
function resetFilters() {
    state.filters.type = 'all';
    state.filters.search = '';
    state.filters.bookmarksOnly = false;
    state.sort = 'desc';

    // Update UI elements
    elements.searchInput.value = '';
    elements.clearSearchBtn.style.display = 'none';
    elements.sortSelect.value = 'desc';
    
    elements.typeFilters.querySelectorAll('.pill').forEach(p => {
        if (p.dataset.filter === 'all') p.classList.add('active');
        else p.classList.remove('active');
    });

    updateBookmarkBadge();
    renderFeed();
}

// Fetch Release Notes from API
async function fetchReleaseNotes(isRefresh = false) {
    showLoading(true);
    const refreshIcon = elements.refreshBtn.querySelector('i');
    if (refreshIcon) {
        refreshIcon.classList.add('spinning');
    }

    try {
        const response = await fetch('/api/release-notes');
        if (!response.ok) throw new Error('Network response was not ok');
        
        state.entries = await response.json();
        
        // Update stats and last updated time
        calculateStats();
        const now = new Date();
        elements.lastUpdatedText.textContent = `Synced: ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        
        renderFeed();
    } catch (error) {
        console.error('Failed to fetch release notes:', error);
        elements.lastUpdatedText.textContent = 'Sync failed';
    } finally {
        showLoading(false);
        if (refreshIcon) {
            refreshIcon.classList.remove('spinning');
        }
    }
}

// Show/Hide Loading Skeletons
function showLoading(isLoading) {
    if (isLoading) {
        elements.loadingContainer.style.display = 'block';
        elements.notesFeed.style.display = 'none';
        elements.emptyState.style.display = 'none';
    } else {
        elements.loadingContainer.style.display = 'none';
        elements.notesFeed.style.display = 'block';
    }
}

// Calculate Stats from the raw data
function calculateStats() {
    let total = 0;
    let features = 0;
    let changes = 0;
    let deprecations = 0;

    state.entries.forEach(entry => {
        entry.updates.forEach(update => {
            total++;
            const type = update.type.toLowerCase();
            if (type.includes('feature')) features++;
            else if (type.includes('change')) changes++;
            else if (type.includes('deprecation') || type.includes('breaking')) deprecations++;
        });
    });

    elements.statTotal.textContent = total;
    elements.statFeatures.textContent = features;
    elements.statChanges.textContent = changes;
    elements.statDeprecations.textContent = deprecations;
}

// Render the Feed based on current state and filters
function renderFeed() {
    let filteredEntries = [];

    state.entries.forEach(entry => {
        const matchingUpdates = entry.updates.filter((update, index) => {
            const updateId = `${entry.date}-${index}`;
            const type = update.type.toLowerCase();

            // 1. Filter by Bookmark
            if (state.filters.bookmarksOnly && !state.bookmarks.has(updateId)) {
                return false;
            }

            // 2. Filter by Type
            if (state.filters.type !== 'all') {
                if (state.filters.type === 'feature' && !type.includes('feature')) return false;
                if (state.filters.type === 'change' && !type.includes('change')) return false;
                if (state.filters.type === 'deprecation' && !(type.includes('deprecation') || type.includes('breaking'))) return false;
                if (state.filters.type === 'other' && (type.includes('feature') || type.includes('change') || type.includes('deprecation') || type.includes('breaking'))) return false;
            }

            // 3. Filter by Search Query
            if (state.filters.search) {
                const inContent = update.content.toLowerCase().includes(state.filters.search);
                const inType = update.type.toLowerCase().includes(state.filters.search);
                const inDate = entry.date.toLowerCase().includes(state.filters.search);
                if (!inContent && !inType && !inDate) return false;
            }

            return true;
        });

        if (matchingUpdates.length > 0) {
            filteredEntries.push({
                ...entry,
                updates: matchingUpdates
            });
        }
    });

    // Sort entries
    filteredEntries.sort((a, b) => {
        const dateA = new Date(a.updated || a.date);
        const dateB = new Date(b.updated || b.date);
        return state.sort === 'desc' ? dateB - dateA : dateA - dateB;
    });

    // Render HTML
    if (filteredEntries.length === 0) {
        elements.notesFeed.style.display = 'none';
        elements.emptyState.style.display = 'flex';
    } else {
        elements.notesFeed.style.display = 'block';
        elements.emptyState.style.display = 'none';

        elements.notesFeed.innerHTML = filteredEntries.map(entry => {
            return `
                <div class="entry-group">
                    <div class="entry-header">
                        <div class="entry-dot"></div>
                        <span class="entry-date">${entry.date}</span>
                    </div>
                    <div class="entry-updates">
                        ${entry.updates.map((update) => {
                            // Find index in the main state to maintain the correct ID
                            const origIndex = state.entries.find(e => e.date === entry.date).updates.findIndex(u => u.content === update.content);
                            const updateId = `${entry.date}-${origIndex}`;
                            const isBookmarked = state.bookmarks.has(updateId);
                            const typeClass = getUpdateTypeClass(update.type);
                            
                            return `
                                <div class="update-card" style="${getTypeCssVariables(update.type)}" data-id="${updateId}" onclick="toggleCardSelection(event, '${updateId}')">
                                    <div class="update-card-header">
                                        <span class="update-badge">${update.type}</span>
                                        <div class="card-actions">
                                            <button class="card-action-btn tweet-btn" title="Tweet about this update" onclick="event.stopPropagation(); tweetUpdate('${entry.date}', '${update.type}', ${origIndex})">
                                                <i data-lucide="twitter"></i>
                                            </button>
                                            <button class="card-action-btn share-btn" title="Copy link to clipboard" onclick="event.stopPropagation(); copyShareLink('${entry.date}', '${entry.link}')">
                                                <i data-lucide="share-2"></i>
                                            </button>
                                            <button class="card-action-btn bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" title="Bookmark this update" onclick="event.stopPropagation(); toggleBookmark('${updateId}')">
                                                <i data-lucide="star"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="update-content">
                                        ${update.content}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');

        // Re-bind Lucide icons
        lucide.createIcons();
    }
}

// Helpers for CSS Variable mapping based on update type
function getUpdateTypeClass(type) {
    const t = type.toLowerCase();
    if (t.includes('feature')) return 'feature';
    if (t.includes('change')) return 'change';
    if (t.includes('deprecation') || t.includes('breaking')) return 'deprecation';
    if (t.includes('fix') || t.includes('bug')) return 'fix';
    return 'other';
}

function getTypeCssVariables(type) {
    const t = type.toLowerCase();
    if (t.includes('feature')) {
        return `--type-color: var(--color-feature); --type-bg: var(--color-feature-bg); --type-border: var(--color-feature-border);`;
    }
    if (t.includes('change')) {
        return `--type-color: var(--color-change); --type-bg: var(--color-change-bg); --type-border: var(--color-change-border);`;
    }
    if (t.includes('deprecation') || t.includes('breaking')) {
        return `--type-color: var(--color-deprecation); --type-bg: var(--color-deprecation-bg); --type-border: var(--color-deprecation-border);`;
    }
    if (t.includes('fix') || t.includes('bug')) {
        return `--type-color: var(--color-fix); --type-bg: var(--color-fix-bg); --type-border: var(--color-fix-border);`;
    }
    return `--type-color: var(--color-other); --type-bg: var(--color-other-bg); --type-border: var(--color-other-border);`;
}

// Toggle Card Selection
window.toggleCardSelection = function(event, id) {
    // Don't select if clicking on a link or inside a link
    if (event.target.tagName === 'A' || event.target.closest('a')) return;
    
    const card = document.querySelector(`.update-card[data-id="${id}"]`);
    if (card) {
        card.classList.toggle('selected');
    }
};

// Bookmark Toggle Handler
window.toggleBookmark = function(id) {
    if (state.bookmarks.has(id)) {
        state.bookmarks.delete(id);
    } else {
        state.bookmarks.add(id);
    }
    saveBookmarks();
    renderFeed();
};

// Copy Share Link Handler
window.copyShareLink = function(date, link) {
    const textToCopy = link || `https://docs.cloud.google.com/bigquery/docs/release-notes#${date.replace(/\s+/g, '_')}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
        // Simple toast notification
        showToast('Link copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy link: ', err);
    });
};

// Tweet Update Handler
window.tweetUpdate = function(date, type, index) {
    const entry = state.entries.find(e => e.date === date);
    if (!entry) return;
    const update = entry.updates[index];
    if (!update) return;

    // Strip HTML tags from content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = update.content;
    let plainText = tempDiv.textContent || tempDiv.innerText || '';
    plainText = plainText.replace(/\s+/g, ' ').trim();

    // Prepare Tweet text
    const prefix = `BigQuery ${type} (${date}): `;
    const hashtags = ` #BigQuery #GoogleCloud`;
    const link = entry.link || `https://docs.cloud.google.com/bigquery/docs/release-notes`;
    
    // Twitter counts any URL as 23 characters.
    const urlLength = 23;
    const reservedLength = prefix.length + hashtags.length + urlLength + 6; // spacing
    const maxContentLength = 280 - reservedLength;

    let contentText = plainText;
    if (contentText.length > maxContentLength) {
        contentText = contentText.substring(0, maxContentLength - 3) + '...';
    }

    const tweetText = `${prefix}"${contentText}"\n\n${link}${hashtags}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
};

// Simple Toast Notification helper
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `<i data-lucide="check-circle" style="color: #22c55e; width: 16px; height: 16px;"></i> <span>${message}</span>`;
    document.body.appendChild(toast);
    lucide.createIcons();
    
    // Toast CSS (added dynamically to keep style.css clean)
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        background: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        color: '#f3f4f6',
        padding: '10px 18px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: 'sans-serif',
        fontSize: '0.85rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
        zIndex: '9999',
        transform: 'translateY(100px)',
        opacity: '0',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    });
    
    // Trigger animation
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    }, 50);
    
    // Remove toast
    setTimeout(() => {
        toast.style.transform = 'translateY(100px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

