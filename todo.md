
- [x] Keyword search across ticket title, ID, description, assignee, labels
- [x] Quick-filter chips for status, priority, type, assignee
- [x] Active filter summary bar with individual clear buttons
- [x] Clear-all filters button
- [x] Filter state persists while switching between tickets

- [x] Filter preset storage (localStorage, per project)
- [x] Save current filters as a named preset
- [x] One-click preset chips to restore a saved filter combination
- [x] Delete individual presets
- [x] Built-in presets: My Open Tickets, Bugs, High Priority

- [x] Add optional dueAt field to Ticket type
- [x] Date picker in TicketDetail panel to set/clear due date
- [x] Overdue red badge and due-soon amber badge in TicketRow list view
- [x] Overdue built-in preset in PresetBar

- [x] Dark mode toggle (system default + manual switch)
- [x] Notes section per ticket (rich text, persisted in JSON)
- [x] Google Drive adapter: OAuth PKCE, JSON sync, file attachments
- [x] OneDrive/SharePoint adapter: OAuth PKCE, JSON sync, file attachments
- [x] Dropbox adapter: OAuth PKCE, JSON sync, file attachments
- [x] File attachment UI in ticket detail (upload, list, download, delete)
- [x] Cloud storage settings UI with provider picker and connect/disconnect

- [x] Pull from cloud button on Welcome Screen (detects connected provider)
- [x] pullFromCloud helper in cloudStorage lib (Google Drive, OneDrive, Dropbox)
- [x] AppContext exposes pullFromCloud action for WelcomeScreen

- [x] Refresh button in toolbar — re-reads local JSON file or pulls from cloud, shows staleness badge
- [x] Staleness detection — compare in-memory lastUpdated vs file/cloud lastUpdated
- [x] Export to CSV (all tickets for current project or all projects)
- [x] Export to Excel (.xlsx) using SheetJS
- [x] Import from CSV with column mapping and validation
- [x] Import from Excel (.xlsx) with column mapping and validation
- [x] Downloadable CSV/Excel import template with example rows and column docs
- [x] Import/Export UI panel in Settings → Data File tab
