# Playwright Project Analysis (Phase 1)

This file is generated as an audit-friendly inventory of pages/routes and major interactive elements in the Next.js frontend.

## Routes (Next.js App Router)

Discovered `frontend/app/**/page.tsx` routes:

- `/` (Home feed)
- `/auth/login` (Login)
- `/auth/register` (Register)
- `/create` (Post creation)
- `/search` (Search)
- `/notifications` (Notifications)
- `/messages` (Messages)
- `/collaboration` (Build With)
- `/profile` (Your profile)
- `/profile/[id]` (Other user profile)
- `/posts/[id]` (Post details)

Additional legacy pages also exist:

- `/login`
- `/register`

## Navigation links

Sidebar links (`frontend/components/layout/Sidebar.tsx`):

Core implemented pages:

- `a[href="/"]` Home
- `a[href="/search"]` Search
- `a[href="/create"]` Post
- `a[href="/messages"]` Message
- `a[href="/notifications"]` Notification
- `a[href="/collaboration"]` Build With
- `a[href="/profile"]` Profile

Links present but not implemented as pages in this workspace (currently treated as placeholder routes by the dynamic button-click probe):

- `/ai`, `/courses`, `/resources`, `/updates`, `/shop`, `/research`, `/settings`

## Major interactive elements by page

This list focuses on elements matching selectors: `button`, `input`, `textarea`, `a`, `[role="button"]`, `[type="submit"]`, `[type="file"]`.

### Auth

- `/auth/register`
  - Inputs: full name, username, email, password, confirm
  - Submit: `button[type="submit"]` Register
  - Link: `a[href="/auth/login"]`

- `/auth/login`
  - Inputs: email, password
  - Submit: `button[type="submit"]` Login
  - Link: `a[href="/auth/register"]`

### Home (`/`)

- Post creation entry: `PostCreationBox` navigates to `/create`
- Feed tabs: `button` Public/College/Open Idea
- Retry button on load failure
- Post cards (`PostCard`)
  - `a[href="/posts/[id]"]` clickable card
  - Buttons: Like, Share, Build With

### Post creation (`/create`)

- Form inputs: title, description, category select, visibility select, location
- Dynamic lists: requirements + tags (add/remove)
- Media upload component: `MediaUpload`
  - `input[type="file"][data-testid="media-input"]` (set via Playwright `setInputFiles`)
  - Clickable upload button: `[data-testid="media-upload-button"]`
- Submit: `button[type="submit"]` Create Post
- Cancel: `button[type="button"]` Cancel
- Enter key handling:
  - Enter does not submit globally
  - Ctrl/Cmd+Enter submits only from textarea

### Profile (`/profile`)

- Edit Profile button
- Edit form inputs: full name, bio (textarea), location, college
- Skills: add/remove skill rows
- Save/Cancel buttons
- Avatar upload (`AvatarUpload`) present in edit mode (direct Cloudinary upload)

### Other user profile (`/profile/[id]`)

- Message button (starts DM)
- Back button

### Messages (`/messages`)

- Conversation search input
- Conversation list buttons
- Chat view:
  - Message input (Enter sends)
  - Send button

### Notifications (`/notifications`)

- Notification cards (`div.card` with click)
- Collaboration request actions:
  - Accept button
  - Decline button

### Search (`/search`)

- Search input
- Search button
- Filters toggle + filters form (category, location, college)

## API-connected actions (examples)

These UI actions trigger backend API calls:

- Register/Login
- Feed fetch + pagination
- Post create (multipart if media selected)
- Post detail load
- Like toggle
- Comment create
- Collaboration request + accept/decline
- Notifications mark-read
- DM start + message send
- Search

## Playwright coverage mapping

The Playwright suite in `frontend/e2e/` contains dedicated specs for:

- Auth (`auth.spec.ts`)
- Navigation (`navigation.spec.ts`)
- Post creation + Enter/media (`post-creation.spec.ts`)
- Media upload (`upload.spec.ts`)
- Profile edit (`profile.spec.ts`)
- Search (`search.spec.ts`)
- Messages (`messages.spec.ts`)
- Notifications (`notifications.spec.ts`)
- Dynamic click-all probe (`buttons.spec.ts`)
- Full single-user journey (`full-app.spec.ts`)
- Two-user collaboration + chat journey (`smoke.spec.ts`)
