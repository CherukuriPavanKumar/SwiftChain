import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import SendMoney from './pages/SendMoney';
import Conversion from './pages/Conversion';
import ConfirmTransfer from './pages/ConfirmTransfer';
import TransactionStatus from './pages/TransactionStatus';
import TransactionHistory from './pages/TransactionHistory';
import './index.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<SendMoney />} />
            <Route path="/conversion" element={<Conversion />} />
            <Route path="/confirm" element={<ConfirmTransfer />} />
            <Route path="/status" element={<TransactionStatus />} />
            <Route path="/history" element={<TransactionHistory />} />
          </Routes>
        </main>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App; 