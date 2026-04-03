import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import Select from 'react-select';
import './index.css';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableProducts, setAvailableProducts] = useState([]);
  
  const getProductFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('product') || '';
  };
  
  const [selectedProduct, setSelectedProduct] = useState(getProductFromUrl());

  useEffect(() => {
    if (selectedProduct) {
      window.history.replaceState(null, '', `?product=${encodeURIComponent(selectedProduct)}`);
    } else {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [selectedProduct]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('./data/master_seaweed_database.csv');
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedData = results.data;
            setData(parsedData);
            
            const uniqueProducts = [...new Set(parsedData.map(row => row.Product_Title))].filter(Boolean);
            setAvailableProducts(uniqueProducts);
            
            if (!selectedProduct && uniqueProducts.length > 0) {
              setSelectedProduct(uniqueProducts[0]);
            }
            
            setLoading(false);
          }
        });
      } catch (err) {
        console.error("Failed to load CSV Database:", err);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const timelineData = useMemo(() => {
    if (!selectedProduct || data.length === 0) return [];
    
    const productRows = data.filter(row => row.Product_Title === selectedProduct);
    
    const gazetteMap = {};
    productRows.forEach(row => {
      if (!gazetteMap[row.Gazette_ID]) {
        gazetteMap[row.Gazette_ID] = {
          id: row.Gazette_ID,
          date: row.Published_Date,
          composition: {},
          specifications: {}
        };
      }
      
      const category = row.Category?.toLowerCase() === 'composition' ? 'composition' : 'specifications';
      // Group by S_No so that "Ingredients" and "Content" get merged into one object
      const sNo = row.S_No || 'unknown';
      if (!gazetteMap[row.Gazette_ID][category][sNo]) {
        gazetteMap[row.Gazette_ID][category][sNo] = {};
      }
      gazetteMap[row.Gazette_ID][category][sNo][row.Data_Key] = row.Data_Value;
    });
    
    // Process the objects so the Keys become the actual Parameter names!
    const processCategory = (catMap) => {
      const refined = {};
      Object.values(catMap).forEach(item => {
        // If it looks like OpenRouter data (Ingredients -> Content or Parameters -> Value)
        if (item.Ingredients && item.Content) {
          refined[item.Ingredients] = item.Content;
        } else if (item.Parameters && item.Value) {
          refined[item.Parameters] = item.Value;
        } else {
          // Legacy mock data fallback
          Object.entries(item).forEach(([k, v]) => {
            refined[k] = v;
          });
        }
      });
      return refined;
    };

    return Object.values(gazetteMap).map(gaz => ({
      ...gaz,
      composition: processCategory(gaz.composition),
      specifications: processCategory(gaz.specifications)
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
    
  }, [data, selectedProduct]);

  const renderDiffBadge = (currentVal, previousVal) => {
    // FIX: Render currentVal BEFORE the pill!
    const displayVal = <span style={{marginRight: '0.75rem'}}>{currentVal}</span>;
    
    if (!previousVal) return <>{displayVal}<span className="diff-badge diff-neutral">New</span></>;
    if (currentVal === previousVal) return <>{displayVal}<span className="diff-badge diff-neutral">Unchanged</span></>;
    
    const currNum = parseFloat(currentVal);
    const prevNum = parseFloat(previousVal);
    
    if (!isNaN(currNum) && !isNaN(prevNum)) {
      if (currNum > prevNum) {
        return <>{displayVal}<span className="diff-badge diff-up">↑ Increased from {prevNum}</span></>;
      }
      if (currNum < prevNum) {
        return <>{displayVal}<span className="diff-badge diff-down">↓ Decreased from {prevNum}</span></>;
      }
    }
    
    return <>{displayVal}<span className="diff-badge diff-neutral">Changed</span></>;
  };

  if (loading) {
    return <div className="loader">Loading Database...</div>;
  }

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      background: 'rgba(255,255,255,0.03)',
      borderColor: state.isFocused ? '#a1a1aa' : 'rgba(255, 255, 255, 0.08)',
      color: '#f4f4f5',
      padding: '0.25rem 0.5rem',
      borderRadius: '8px',
      boxShadow: 'none',
      width: '100%',
      minWidth: '500px',
      fontFamily: 'Inter',
      cursor: 'pointer',
      '&:hover': {
        borderColor: '#a1a1aa'
      }
    }),
    menu: (base) => ({
      ...base,
      background: '#18181b',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '8px',
      overflow: 'hidden',
      zIndex: 50
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
      color: state.isFocused ? '#60a5fa' : '#f4f4f5',
      cursor: 'pointer',
      fontFamily: 'Inter',
      padding: '0.75rem 1rem'
    }),
    singleValue: (base) => ({
      ...base,
      color: '#f4f4f5'
    }),
    input: (base) => ({
      ...base,
      color: '#f4f4f5'
    })
  };

  const selectOptions = availableProducts.map(prod => ({ value: prod, label: prod }));
  const currentSelectValue = selectOptions.find(opt => opt.value === selectedProduct) || null;

  return (
    <div className="app-container">
      <header>
        <h1>Gazette Explorer</h1>
        <p>Regulatory Specification Timeline</p>
      </header>
      
      <div className="selector-grid">
        <Select
          options={selectOptions}
          value={currentSelectValue}
          onChange={(opt) => setSelectedProduct(opt ? opt.value : '')}
          styles={selectStyles}
          placeholder="Search and select a product..."
          isSearchable
        />
      </div>

      <div className="timeline-grid">
        {timelineData.map((gazette, index) => {
          const prevGazette = index > 0 ? timelineData[index - 1] : null;
          
          return (
            <div key={gazette.id} className="glass-panel gazette-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <a 
                  href={`https://egazette.gov.in/WriteReadData/${gazette.id.split('_')[3] || '2025'}/${gazette.id.split('_')[0]}.pdf`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="gazette-badge"
                  style={{ marginBottom: 0, textDecoration: 'none' }}
                >
                  {gazette.id}
                </a>
                <span className="gazette-date" style={{ marginBottom: 0 }}>Published: {gazette.date}</span>
              </div>
              
              {/* Composition */}
              {(() => {
                const entries = Object.entries(gazette.composition).filter(([key, value]) => 
                  index === 0 || value !== prevGazette?.composition[key]
                );
                if (entries.length === 0) return null;
                return (
                  <div className="data-group">
                    <h3>Composition</h3>
                    {entries.map(([key, value]) => (
                      <div className="data-row" key={key}>
                        <span className="data-key">{key}</span>
                        <span className="data-value">
                          {renderDiffBadge(value, prevGazette?.composition[key])}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Specifications */}
              {(() => {
                const entries = Object.entries(gazette.specifications).filter(([key, value]) => 
                  index === 0 || value !== prevGazette?.specifications[key]
                );
                if (entries.length === 0) return null;
                return (
                  <div className="data-group">
                    <h3>Specifications</h3>
                    {entries.map(([key, value]) => (
                      <div className="data-row" key={key}>
                        <span className="data-key">{key}</span>
                        <span className="data-value">
                          {renderDiffBadge(value, prevGazette?.specifications[key])}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
