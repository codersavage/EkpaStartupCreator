import { useState, useEffect } from 'react';
import ConversationForm from './ConversationForm';
import './PipelineTable.css';

export default function PipelineTable() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [filterPotential, setFilterPotential] = useState('');
  const [filterMoney, setFilterMoney] = useState('');

  useEffect(() => {
    fetchConversations();
  }, [filterPotential, filterMoney]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterPotential) params.set('potentialCustomer', filterPotential);
      if (filterMoney) params.set('putMoneyDown', filterMoney);

      const response = await fetch(`http://localhost:3001/api/conversations?${params.toString()}`);
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewConversation = () => {
    setSelectedConversation(null);
    setShowForm(true);
  };

  const handleEditConversation = (conversation) => {
    setSelectedConversation(conversation);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedConversation(null);
    fetchConversations();
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Customer', 'Potential?', 'Money?', 'Ideas', 'Notes'];
    const rows = conversations.map(c => [
      c.date,
      c.time,
      c.customerName,
      c.potentialCustomer || '',
      c.putMoneyDown || '',
      c.linkedIdeas?.join('; ') || '',
      c.notes
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer_pipeline.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pipeline-table">
      <div className="pipeline-header">
        <h2>Customer Pipeline</h2>
        <div className="pipeline-actions">
          <button onClick={handleNewConversation} className="btn-primary">
            Log Conversation
          </button>
          <button onClick={exportToCSV} className="btn-secondary" disabled={conversations.length === 0}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="pipeline-filters">
        <div className="filter-group">
          <label>Potential Customer</label>
          <select value={filterPotential} onChange={(e) => setFilterPotential(e.target.value)}>
            <option value="">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Put Money Down</label>
          <select value={filterMoney} onChange={(e) => setFilterMoney(e.target.value)}>
            <option value="">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>

      {loading && <div className="pipeline-loading">Loading conversations...</div>}

      {!loading && conversations.length === 0 && (
        <div className="pipeline-empty">
          <p>No customer conversations logged yet</p>
          <button onClick={handleNewConversation} className="btn-primary">
            Log Your First Conversation
          </button>
        </div>
      )}

      {!loading && conversations.length > 0 && (
        <div className="pipeline-table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Customer</th>
                <th>Potential?</th>
                <th>Money?</th>
                <th>Ideas</th>
                <th>Notes</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map(conversation => (
                <tr
                  key={conversation.id}
                  onClick={() => handleEditConversation(conversation)}
                  className="clickable-row"
                >
                  <td>{conversation.date}</td>
                  <td>{conversation.time}</td>
                  <td>{conversation.customerName}</td>
                  <td>
                    {conversation.potentialCustomer && (
                      <span className={`badge ${conversation.potentialCustomer === 'yes' ? 'badge-success' : 'badge-neutral'}`}>
                        {conversation.potentialCustomer}
                      </span>
                    )}
                  </td>
                  <td>
                    {conversation.putMoneyDown && (
                      <span className={`badge ${conversation.putMoneyDown === 'yes' ? 'badge-success' : 'badge-neutral'}`}>
                        {conversation.putMoneyDown}
                      </span>
                    )}
                  </td>
                  <td>
                    {conversation.linkedIdeas?.length > 0 ? (
                      <div className="ideas-list">
                        {conversation.linkedIdeas.map(idea => (
                          <span key={idea} className="idea-tag">{idea}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </td>
                  <td className="notes-cell">{conversation.notes}</td>
                  <td>
                    <span className={`badge ${conversation.completed ? 'badge-completed' : 'badge-draft'}`}>
                      {conversation.completed ? 'Completed' : 'Draft'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ConversationForm
          conversation={selectedConversation}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}
