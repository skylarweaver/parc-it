# Background and Motivation

Parc-It! is an anonymous office request board for the 0xPARC office, inspired by the double-blind project. The goal is to allow members of a specific group (e.g., the 0xPARC GitHub org) to submit office requests anonymously, with cryptographic proof that the request comes from a group member, but without revealing which member. The app will feature a retro 1990s web interface and will be built with Next.js, Tailwind, shadcn/ui, Supabase, and custom cryptography (to be integrated later).

Key differences from double-blind:
- Focused on office requests, not general messages
- Backend for storing requests and managing group membership
- Manual admin management of group members via UI
- Support for both RSA and Ed25519 keys (circuit stubs for now)
- Cleaner, well-documented, and organized codebase
- Retro UI with improved design
- Login via "parc-it key" only (no OAuth/passwords)

# Key Challenges and Analysis

- **Anonymous Authentication:** Ensuring only group members can post, while preserving anonymity. Admins are identified by hardcoded SSH pub keys in the backend.
- **Group Membership Management:** Admins can add/remove GitHub usernames via the UI. The backend fetches and caches the first RSA key from each user's GitHub .keys page every 10 minutes.
- **Request Verification:** Each request includes a group signature (stub for now). The "Verify" modal displays dummy technical metadata.
- **UI/UX:** Desktop-first, always-on retro theme, with a clear separation between public and admin-only actions.
- **Extensibility:** Future support for upvotes, comments, and more cryptographic features.
- **Documentation:** All documentation will be placed in a dedicated docs folder.

# Upvoting Feature with Nullifiers (Plonky2 Group Signature)

## Background and Motivation

- Enable anonymous upvoting of office requests, ensuring each group member can upvote each request only once.
- Use the new Plonky2 WASM group signature API with nullifier support to enforce one-vote-per-user-per-request, while preserving anonymity.
- Nullifiers are cryptographic values unique to (user, request) but unlinkable to user identity.

## Key Challenges and Analysis

- **Nullifier Generation:**
  - Must be unique per (user, request) and unlinkable to user.
  - Use request ID as the nullifier context when generating the group signature.
- **Signature Verification:**
  - Backend must verify the group signature and extract the nullifier using the WASM verifier.
  - Prevent double-voting by checking if the nullifier already exists for the request.
- **Data Model:**
  - Store upvote records as (request_id, nullifier, timestamp) in a new table.
  - Enforce uniqueness on (request_id, nullifier).
- **UI/UX:**
  - Upvote button on each request.
  - Show upvote count.
  - Disable upvote button if already upvoted (if possible to check on client).
  - Show feedback if user tries to upvote twice.
- **Security:**
  - Only group members can upvote (enforced by group signature verification).
  - Nullifiers must not be guessable or linkable to users.

## High-level Task Breakdown (Upvoting)

1. **Update Data Model**
   - [x] Add `request_upvotes` table: `id`, `request_id`, `nullifier`, `created_at`.
   - [x] Add unique constraint on (`request_id`, `nullifier`).

2. **Client: Upvote Flow**
   - [ ] Add upvote button to each request in the UI.
   - [ ] On click, generate group signature with nullifier (context = request ID).
   - [ ] Send signature and request ID to backend.

3. **Backend: Upvote Endpoint**
   - [ ] Edge Function: verify group signature and extract nullifier using WASM.
   - [ ] Check if nullifier already exists for this request.
   - [ ] If not, record upvote; if yes, reject as duplicate.

4. **Client: Upvote State**
   - [ ] Fetch upvote counts for each request.
   - [ ] Optionally, fetch whether current user has upvoted (if possible without deanonymizing).
   - [ ] Disable upvote button if already upvoted.

5. **Testing**
   - [ ] Test upvote flow, double-voting prevention, and anonymity.

## Success Criteria (Upvoting)
- Users can upvote requests anonymously.
- Each user can upvote each request only once.
- Upvote counts are accurate.
- No user can upvote as a non-member.
- No user can upvote the same request twice.
- No user's identity is revealed by upvoting.

# High-level Task Breakdown

1. **Project Scaffolding**
   - [x] Set up Next.js app with Tailwind and shadcn/ui in `parc-it/`
   - [x] Create initial docs folder

2. **Data Models & Supabase Schema**
   - [x] Define Supabase tables: `office_requests`, `group_members`, `admins` (future: `upvotes`, `comments`)
     - [x] Write SQL for each table and document in `/docs/schema.sql`
     - [x] Apply schema to Supabase project (manual or via migration)
     - [x] Verify tables exist in Supabase dashboard
   - [x] Implement periodic GitHub key fetching
     - [x] Write a Supabase Edge Function (or scheduled job) to:
         - Fetch the first RSA key from each group member's GitHub .keys page
         - Update the `public_key` and `last_key_fetch` fields in `group_members`
         - TODO for later: Run every 10 minutes (use Supabase scheduled jobs or external scheduler)
     - [x] Test the function with a sample GitHub username
     - [x] Document the function and its deployment in `/docs/`

3. **Authentication & Admin Management**
   - [x] Implement login with "parc-it key" (with double-blind-style validation and derivation)
   - [ ] Admin UI for managing group members
     - [ ] Detect admin privilege by checking if the logged-in user's public key matches a hardcoded list of admin SSH pub keys (from config or env)
     - [ ] Show admin-only UI for adding/removing GitHub usernames (and their keys) to/from the `group_members` table
     - [ ] Integrate with Supabase to perform add/remove actions
     - [ ] Show clear user-facing messages for success/failure
     - [ ] Only show admin UI if user is an admin

4. **Frontend UI**
   - [ ] Home page: feed of requests, verify modal, sidebar with group members
   - [ ] Add request modal (emoji picker, text field, dummy signature)
   - [ ] Admin-only delete button for requests
   - [ ] Retro theme and styling per spec

5. **Request Verification & Key Display**
   - [ ] Implement "Verify" modal with dummy data
   - [ ] Sidebar: show group members, avatars, key modal (public key, copy/download, GitHub .keys link)

6. **Documentation**
   - [ ] Write setup and usage docs in `docs/`

7. **Future-proofing**
   - [ ] Scaffold for upvotes/comments (optional, stubs only)
   - [ ] Placeholder cryptography functions

3a. **Fix CORS Issue for GitHub Key Fetching in Admin UI**
   - [ ] Implement a Next.js API route (`/api/github-keys`) that fetches a user's public SSH keys from GitHub server-side
     - [ ] Accepts a `username` query parameter
     - [ ] Fetches `https://github.com/{username}.keys` and returns the keys as plain text or JSON
     - [ ] Handles errors (user not found, no keys, network issues)
   - [ ] Update Admin UI to call this API route instead of fetching from GitHub directly in the browser
   - [ ] Test adding a member via the Admin UI and verify no CORS errors occur
   - [ ] Show clear error messages for all failure cases

2. **Add Request Modal**
   - [ ] Add Request button is always visible to everyone, but greyed out (disabled) unless logged in
   - [ ] Only visible (enabled) to logged-in group members
   - [ ] Modal with emoji picker and text field
   - [ ] On submit, insert a new row into `office_requests` (with dummy signature for now)
   - [ ] Show success/error feedback

8. **UI Overhaul: Retro Layout & Custom Copy**
   - [ ] Remove all Next.js starter/demo content from the main page
   - [ ] Formalize the layout to match the retro Windows 95-style mockup:
     - [ ] Add a title bar/header styled like Windows 95
     - [ ] Main content area: feed of requests in retro panels
     - [ ] Sidebar: group members with avatars and key icons
     - [ ] Large red "Add Request" button in the bottom left
   - [ ] Add custom copy explaining Parc-It! and its anonymous, cryptographic group signature system, tailored to the 0xPARC office
   - [ ] Ensure all placeholder/demo content is removed

# Project Status Board

- [x] Project scaffolding
- [x] Data models/schema
  - [x] Define Supabase tables and document schema
  - [x] Apply schema to Supabase
  - [x] Implement GitHub key fetcher
- [ ] Auth/admin management
  - [x] Implement login with parc-it key (modal UI and helper scaffolding done; port logic next)
  - [ ] Admin UI for group member management
  - [ ] Refactor admin privilege logic to use Supabase `admins` table
  - [ ] Update admin message UI for success/error color
- [ ] Frontend UI
- [ ] Request verification/key display
- [ ] Documentation
- [ ] Future-proofing
  - [ ] TODO: Revisit GitHub key fetcher scheduling—either set up a Supabase scheduled job or trigger the function on every app load.
- [ ] Fix CORS for GitHub key fetch in Admin UI
  - [ ] Implement Next.js API route for GitHub keys
  - [ ] Update Admin UI to use API route
  - [ ] Test and verify CORS is resolved
- [In Progress] Implement office request feed and submission
  - [ ] Request feed UI
  - [ ] Add request modal (button always visible, only enabled for logged-in group members)
  - [ ] Verify modal (dummy)
  - [ ] Admin-only delete
  - [ ] Sidebar group members
  - [ ] Retro styling
- [In Progress] Implement group member selection in Add Request modal, remove submitter identity from requests, and update backend schema.

# Success Criteria for Data Models & Supabase Schema

- All required tables are defined in Supabase and documented in `/docs/schema.sql`
- GitHub key fetcher runs on a schedule and updates group member keys in the database
- Manual test: Add a GitHub username, fetch key, and verify in Supabase

# Success Criteria for GitHub Key Fetcher

- Edge Function (or job) fetches and updates keys for all group members
- `public_key` and `last_key_fetch` fields are updated in Supabase
- Manual test: Add a GitHub username, run the function, and verify the key is fetched and stored
- Function and deployment steps are documented in `/docs/`

# Success Criteria for Auth/Admin Management

- Users can log in with a parc-it key and are recognized as group members
- **Key derivation and validation logic matches double-blind:**
  - Public key is extracted from the signature using [`sshSignatureToPubKey`](double-blind/src/helpers/sshFormat.ts)
  - Signature is validated for the expected message using [`getCircuitInputs`](double-blind/src/helpers/groupSignature/sign.ts)
- Admins can add/remove group members via the UI
- Only admins see admin controls
- Admin privileges are determined by hardcoded SSH pub keys
- Session is managed in local storage (no OAuth/passwords)
- Error handling for invalid keys and unauthorized actions

# Success Criteria for Admin UI

- Only admins (by SSH pub key) see the group member management UI
- Admins can add a GitHub username (and avatar/key) to the `group_members` table
- Admins can remove a GitHub username from the table
- All actions show clear success/failure messages
- Non-admins do not see admin controls

# Success Criteria for GitHub Key API Route
- API route `/api/github-keys` fetches and returns SSH keys for a given GitHub username
- Admin UI uses this route and no longer triggers CORS errors
- Adding a member via Admin UI works end-to-end (avatar and key fetched, member added)
- All error cases (user not found, no keys, network error) are handled and shown in the UI

# Executor's Feedback or Assistance Requests

- Project scaffolding is complete and committed:
  - Next.js app runs with Tailwind and shadcn/ui working (test button renders)
  - Directory structure (`components/`, `pages/`, `lib/`, `styles/`) is in place
  - README and docs folder created
- Ready for Planner review before proceeding to the next major task (Data models/schema)
- Login modal UI created in `src/components/LoginModal.tsx`
- Helper functions for parc-it key derivation/validation scaffolded in `src/helpers/parcItKey.ts`
- Next step: Port/adapt the actual key extraction and validation logic from double-blind
- [In Progress] Refactoring admin privilege logic to use Supabase `admins` table and updating admin message UI for color feedback.
- [In Progress] Implementing always-visible Add Request button, disabled unless logged in, as first step of request feed and submission feature.
- [In Progress] Adding multi-select group member UI to Add Request modal, updating request submission to include only the selected group, and preparing Supabase schema changes (remove posted_by, add group_members array).
- Added `request_upvotes` table to `docs/schema.sql` for anonymous upvoting with nullifiers. Table includes unique constraint on (request_id, nullifier) to prevent double-voting.
- Next: Implement upvote button in the UI and client-side signature generation with nullifier.
- [x] Deduplicate Plonky2 signature verification logic: created verifyShared.ts, refactored both workers to use it. All verification logic is now DRY and consistent.

# Lessons

- Use docs folder for documentation
- Desktop-first, always-on retro theme
- No OAuth or passwords; login via parc-it key only
- Admins identified by hardcoded SSH pub keys
- Fetch only first RSA key from GitHub .keys every 10 minutes
- If initializing Next.js in a non-empty directory, ensure no conflicting files exist (e.g., move `.cursor/` temporarily)

# High-level User Flow

## 1. Public (Unauthenticated) User Flow
- User visits the Parc-It! home page.
- Sees a vertical feed of anonymous office requests:
  - Each request displays an emoji, title/description, group signature avatars, and a "Verify" button.
- Sidebar shows a live list of group members (GitHub usernames, avatars, key icon for modal with public key info).
- User can click "Verify" on any request to open a modal with technical metadata (dummy data for now).
- User can click the key icon next to any member to view/copy/download their public key and verify it on GitHub.
- User can view all requests and group members, but cannot submit requests or manage members.
- Large retro-styled "➕" button is visible but prompts login if clicked.

## 2. Login Flow
- User clicks the "➕" button or a "Login" button.
- User is prompted to paste their "parc-it key" from which the app can derive the public key. This should be done similarly to the double-blind project how the double-blind key is inputed and the public key was derived.
- App checks if the derived public key matches any in the current group member list.
- If valid, user is logged in and can submit requests.
- If not, user is shown an error and remains in public view.

## 3. Authenticated User Flow
- User sees the same home page and sidebar as public users.
- User can now click the "➕" button to open the New Request modal:
  - Enter request text
  - Select emoji
  - (Stub) Locally generate a dummy group signature
  - Submit request (sent to backend with signature and metadata)
- User's session is kept in local storage (no password, no OAuth).

## 4. Admin Flow
- Admins are identified by hardcoded SSH pub keys in the backend.
- Admins see additional UI in the sidebar for managing group members:
  - Add/remove GitHub usernames
  - View/edit group member list
- Admins can delete any office request (delete button visible on each request).

# Application Layout & Functionality

- **Header:**
  - App title (📝 Parc-It!) and subtitle (explaining anonymous group signatures)
  - Retro 90s style, pixel fonts, and sparkle/star accents

- **Main Content (Center Column):**
  - Feed of office requests (emoji, description, avatars, verify button)
  - Each request is a panel with retro styling
  - "Verify" button opens modal with signature metadata (dummy for now)

- **Sidebar (Right Column):**
  - List of group members (GitHub username, avatar, key icon)
  - Key icon opens modal with public key, copy/download, GitHub .keys link
  - Admin controls (if admin): add/remove members

- **Add Request Button (Bottom-Left):**
  - Large retro "➕" button (styled like a panic/eject button)
  - Opens New Request modal (if logged in), otherwise prompts login

- **Modals:**
  - Verify modal: shows technical details of the group signature (dummy data)
  - Key modal: shows public key, copy/download, GitHub verification link
  - New Request modal: text input, emoji picker, submit button
  - Login modal: paste parc-it key, error handling

- **Styling:**
  - Desktop-first, always-on retro Windows 95 theme
  - Pixelated avatars, beveled panels, retro buttons, sparkle/star accents 

# Technical Architecture and Data Model Design

## Technical Architecture Overview

**Frontend:**
- Next.js app in `parc-it/`
- Uses Tailwind CSS and shadcn/ui for styling and UI components
- Handles all user flows (public, login, authenticated, admin)
- Communicates with Supabase backend via REST or Supabase client SDK
- Local storage/session for login state

**Backend:**
- Supabase (Postgres + Auth + Storage + Edge Functions)
- Handles:
  - Office request CRUD
  - Group member management (admin only)
  - Admin authentication (via hardcoded SSH pub keys)
  - Periodic GitHub key fetching (server-side function/cron)
- Exposes RESTful endpoints or uses Supabase RPC for custom logic

**Cryptography:**
- Placeholder/dummy functions for group signatures and key verification
- Future: Plonky2 circuits for RSA/Ed25519 proofs

## Data Model Design

**Tables:**

1. `office_requests`
   - `id` (uuid, pk)
   - `created_at` (timestamp)
   - `emoji` (string)
   - `description` (text)
   - `signature` (jsonb or text, for group signature/proof)
   - `group_id` (uuid, fk to group)
   - `public_signal` (text/hash)
   - `posted_by` (public key, not linked to user for anonymity)
   - `deleted` (boolean, default false)
   - `metadata` (jsonb, optional)

2. `group_members`
   - `id` (uuid, pk)
   - `github_username` (string, unique)
   - `avatar_url` (string)
   - `public_key` (text, first RSA key from GitHub)
   - `last_key_fetch` (timestamp)
   - `is_admin` (boolean, default false)

3. `admins`
   - `id` (uuid, pk)
   - `public_key` (text, hardcoded in backend for admin check)
   - `github_username` (string, optional)

4. (Future) `upvotes`
   - `id` (uuid, pk)
   - `request_id` (fk)
   - `voter_public_key` (text, anonymous)

5. (Future) `comments`
   - `id` (uuid, pk)
   - `request_id` (fk)
   - `comment` (text)
   - `created_at` (timestamp)
   - `commenter_public_key` (text, anonymous)

## Key API Endpoints / Functions

- `POST /requests` — Add new office request (requires valid group signature)
- `GET /requests` — List all office requests
- `DELETE /requests/:id` — Admin-only delete
- `GET /group-members` — List group members (public)
- `POST /group-members` — Admin: add member
- `DELETE /group-members/:id` — Admin: remove member
- `GET /group-members/:username/keys` — Fetch/cached public key for member
- (Future) `POST /upvotes`, `POST /comments`

# High-level Wireframes & UI Sketches

## 1. Home Page (Public View)

```
+-------------------------------------------------------------+
| 📝 Parc-It!                                [Sidebar →]      |
| "Every suggestion here was posted by..."                    |
|-------------------------------------------------------------|
| [Emoji]  [Request Title/Description]   [Avatars] [Verify]   |
| [Emoji]  [Request Title/Description]   [Avatars] [Verify]   |
| ...                                                         |
|                                                             |
| [ + ] (Bottom-left: Add Request Button)                     |
+-------------------------------------------------------------+
```
- **Sidebar (Right):**
  - List of group members: [Avatar] [Username] [Key Icon]
  - Key icon opens modal with public key info
  - (If admin) Add/Remove member controls

## 2. Login Modal

```
+-----------------------------+
|  Paste your Parc-It Key     |
|  [______________________]   |
|  [Submit]                   |
|  [Error message, if any]    |
+-----------------------------+
```
- Triggered by clicking "➕" or "Login"
- Derives public key and checks membership

## 3. Add Request Modal

```
+------------------------------------------+
|  New Office Request                      |
|  [Emoji Picker] [Text Field]             |
|  [Submit] [Cancel]                       |
+------------------------------------------+
```
- Only visible to logged-in users
- Submits request with dummy signature

## 4. Verify Modal

```
+------------------------------------------+
|  Verify Group Signature                  |
|  - Signature valid: [Yes/No]             |
|  - Public signal: [hash]                 |
|  - Merkle root: [value]                  |
|  - Circuit/proof ID: [value]             |
|  - Time posted: [timestamp]              |
|  [Close]                                 |
+------------------------------------------+
```
- Triggered by clicking "Verify" on a request
- Shows dummy technical data for now

## 5. Key Modal

```
+------------------------------------------+
|  Public Key for [username]               |
|  [Key block]                             |
|  [Copy] [Download] [Verify on GitHub]    |
|  [Close]                                 |
+------------------------------------------+
```
- Triggered by clicking key icon in sidebar

## 6. Admin Controls (Sidebar)

```
+-----------------------------+
|  [Add Member] [Remove]      |
|  [List of usernames]        |
+-----------------------------+
```
- Only visible to admins

## 7. General Styling Notes
- All panels use retro Windows 95 style (beveled borders, pixel fonts)
- Avatars are pixelated, buttons are chunky and 3D
- Sparkle/star accents in header
- Desktop-first layout, fixed width 

# Detailed Supabase Schema

## Table: office_requests
```sql
CREATE TABLE office_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  emoji text NOT NULL,
  description text NOT NULL,
  signature jsonb NOT NULL, -- group signature/proof (stub for now)
  group_id uuid NOT NULL, -- for future multi-group support
  public_signal text NOT NULL, -- hash of message or similar
  posted_by text NOT NULL, -- public key (not linked to user for anonymity)
  deleted boolean NOT NULL DEFAULT false,
  metadata jsonb -- optional, for future extensibility
);
```
- **Purpose:** Stores all office requests, with cryptographic proof and metadata.

## Table: group_members
```sql
CREATE TABLE group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  github_username text UNIQUE NOT NULL,
  avatar_url text NOT NULL,
  public_key text NOT NULL, -- first RSA key from GitHub
  last_key_fetch timestamptz NOT NULL DEFAULT now(),
  is_admin boolean NOT NULL DEFAULT false
);
```
- **Purpose:** List of all group members, their GitHub info, and public key.

## Table: admins
```sql
CREATE TABLE admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_key text NOT NULL, -- hardcoded in backend for admin check
  github_username text
);
```
- **Purpose:** Admins are identified by public key; used for admin-only actions.

## (Future) Table: upvotes
```sql
CREATE TABLE upvotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES office_requests(id),
  voter_public_key text NOT NULL
);
```
- **Purpose:** Anonymous upvotes for requests.

## (Future) Table: comments
```sql
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES office_requests(id),
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  commenter_public_key text NOT NULL
);
```
- **Purpose:** Anonymous comments on requests.

# Component Breakdown

## Pages
- `HomePage` — Composes the main app layout:
  - `RetroHeader` — App title and subtitle with retro styling
  - `RequestFeed` — List of office requests
    - `RequestPanel` — Single request (emoji, description, avatars, verify button)
  - `Sidebar` — Group member list, admin controls
    - `MemberEntry` — Single group member (avatar, username, key icon)
    - (Admin controls: add/remove member)
  - `AddRequestButton` — Large retro-styled button (bottom-left)
  - **Modals:**
    - `LoginModal` — Modal for pasting parc-it key
    - `AddRequestModal` — Modal for submitting new request
    - `VerifyModal` — Modal for verifying group signature
    - `KeyModal` — Modal for viewing/copying public key

## Components
- `RetroHeader` — App title, subtitle, sparkle/star accents
- `RequestFeed` — List of office requests
  - Props: `requests[]`, `onVerify`, `isAdmin`, `onDelete`
- `RequestPanel` — Single request
  - Props: `request`, `onVerify`, `isAdmin`, `onDelete`
- `Sidebar` — Group member list, admin controls
  - Props: `members[]`, `isAdmin`, `onAddMember`, `onRemoveMember`, `onShowKey`
- `MemberEntry` — Single group member
  - Props: `member`, `onShowKey`
- `AddRequestButton` — Retro-styled add button
  - Props: `onClick`
- `EmojiPicker` — Emoji selection for new requests
  - Props: `onSelect`
- `AvatarRow` — Row of avatars for group signature
  - Props: `members[]`
- `RetroButton` — Styled button for retro look
  - Props: `children`, `onClick`, `variant`
- `Modal` — Generic modal wrapper
  - Props: `isOpen`, `onClose`, `children`
- **Modals:**
  - `LoginModal`, `AddRequestModal`, `VerifyModal`, `KeyModal`

## Utilities/Helpers
- `cryptoHelpers` — Key derivation, dummy signature, verification stubs
- `supabaseClient` — Supabase API wrapper
- `authHelpers` — Login state, session management 

# Implementation Planning: Project Scaffolding

## Task: Set up Next.js app with Tailwind and shadcn/ui in `parc-it/`

### Steps:
1. **Initialize Next.js App**
   - Create a new Next.js project in the `parc-it/` directory
   - Success: Able to run `npm run dev` and see the default Next.js page

2. **Set Up Tailwind CSS**
   - Install Tailwind CSS and configure it with Next.js
   - Add base Tailwind styles to the project
   - Success: Tailwind classes work in a test component

3. **Install and Configure shadcn/ui**
   - Install shadcn/ui and set up initial configuration
   - Import a sample shadcn/ui component to verify setup
   - Success: shadcn/ui component renders correctly

4. **Set Up Project Directory Structure**
   - Create folders for `components/`, `pages/`, `lib/`, and `styles/`
   - Add placeholder files for main components (e.g., `RetroHeader.tsx`, `RequestFeed.tsx`)
   - Success: Directory structure matches plan and imports resolve

5. **Initialize Git and .gitignore**
   - Initialize git repo if not already done
   - Add a `.gitignore` for Node/Next.js
   - Success: Unnecessary files are ignored by git

6. **Add README and Docs Folder**
   - Create a basic `README.md` with project description and setup instructions
   - Add a `docs/` folder for future documentation
   - Success: README and docs folder exist and are committed

### Success Criteria
- All steps above are complete and committed
- Able to run the app locally with Tailwind and shadcn/ui working
- Directory structure and initial files match the plan
- README and docs folder are present 

# Planner's Notes

- Use Supabase Edge Functions for serverless logic; schedule with Supabase scheduled jobs or external cron if needed
- Use fetch API to get keys from `https://github.com/{username}.keys`
- Parse the first RSA key and update the database
- Handle errors (e.g., user not found, no keys, network issues) 

# Success Criteria for UI Overhaul
- No Next.js starter/demo content remains
- Layout matches the retro Windows 95 mockup (title bar, sidebar, feed, add button)
- Custom copy is present and clearly explains the app's purpose and cryptographic anonymity
- All content and UI is relevant to Parc-It! and the 0xPARC office 

# Plonky2/WASM Cryptography Integration Plan

## Background and Motivation

The project needs to integrate cryptographic group signature functionality (Plonky2 circuits, WASM-compiled Rust) from the double-blind-web package into the Next.js (parc-it) app. This will allow:
- Verifying if a user's "parcit key" (DK) is in the group (front-end verification only)
- Deriving the SSH key from the parcit key / DK
- Generating a valid signature for a request
- Verifying a signature and outputting the message and group keys (GitHub users) in the request verification modal

## Key Challenges and Analysis
- WASM modules must be loaded asynchronously and only in the browser (not during SSR)
- The cryptographic API must be easy to use from React components
- Helper functions should be organized for maintainability and clarity
- TypeScript types may need to be inferred or stubbed for WASM exports

## High-level Task Breakdown

1. **Copy WASM package files**
   - Place `double_blind_web.js`, `double_blind_web_bg.wasm`, and any required files from double-blind-web/pkg into `src/helpers/doubleBlind/` in the parc-it app.
   - Success: Files are present and importable in the Next.js app.

2. **Create WASM loader and API helper**
   - Implement `src/helpers/doubleBlind/plonky2.ts` (or .js) with:
     - `export async function initPlonkyTwoCircuits()` that loads and initializes the WASM module, returning the needed classes/functions (`Circuit`, `validate_keys`, etc.).
     - Ensure singleton pattern so WASM is only loaded once per session.
   - Success: Can call `initPlonkyTwoCircuits()` from a component and receive usable cryptographic functions.

3. **Implement utility functions for app use cases**
   - In the same helper, export async functions:
     - `verifyDKInGroup(publicKeys: string, dk: string): Promise<boolean>`
     - `generateSignature(message: string, publicKeys: string, dk: string): Promise<string>`
     - `verifySignature(message: string, signature: string): Promise<{valid: boolean, groupKeys?: string, error?: any}>`
     - (Optional) `deriveSSHKeyFromDK(dk: string): Promise<string>` if supported by WASM
   - Success: Each function works as expected in isolation (unit test or manual test)

4. **Integrate into React components**
   - Use the helper functions in relevant Next.js pages/components:
     - DK verification on input
     - Signature generation on request submission
     - Signature verification in modal
   - Success: UI updates correctly based on cryptographic results; errors are handled gracefully.

5. **Testing and validation**
   - Test all flows manually and/or with automated tests
   - Success: All cryptographic features work in the browser, no SSR errors, and user experience is smooth.

## Project Status Board (Plonky2 Integration)

- [x] Copy WASM package files to helpers folder
- [x] Implement `initPlonkyTwoCircuits` loader and API
- [x] Implement utility functions for DK verification, signature generation, and verification
- [ ] Integrate cryptographic helpers into React components
- [ ] Test and validate all cryptographic flows

## Executor's Feedback or Assistance Requests (Plonky2 Integration)

- Created `src/helpers/plonky2/utils.ts` with async utility functions: `verifyDKInGroup`, `generateSignature`, and `verifySignature`. All use the typed loader and are ready for integration into React components.

Skylar todos DO NO TOUCH:
- add refresh of group members keys from github
- add check on backend for proof verificaiton. unless we want people to submit requests which bad proofs

## Performance Investigation & Optimization: Office Requests Feed

### Background and Motivation
After adding pagination, loading the office_requests feed became extremely slow (up to 27 seconds), even with only 31 records. Investigation revealed:
- The frontend was sending duplicate requests for each page load/action.
- The response payload was very large due to including the signature field (large JSON) for every record, even though it is only needed for verification.

### Key Challenges and Analysis
- **Duplicate Requests:** Multiple useEffect hooks or event handlers are triggering fetchRequests redundantly.
- **Large Response Size:** The feed fetch includes the signature field, which is not needed for the main list display and greatly increases payload size.
- **User Experience:** These issues combine to make the app feel slow and unresponsive, even though the database is fast.

### High-level Task Breakdown

1. **Audit and Refactor Fetch Logic**
   - Review all useEffect hooks and event handlers that call fetchRequests.
   - Ensure fetchRequests is only called once per intended user action (e.g., page load, page change, modal close).
   - Remove or consolidate redundant calls.
   - **Success Criteria:** Only one network request is sent per user action.

2. **Reduce Response Payload Size**
   - Update the Supabase select in fetchRequests to exclude the signature field for the main feed.
   - Only fetch id, emoji, description, created_at, group_members, doxxed_member_id, and any other fields needed for the list view.
   - Fetch the signature field only when opening the verify modal for a specific request.
   - **Success Criteria:** The response size for the feed is reduced to a few KB, and the feed loads quickly.

3. **Test and Validate**
   - Test the feed with 31+ records and verify that loading is fast (<500ms typical).
   - Confirm that the verify modal still works and fetches the signature as needed.
   - Check that no duplicate requests are sent for any user action.
   - **Success Criteria:** Feed is fast, no duplicate requests, and all features work as expected.

4. **Document Lessons Learned**
   - Add a note to the Lessons section about avoiding unnecessary large fields in list queries and watching for duplicate fetches in React apps.

---

### Project Status Board (Performance Optimization)

- [x] Audit and refactor fetch logic to eliminate duplicate requests
- [ ] Update select fields to reduce response size
- [ ] Test and validate performance improvements
- [ ] Document lessons learned

---

# Executor's Feedback or Assistance Requests (Performance Optimization)

- Audited and refactored fetch logic in `page.tsx`:
  - Removed the separate useEffect that triggered fetchRequests on pageSize change.
  - Combined into a single useEffect that listens to currentPage, pageSize, and addRequestOpen, and only fetches when the modal is closed.
  - This ensures only one network request is sent per user action (page load, page change, modal close).
- Next step: Update the Supabase select fields in fetchRequests to reduce the response payload size by excluding the signature field from the main feed.