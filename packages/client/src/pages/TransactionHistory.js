import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Filter, Download, Eye, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const TransactionHistory = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, statusFilter]);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      // Simulate loading transactions from localStorage or API
      const storedTransactions = localStorage.getItem('transactionHistory');
      let transactionList = [];
      
      if (storedTransactions) {
        transactionList = JSON.parse(storedTransactions);
      } else {
        // Demo transactions if none exist
        transactionList = [
          {
            id: '1',
            hash: '0x1234567890abcdef1234567890abcdef12345678',
            from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            amount: '100.50',
            currency: 'USDT',
            status: 'completed',
            timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            gasUsed: '21000',
            gasPrice: '20000000000',
            confirmations: 12,
            blockNumber: 12345678
          },
          {
            id: '2',
            hash: '0xabcdef1234567890abcdef1234567890abcdef12',
            from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            to: '0x1234567890abcdef1234567890abcdef12345678',
            amount: '50.25',
            currency: 'ETH',
            status: 'pending',
            timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            gasUsed: '21000',
            gasPrice: '20000000000',
            confirmations: 2,
            blockNumber: 12345679
          },
          {
            id: '3',
            hash: '0x7890abcdef1234567890abcdef1234567890abcd',
            from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            to: '0xabcdef1234567890abcdef1234567890abcdef12',
            amount: '75.00',
            currency: 'USDT',
            status: 'failed',
            timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            gasUsed: '21000',
            gasPrice: '20000000000',
            confirmations: 0,
            blockNumber: 12345680
          }
        ];
        localStorage.setItem('transactionHistory', JSON.stringify(transactionList));
      }
      
      setTransactions(transactionList);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transaction history');
    } finally {
      setIsLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(tx => 
        tx.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.amount.includes(searchTerm) ||
        tx.currency.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }

    setFilteredTransactions(filtered);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleViewTransaction = (transaction) => {
    sessionStorage.setItem('transactionData', JSON.stringify(transaction));
    navigate('/status');
  };

  const handleExport = () => {
    const csvContent = [
      ['Hash', 'From', 'To', 'Amount', 'Currency', 'Status', 'Timestamp', 'Gas Used', 'Gas Price', 'Confirmations', 'Block Number'],
      ...filteredTransactions.map(tx => [
        tx.hash,
        tx.from,
        tx.to,
        tx.amount,
        tx.currency,
        tx.status,
        formatDate(tx.timestamp),
        tx.gasUsed,
        tx.gasPrice,
        tx.confirmations,
        tx.blockNumber
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaction-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Transaction history exported successfully!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Transaction History</h1>
          <p className="text-gray-600">View and manage your crypto transfer history</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="btn-secondary flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="card mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by hash, address, amount, or currency..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            
            <button
              onClick={handleExport}
              className="btn-secondary flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="card">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Start by making your first crypto transfer'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Transaction</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">From</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">To</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="font-mono text-sm text-gray-900">
                        {formatAddress(transaction.hash)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Block #{transaction.blockNumber}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-mono text-sm text-gray-900">
                        {formatAddress(transaction.from)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-mono text-sm text-gray-900">
                        {formatAddress(transaction.to)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">
                        {transaction.amount} {transaction.currency}
                      </div>
                      <div className="text-xs text-gray-500">
                        Gas: {transaction.gasUsed}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(transaction.status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                          {transaction.status}
                        </span>
                      </div>
                      {transaction.status === 'pending' && (
                        <div className="text-xs text-gray-500 mt-1">
                          {transaction.confirmations} confirmations
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-900">
                        {formatDate(transaction.timestamp)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleViewTransaction(transaction)}
                        className="btn-primary flex items-center space-x-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid md:grid-cols-4 gap-6 mt-8">
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {transactions.length}
          </div>
          <div className="text-sm text-gray-600">Total Transactions</div>
        </div>
        
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600 mb-1">
            {transactions.filter(tx => tx.status === 'completed').length}
          </div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600 mb-1">
            {transactions.filter(tx => tx.status === 'pending').length}
          </div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
        
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-600 mb-1">
            {transactions.filter(tx => tx.status === 'failed').length}
          </div>
          <div className="text-sm text-gray-600">Failed</div>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory; 