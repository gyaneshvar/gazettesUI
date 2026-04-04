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
            
            // Auto-selection logic:
            // 1. If we have a product from URL, try to find an EXACT match in the data
            // 2. If no exact match (or no URL param), default to the first product
            const urlProduct = getProductFromUrl();
            const matchedProduct = uniqueProducts.find(p => p.trim() === urlProduct.trim());
            
            if (matchedProduct) {
                setSelectedProduct(matchedProduct);
            } else if (!selectedProduct && uniqueProducts.length > 0) {
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
      background: '#ffffff',
      borderColor: state.isFocused ? 'var(--accent-blu)' : 'var(--glass-border)',
      color: 'var(--text-main)',
      padding: '0.25rem 0.5rem',
      borderRadius: '12px',
      boxShadow: state.isFocused ? '0 0 0 4px var(--accent-blu-glow)' : '0 2px 8px rgba(0,0,0,0.02)',
      width: '100%',
      minWidth: '500px',
      fontFamily: 'Inter',
      cursor: 'pointer',
      transition: 'all 0.2s',
      '&:hover': {
        borderColor: 'var(--accent-blu)'
      }
    }),
    menu: (base) => ({
      ...base,
      background: '#ffffff',
      border: '1px solid var(--glass-border)',
      borderRadius: '12px',
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
      overflow: 'hidden',
      zIndex: 100
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? 'var(--status-neutral-bg)' : 'transparent',
      color: state.isFocused ? 'var(--accent-blu)' : 'var(--text-main)',
      cursor: 'pointer',
      fontFamily: 'Inter',
      fontWeight: state.isSelected ? '600' : '400',
      padding: '0.75rem 1rem'
    }),
    singleValue: (base) => ({
      ...base,
      color: 'var(--text-main)',
      fontWeight: '500'
    }),
    input: (base) => ({
      ...base,
      color: 'var(--text-main)'
    }),
    placeholder: (base) => ({
      ...base,
      color: 'var(--text-muted)'
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

              {/* Dose & Application (Grouped by Crop - Robust Order-based) */}
              {(() => {
                const doseRows = data.filter(row => 
                  row.Product_Title === selectedProduct && 
                  row.Gazette_ID === gazette.id && 
                  row.Category?.toLowerCase() === 'dose'
                );
                
                if (doseRows.length === 0) return null;

                // Group by pairing Crop and Dose rows as they appear
                const groupedDoses = [];
                let currentPair = null;

                doseRows.forEach(row => {
                  const key = row.Data_Key?.toLowerCase();
                  
                  // If we find a "Crop" key, it's the start of a new pair
                  if (key === 'crop') {
                    if (currentPair) groupedDoses.push(currentPair);
                    currentPair = { crop: row.Data_Value, dose: "As per label" };
                  } else if (key === 'dose' || key === 'dosage') {
                    if (currentPair) {
                        currentPair.dose = row.Data_Value;
                    } else {
                        // Fallback if Dose appears before a Crop row
                        groupedDoses.push({ crop: "General", dose: row.Data_Value });
                    }
                  }
                });
                if (currentPair) groupedDoses.push(currentPair);

                return (
                  <div className="data-group">
                    <details>
                      <summary style={{ 
                        cursor: 'pointer', 
                        listStyle: 'none', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        outline: 'none'
                      }}>
                        <h3>Dose & Application</h3>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>▼ Click to expand</span>
                      </summary>
                      <div style={{ marginTop: '0.5rem' }}>
                        {groupedDoses.map((pair, i) => (
                          <div className="data-row" key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <span className="data-key" style={{ fontWeight: 600, color: 'var(--text-main)' }}>{pair.crop}</span>
                            <span className="data-value" style={{ maxWidth: '60%', textAlign: 'right' }}>{pair.dose}</span>
                          </div>
                        ))}
                      </div>
                    </details>
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
