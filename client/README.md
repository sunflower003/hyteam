# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Chat UI Responsive Behavior (Custom)

The chat page now supports a mobile-optimized navigation pattern similar to Facebook Messenger:

- Desktop (`>=768px`): Sidebar (conversation list) + active thread + optional info panel (unchanged layout).
- Mobile (`<768px`):
  - Route `/chat` shows ONLY the conversation list.
  - Selecting a conversation navigates to `/chat/:conversationId` and displays ONLY the thread with a back arrow.
  - Safe-area insets (`env(safe-area-inset-bottom)`) are applied for iOS at the bottom input area and container.
  - Uses `100dvh` to mitigate iOS Safari dynamic toolbar resize issues.

Implementation details:

- Added an extra route `<Route path="chat/:conversationId" element={<Chat />}/>` in `App.jsx`.
- `Chat.jsx` reads `conversationId` via `useParams` and syncs the active conversation in context.
- When navigating back on mobile, route returns to `/chat` and clears `activeConversation`.
- Styles updated in `Chat.module.css` and `MessageInput.module.css` to handle safe-area and dynamic viewport height.

Potential next improvements:

- Add skeleton loaders for conversation/message list.
- Implement virtualized message list for performance on long threads.
- Preload next batch of messages on near-top scroll.
- Add optimistic UI for sending messages (pending state) & resend handling.
- ARIA roles & screen reader labels for accessibility.
