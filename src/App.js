import React from 'react';
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';
import SKUTrendVisualization from './SKUTrendVisualization';
import CandlestickChart from './CandlestickChart';

function App() {
  return (
    <Router>
      <div>
        <nav>
          <ul>
            <li>
              <Link to="/">原始图表</Link>
            </li>
            <li>
              <Link to="/candlestick">类K线图</Link>
            </li>
          </ul>
        </nav>

        <Routes>
          <Route path="/" element={<SKUTrendVisualization />} />
          <Route path="/candlestick" element={<CandlestickChart />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;