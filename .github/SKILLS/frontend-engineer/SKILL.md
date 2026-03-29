# Frontend Component Development Guidelines

## General Architecture Rules

If the UI is new, always create modularized code following the defined file structure.

### 1. File Size Control

- No file should exceed **500 lines**.
- Maintain files between **400–500 lines** whenever possible.

---

## 2. Import Rules

### Allowed Direct Imports Inside Components

Only the following may be directly imported inside the component:

- React states and hooks (`useState`, `useEffect`, etc.)
- Icons (lucide, tabular icons)
- Framer Motion / motion

### All Other Imports

For the following:

- Custom components
- Generated components
- Utility files
- Helper files
- Data files
- Types or interface files

Use namespace import format:

```ts
import * as p from "path";
```

If the component name is `Project`, the alias should be the lowercase of its first letter.

Use components like:

```tsx
<p.ComponentName />
```

---

## 3. SVG Restriction

- Never use `<svg>` tags for image or animation creation.

---

## 4. Naming Restrictions

- Never use the keyword `any` in:
  - States
  - Props
  - Types
  - Interfaces

Using `any` reduces the effectiveness of TypeScript in Next.js.

---

## 5. Helper Functions

- Do not define helper functions directly inside components.
- Always create a separate `utils` or `helper` file.
- Import and use them inside the component.

---

## 6. Mock Data Handling

- If mock data is required:
  - Create a file inside the `data` folder.
  - Import and use it in the component.

---

## 7. Types and Interfaces

- Never declare types or interfaces inside components.
- Always create them inside the `types` folder.
- Import them into the component.

---

## 8. Zod Validation

- Always use Types and Interfaces together with **Zod validation**.
- Ensure schemas align strictly with the defined types.

---

## 9. ShadCN Component Usage

- Refer to ShadCN UI components inside the `source` folder.
- Use the appropriate component based on the use case.
- Generate code using those components.

---

## 10. Existing Structure Check (Before Creating New Files)

Before generating a new component:

- Check if related files already exist in:
  - `types` folder
  - `data` folder
  - Related feature/module folders

If relevant files exist:

- Extend or reuse existing files.
- Do not create duplicate structures.

Here is your additional rule, written clearly and in the same structured format:

---

## 11. Page Architecture Rule

- Never write business logic, imports, or component structure directly inside `page.tsx`.
- Always create a dedicated container file (e.g., `ProjectContainer`).
- All logic, state management, imports (except Next.js page-level requirements), and component composition must be implemented inside the container file.
- The `page.tsx` file must only:
  - Import the container
  - Render the container component

### Example Structure

```
app/
  project/
    page.tsx
    ProjectContainer.tsx
```

### Responsibility Separation

**`ProjectContainer.tsx`**

- Handles logic
- Handles state
- Handles data imports
- Handles helper usage
- Handles component composition

**`page.tsx`**

- Only renders the container component
- Must remain minimal and clean
