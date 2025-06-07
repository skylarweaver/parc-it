# Data Fetching Hooks

This directory contains all data-fetching hooks for the app.

**All React components should use these hooks for data access and state management.**

- Do not fetch data directly from Supabase or use stateless fetchers in React components.
- Each hook encapsulates loading, error, and state logic for its resource.
- If you need to fetch new data, add a new hook here and use it in your component. 