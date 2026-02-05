import { useState, useEffect } from 'react';
import { useMemory } from '../context/MemoryContext';
import './MemoryPanel.css';

const MEMORY_TYPES = [
  'ALL',
  'ASSUMPTION',
  'DECISION',
  'CUSTOMER_CONVO',
  'EVIDENCE',
  'CONTRADICTION',
  'LESSON',
  'MILESTONE'
];

export default function MemoryPanel() {
  const { memories, loading, error, fetchMemories } = useMemory();
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const [expandedMemories, setExpandedMemories] = useState(new Set());

  useEffect(() => {
    const filters = {};
    if (selectedType !== 'ALL') {
      filters.type = selectedType;
    }
    if (searchText) {
      filters.search = searchText;
    }
    fetchMemories(filters);
  }, [selectedType, searchText, fetchMemories]);

  const toggleExpanded = (id) => {
    setExpandedMemories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getTypeBadgeColor = (type) => {
    const colors = {
      ASSUMPTION: '#f59e0b',
      DECISION: '#3b82f6',
      CUSTOMER_CONVO: '#10b981',
      EVIDENCE: '#8b5cf6',
      CONTRADICTION: '#ef4444',
      LESSON: '#ec4899',
      MILESTONE: '#14b8a6'
    };
    return colors[type] || '#6b7280';
  };

  const getImportanceLabel = (importance) => {
    if (importance >= 0.8) return 'Critical';
    if (importance >= 0.6) return 'High';
    if (importance >= 0.4) return 'Medium';
    return 'Low';
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="memory-panel">
      <div className="memory-header">
        <h2>Memory Bank</h2>
        <p className="memory-subtitle">
          {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
        </p>
      </div>

      <div className="memory-controls">
        <div className="memory-search">
          <input
            type="text"
            placeholder="Search memories..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="memory-filters">
          {MEMORY_TYPES.map(type => (
            <button
              key={type}
              className={`filter-btn ${selectedType === type ? 'active' : ''}`}
              onClick={() => setSelectedType(type)}
            >
              {type.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="memory-list">
        {loading && <div className="memory-loading">Loading memories...</div>}

        {error && <div className="memory-error">Error: {error}</div>}

        {!loading && !error && memories.length === 0 && (
          <div className="memory-empty">
            <p>No memories found</p>
            <p className="empty-subtitle">
              Memories are created automatically as you work, or you can create them manually.
            </p>
          </div>
        )}

        {!loading && !error && memories.map(memory => {
          const isExpanded = expandedMemories.has(memory.id);

          return (
            <div key={memory.id} className="memory-card">
              <div className="memory-card-header" onClick={() => toggleExpanded(memory.id)}>
                <div className="memory-card-title">
                  <span
                    className="memory-type-badge"
                    style={{ backgroundColor: getTypeBadgeColor(memory.type) }}
                  >
                    {memory.type.replace(/_/g, ' ')}
                  </span>
                  <h3>{memory.summary}</h3>
                </div>
                <button className="expand-btn">
                  {isExpanded ? '−' : '+'}
                </button>
              </div>

              <div className="memory-card-meta">
                <span className="memory-meta-item">
                  {formatDate(memory.createdAt)}
                </span>
                <span className="memory-meta-item">
                  Importance: {getImportanceLabel(memory.importance)}
                </span>
                <span className="memory-meta-item memory-id">
                  ID: {memory.id}
                </span>
              </div>

              {isExpanded && (
                <div className="memory-card-details">
                  {memory.details && (
                    <div className="memory-detail-section">
                      <h4>Details</h4>
                      <p>{memory.details}</p>
                    </div>
                  )}

                  {memory.entities && (
                    <div className="memory-detail-section">
                      <h4>Entities</h4>
                      <div className="memory-entities">
                        {memory.entities.ideas?.length > 0 && (
                          <div className="entity-group">
                            <strong>Ideas:</strong>
                            {memory.entities.ideas.map(idea => (
                              <span key={idea} className="entity-tag">{idea}</span>
                            ))}
                          </div>
                        )}
                        {memory.entities.customers?.length > 0 && (
                          <div className="entity-group">
                            <strong>Customers:</strong>
                            {memory.entities.customers.map(customer => (
                              <span key={customer} className="entity-tag">{customer}</span>
                            ))}
                          </div>
                        )}
                        {memory.entities.artifacts?.length > 0 && (
                          <div className="entity-group">
                            <strong>Artifacts:</strong>
                            {memory.entities.artifacts.map(artifact => (
                              <span key={artifact} className="entity-tag">{artifact}</span>
                            ))}
                          </div>
                        )}
                        {memory.entities.tags?.length > 0 && (
                          <div className="entity-group">
                            <strong>Tags:</strong>
                            {memory.entities.tags.map(tag => (
                              <span key={tag} className="entity-tag">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {memory.signals && Object.keys(memory.signals).length > 0 && (
                    <div className="memory-detail-section">
                      <h4>Signals</h4>
                      <div className="memory-signals">
                        {memory.signals.evidenceQuality && (
                          <div className="signal-item">
                            <strong>Evidence Quality:</strong> {memory.signals.evidenceQuality}
                          </div>
                        )}
                        {memory.signals.confidence !== undefined && (
                          <div className="signal-item">
                            <strong>Confidence:</strong> {Math.round(memory.signals.confidence * 100)}%
                          </div>
                        )}
                        {memory.signals.moneySignal && (
                          <div className="signal-item">
                            <strong>Money Signal:</strong> {memory.signals.moneySignal}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {memory.source && (
                    <div className="memory-detail-section">
                      <h4>Source</h4>
                      <div className="memory-source">
                        <span className="source-kind">{memory.source.kind}</span>
                        {memory.source.ref && <span className="source-ref">{memory.source.ref}</span>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
