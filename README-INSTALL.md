# SkillSwap Connect — Premium UI/UX Update

This package updates the existing Connect module's visual layer while preserving the supplied React application logic and API calls.

## Design direction
- Midnight forest dark theme with jade/emerald and soft-lime accents
- Clean light theme with warm off-white surfaces and forest-green text
- Refined sidebar, topbar, hero, KPI cards, activity cards, forms, tabs, booking rows, calendar, inbox, notifications, settings, event details and meeting surfaces
- Responsive tablet layout and mobile bottom navigation
- Keyboard focus states, reduced-motion support, clearer empty/loading/error states

## Files
- `src/features/connect/App.jsx` — supplied Connect app, retained as-is
- `src/features/connect/App.d.ts` — supplied component declaration
- `src/features/connect/styles.css` — existing styles plus premium scoped design layer

## Install
1. Back up your current `src/features/connect` folder.
2. Copy the `src` folder from this package into the root of your existing SkillSwap project, merging folders and replacing the three Connect files.
3. Run the project's normal build command, for example `npm run build`.
4. Open `/connect` and test dark/light mode plus mobile width.

All CSS is scoped under `.connect-root`; the rest of SkillSwap should not be restyled by this package.

## Important
This is a frontend UI/UX replacement package. It does not change backend routes, authentication, database schema, wallet logic, meeting security or production configuration.
