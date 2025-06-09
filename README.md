# Parc-It!

Anonymous office request board for the 0xPARC office, inspired by the [double-blind project](https://github.com/dgulotta/double-blind).

---

## Background and Motivation

Parc-It! is an anonymous office request board for the 0xPARC office. The goal is to allow members of a specific group (e.g., the 0xPARC GitHub org) to submit office requests anonymously, with cryptographic proof that the request comes from a group member, but without revealing which member. The app features a retro 1990s web interface and is built with Next.js, Tailwind, shadcn/ui, Supabase, and custom cryptography (Plonky2, WASM).

**Key Features:**
- Anonymous request submission and upvoting
- Admin-managed group membership (via GitHub SSH keys)
- Retro Windows 95-style UI
- Cryptographic group signatures (Plonky2, WASM)
- Extensible for comments, multi-group support, and more

---

## User Flows

- **Public:** View requests, group members, and technical details. Cannot submit or upvote.
- **Login:** Paste "Double Blind Key" to derive public key and check membership.
- **Authenticated:** Submit requests, upvote, view all features.
- **Admin:** Manage group members, delete requests, see admin-only UI.

---

## Technical Architecture

- **Frontend:** Next.js (React), Tailwind CSS, shadcn/ui, custom components.
- **Backend:** Supabase (Postgres, Auth, Edge Functions), RESTful endpoints, scheduled jobs for key fetching (manual or via API route).
- **Cryptography:** Plonky2 circuits (WASM), group signatures, nullifiers for upvoting.
- **API Endpoints:**
  - `/api/github-keys`: Fetches public SSH keys for a GitHub username (server-side, CORS-safe).
  - `/api/upvote`: Verifies group signature, extracts nullifier, and records upvote if not duplicate.

---

## Data Model (Supabase Schema)

- **office_requests:** Stores requests, signatures, group info, and metadata.
- **group_members:** GitHub username, avatar, public key, admin status.
- **admins:** Admin public keys and GitHub usernames.
- **request_upvotes:** (Upvoting) request_id, nullifier, timestamp, unique constraint.
- **(Future) comments:** Anonymous comments on requests.

See [`docs/schema.sql`](docs/schema.sql) for full schema.

---

## Project Structure

- `src/app/`: Main app, pages, layout, API routes.
- `src/components/`: UI components (LoginModal, RetroHeader, etc.).
- `src/helpers/`: Utility functions, cryptography, key derivation.
- `public/`: Static assets, WASM, icons.
- `docs/`: Documentation, schema.sql.
- `.cursor/scratchpad.md`: Project planning, status, and lessons.

---

## Setup and Development

### Requirements
- Node.js (v18+ recommended)
- npm
- Supabase project (with tables as per `docs/schema.sql`)
- GitHub org for group members

### Install
```sh
npm install
```

### Run Dev Server
```sh
npm run dev
```

### Build
```sh
npm run build
```

### Lint
```sh
npm run lint
```

### Supabase
- Set up tables as per [`docs/schema.sql`](docs/schema.sql)
- Configure environment variables for Supabase URL and anon key

### WASM Setup: Plonky2 Group Signature Circuits

This project uses custom cryptographic group signature circuits, compiled to WebAssembly (WASM), originally developed by [Daniel Gulotta (dgulotta)](https://github.com/dgulotta) for the [double-blind project](https://github.com/dgulotta/double-blind). **Big thanks to Daniel for his work on the Plonky2 RSA circuits!**

#### How to Obtain the WASM Files

You will need the following files from a build of the `double-blind-web` package (from the double-blind repo or your own build):
- `double_blind_web_bg.wasm`
- `double_blind_web.js`
- `double_blind_web.d.ts` (optional, for TypeScript projects)

##### If you have a directory like `double-blind/double-blind-web/pkg/`:

1. **Locate the Files:**
   - Go to the `pkg/` directory inside your build output, e.g.:
     ```
     double-blind/double-blind-web/pkg/
     ```
   - You should see files like:
     - `double_blind_web_bg.wasm`
     - `double_blind_web.js`
     - `double_blind_web.d.ts`

2. **Copy to Your Project:**
   - Copy `double_blind_web_bg.wasm` to your app's public WASM directory:
     ```
     cp double-blind/double-blind-web/pkg/double_blind_web_bg.wasm parc-it/public/wasm/
     ```
   - Copy `double_blind_web.js` and (optionally) `double_blind_web.d.ts` to your helpers directory:
     ```
     cp double-blind/double-blind-web/pkg/double_blind_web.js parc-it/src/helpers/plonky2/
     cp double-blind/double-blind-web/pkg/double_blind_web.d.ts parc-it/src/helpers/plonky2/
     ```

3. **Reference in Your Code:**
   - The app is set up to load the WASM file from `/public/wasm/double_blind_web_bg.wasm` and import the JS glue code from `src/helpers/plonky2/double_blind_web.js`.

##### If you need to build from source:

1. **Clone the double-blind repo:**
   ```sh
   git clone https://github.com/dgulotta/double-blind.git
   cd double-blind/double-blind-web
   ```
2. **Install Rust and WASM build tools:**
   ```sh
   rustup target add wasm32-unknown-unknown
   cargo install wasm-bindgen-cli
   ```
3. **Build the WASM package:**
   ```sh
   cargo build --release --target wasm32-unknown-unknown
   wasm-bindgen ../target/wasm32-unknown-unknown/release/double_blind_web.wasm --out-dir pkg --target web
   ```
4. **Copy the output files as described above.**

- See the [double-blind README](https://github.com/dgulotta/double-blind) for more details on building the WASM package.
- The WASM and JS files are required for cryptographic group signature operations in the app.

**Credit:**
Plonky2 RSA circuits and group signature WASM by [Daniel Gulotta (dgulotta)](https://github.com/dgulotta).
Original repo: https://github.com/dgulotta/double-blind

---

## Lessons and Best Practices

- Use docs folder for documentation.
- Desktop-first, always-on retro theme.
- No OAuth or passwords; login via Double Blind Key only.
- Admins identified by hardcoded SSH pub keys.
- Fetch only first RSA key from GitHub .keys every 10 minutes.
- Avoid large fields in list queries; fetch only what is needed.
- Watch for duplicate fetches in React apps.

---

## Future Work

- Integrate full Plonky2 cryptography for group signatures.
- Add comments, multi-group support, and more admin features.
- Improve performance and scalability.
- Expand documentation and add more tests.

---

## References and Acknowledgments

- [docs/schema.sql](docs/schema.sql): Database schema.
- `.cursor/scratchpad.md`: Planning, status, and technical notes.
- [double-blind project](https://github.com/dgulotta/double-blind): Inspiration and cryptography reference.
- Plonky2 RSA circuits and WASM by Daniel Gulotta (dgulotta).
