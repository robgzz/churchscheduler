# Westbury Church Hub V5.2.0

## Reliable roster import + administrator capability synchronization

V5.2.0 is a focused reliability release for the People roster importer.

### Root cause fixed

V5.1 referenced `findValue(...)` from the member/song import paths but the helper was not defined or imported. The browser successfully uploaded the file, but the server failed while processing the rows and returned `findValue is not defined`.

V5.2 moves header lookup into the canonical spreadsheet parser (`importFormats.js`) and imports it explicitly from the bulk-import service. Header matching is normalized for case, accents, and spacing.

### Administrator columns are now functional

Owner-only roster import now understands:

- `Admin`
- `Administrator`
- `Administrador`
- `Admin Access`

A truthy value (`Yes`, `Sí`, `X`, `1`, `True`, `✓`) sets `adminAccess=true`. A false/blank value removes ordinary administrator access when the Admin column is present. The current Church Administrator always retains admin access.

Existing user accounts are synchronized with the member profile after import without resetting passwords. Sessions are revoked only when an existing account's authorization state changes so the new permissions apply on the next sign-in.

### Church Administrator protection

`ChurchAdministrator` in a roster may preserve the current Church Administrator, but spreadsheet import cannot transfer ownership or create another Church Administrator. Such an attempt is rejected before import writes begin.

### Westbury final roster included

`imports/Westbury-Members-Final-Upload.xlsx` is included and contains the requested administrators:

- Alex Infante
- Emmanuel Garcia
- Luis Betanco
- Manuel Rodriguez
- Roberto Gonzalez
- Ruben Maldonado

Roberto Gonzalez remains the Church Administrator.

### Import result UI

The Admin Console now reports administrator access granted/removed and account permission synchronization in the import result.

### Infrastructure

No new Azure resources or tables are required. Deploy normally through GitHub Actions.
