// client/src/main.jsx - Trả về như ban đầu
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'  // ← Import App component gốc
import './App.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
