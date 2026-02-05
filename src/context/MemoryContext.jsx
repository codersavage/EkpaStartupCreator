import { createContext, useContext, useState, useCallback } from 'react';

const MemoryContext = createContext();

export function MemoryProvider({ children }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMemories = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (filters.type) queryParams.set('type', filters.type);
      if (filters.idea) queryParams.set('idea', filters.idea);
      if (filters.customer) queryParams.set('customer', filters.customer);
      if (filters.search) queryParams.set('search', filters.search);

      const url = `http://localhost:3001/api/memory?${queryParams.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch memories');
      }

      const data = await response.json();
      setMemories(data.memories || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching memories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createMemory = useCallback(async (memoryData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memoryData)
      });

      if (!response.ok) {
        throw new Error('Failed to create memory');
      }

      const data = await response.json();

      // Refresh memories list
      await fetchMemories();

      return data.memory;
    } catch (err) {
      setError(err.message);
      console.error('Error creating memory:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchMemories]);

  const getMemoryById = useCallback(async (id) => {
    try {
      const response = await fetch(`http://localhost:3001/api/memory/${id}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch memory ${id}`);
      }

      const data = await response.json();
      return data.memory;
    } catch (err) {
      console.error('Error fetching memory by ID:', err);
      throw err;
    }
  }, []);

  const updateMemory = useCallback(async (id, updates) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:3001/api/memory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update memory ${id}`);
      }

      const data = await response.json();

      // Refresh memories list
      await fetchMemories();

      return data.memory;
    } catch (err) {
      setError(err.message);
      console.error('Error updating memory:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchMemories]);

  const retrieveMemory = useCallback(async (query, context = {}) => {
    try {
      const response = await fetch('http://localhost:3001/api/memory/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, context })
      });

      if (!response.ok) {
        throw new Error('Failed to retrieve memories');
      }

      const data = await response.json();
      return data.memories || [];
    } catch (err) {
      console.error('Error retrieving memories:', err);
      throw err;
    }
  }, []);

  const value = {
    memories,
    loading,
    error,
    fetchMemories,
    createMemory,
    getMemoryById,
    updateMemory,
    retrieveMemory
  };

  return (
    <MemoryContext.Provider value={value}>
      {children}
    </MemoryContext.Provider>
  );
}

export function useMemory() {
  const context = useContext(MemoryContext);
  if (!context) {
    throw new Error('useMemory must be used within MemoryProvider');
  }
  return context;
}
