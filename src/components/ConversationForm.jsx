import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './ConversationForm.css';

export default function ConversationForm({ conversation, onClose }) {
  const [formData, setFormData] = useState({
    customerName: '',
    date: '',
    time: '',
    notes: '',
    potentialCustomer: undefined,
    putMoneyDown: undefined,
    linkedIdeas: []
  });
  const [availableIdeas, setAvailableIdeas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (conversation) {
      setFormData({
        customerName: conversation.customerName || '',
        date: conversation.date || '',
        time: conversation.time || '',
        notes: conversation.notes || '',
        potentialCustomer: conversation.potentialCustomer || undefined,
        putMoneyDown: conversation.putMoneyDown || undefined,
        linkedIdeas: conversation.linkedIdeas || []
      });
    }

    // Fetch available ideas from file tree
    fetchAvailableIdeas();
  }, [conversation]);

  const fetchAvailableIdeas = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/files');
      const data = await response.json();
      const tree = data.tree;

      // Extract idea names from tree (top-level folders except system folders)
      const ideas = tree
        .filter(node => node.type === 'folder')
        .filter(node => node.name !== 'memory' && node.name !== 'customers')
        .map(node => node.name);

      setAvailableIdeas(ideas);
    } catch (error) {
      console.error('Error fetching ideas:', error);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const toggleIdea = (idea) => {
    setFormData(prev => ({
      ...prev,
      linkedIdeas: prev.linkedIdeas.includes(idea)
        ? prev.linkedIdeas.filter(i => i !== idea)
        : [...prev.linkedIdeas, idea]
    }));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError('');

    try {
      const url = conversation
        ? `http://localhost:3001/api/conversations/${conversation.id}`
        : 'http://localhost:3001/api/conversations';

      const method = conversation ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save conversation');
      }

      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    // Validation
    if (!formData.customerName.trim()) {
      setError('Customer name is required');
      return;
    }
    if (!formData.date) {
      setError('Date is required');
      return;
    }
    if (!formData.time) {
      setError('Time is required');
      return;
    }
    if (!formData.notes.trim()) {
      setError('Notes are required');
      return;
    }
    if (!formData.potentialCustomer) {
      setError('Please answer: Is this a potential customer?');
      return;
    }
    if (!formData.putMoneyDown) {
      setError('Please answer: Did they put money down?');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // First save/update the conversation
      const url = conversation
        ? `http://localhost:3001/api/conversations/${conversation.id}`
        : 'http://localhost:3001/api/conversations';

      const method = conversation ? 'PUT' : 'POST';

      const saveResponse = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save conversation');
      }

      const savedData = await saveResponse.json();
      const conversationId = savedData.conversation.id;

      // Then complete it
      const completeResponse = await fetch(
        `http://localhost:3001/api/conversations/${conversationId}/complete`,
        { method: 'POST' }
      );

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json();
        throw new Error(errorData.error || 'Failed to complete conversation');
      }

      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{conversation ? 'Edit Conversation' : 'Log Customer Conversation'}</h2>
          <button onClick={onClose} className="close-btn">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Customer Name *</label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => handleChange('customerName', e.target.value)}
              placeholder="Enter customer name"
              disabled={conversation?.completed}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                disabled={conversation?.completed}
              />
            </div>

            <div className="form-group">
              <label>Time *</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => handleChange('time', e.target.value)}
                disabled={conversation?.completed}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Notes *</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="What did you discuss? What feedback did you get?"
              rows={6}
              disabled={conversation?.completed}
            />
          </div>

          <div className="form-group">
            <label>Is this a potential customer? *</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  checked={formData.potentialCustomer === 'yes'}
                  onChange={() => handleChange('potentialCustomer', 'yes')}
                  disabled={conversation?.completed}
                />
                Yes
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  checked={formData.potentialCustomer === 'no'}
                  onChange={() => handleChange('potentialCustomer', 'no')}
                  disabled={conversation?.completed}
                />
                No
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Did they put money down? *</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  checked={formData.putMoneyDown === 'yes'}
                  onChange={() => handleChange('putMoneyDown', 'yes')}
                  disabled={conversation?.completed}
                />
                Yes
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  checked={formData.putMoneyDown === 'no'}
                  onChange={() => handleChange('putMoneyDown', 'no')}
                  disabled={conversation?.completed}
                />
                No
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Linked Ideas</label>
            <div className="checkbox-group">
              {availableIdeas.length === 0 && (
                <p className="text-muted">No ideas found. Create an idea first.</p>
              )}
              {availableIdeas.map(idea => (
                <label key={idea} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.linkedIdeas.includes(idea)}
                    onChange={() => toggleIdea(idea)}
                    disabled={conversation?.completed}
                  />
                  {idea}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {conversation?.completed ? (
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          ) : (
            <>
              <button onClick={handleSaveDraft} disabled={saving} className="btn-secondary">
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button onClick={handleComplete} disabled={saving} className="btn-primary">
                {saving ? 'Completing...' : 'Complete'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
