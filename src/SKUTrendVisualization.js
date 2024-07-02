import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import Papa from 'papaparse';

const SKUTrendVisualization = () => {
  const [rawData, setRawData] = useState([]);
  const [selectedSkus, setSelectedSkus] = useState([]);
  const changeChartRef = useRef(null);
  const countChartRef = useRef(null);

  // 更新后的 SKU 映射
  const skuMapping = {
    '1个月会员': '1个月会员',
    '一个月会员': '1个月会员',
    '1年会员': '1年会员',
    '一年会员': '1年会员',
    '2年会员': '2年会员',
    '两年会员': '2年会员',
    '其他活动兑换': '其他活动兑换',
    '抽奖兑换': '抽奖兑换',
    '花瓣兑换': '花瓣兑换',
    '连续包季': '连续包季',
    '连续包年': '连续包年',
    '连续包年首年': '连续包年',  // 将 '连续包年首年' 映射到 '连续包年'
    '连续包月': '连续包月',
    '连续包月首月': '连续包月'// 将 '连续包年首年' 映射到 '连续包年'
  };

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/sku_data.csv`)
      .then(response => response.arrayBuffer())
      .then(buffer => {
        const decoder = new TextDecoder('gbk');
        const text = decoder.decode(buffer);
        Papa.parse(text, {
          header: true,
          complete: (results) => {
            setRawData(results.data);
          }
        });
      });
  }, []);

  const processData = useCallback((data) => {
    const dates = [...new Set(data.map(item => item.date))].sort();
    const changeData = {};
    const countData = {};
    
    data.forEach(item => {
      const mappedSku = skuMapping[item.sku] || item.sku;
      const date = item.date;
      const dailyChange = parseInt(item.daily_change) || 0;
      const currentCount = parseInt(item.current_count) || 0;

      if (!changeData[mappedSku]) {
        changeData[mappedSku] = Object.fromEntries(dates.map(d => [d, 0]));
      }
      if (!countData[mappedSku]) {
        countData[mappedSku] = Object.fromEntries(dates.map(d => [d, 0]));
      }

      changeData[mappedSku][date] += dailyChange;
      countData[mappedSku][date] += currentCount;
    });

    // 转换为数组格式
    Object.keys(changeData).forEach(sku => {
      changeData[sku] = dates.map(date => changeData[sku][date]);
      countData[sku] = dates.map(date => countData[sku][date]);
    });

    return { dates, changeData, countData };
  }, []);

  const { dates, changeData, countData } = useMemo(() => processData(rawData), [rawData, processData]);

  const handleSkuChange = useCallback((event) => {
    const sku = event.target.value;
    const isChecked = event.target.checked;

    setSelectedSkus(prev => {
      if (isChecked && !prev.includes(sku)) {
        return [...prev, sku];
      } else if (!isChecked && prev.includes(sku)) {
        return prev.filter(item => item !== sku);
      }
      return prev;
    });
  }, []);

  const getChangeOption = useCallback(() => ({
    title: { text: 'SKU日变化趋势' },
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', bottom: 10 },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value' },
    series: selectedSkus.map(sku => ({
      name: sku,
      type: 'line',
      data: changeData[sku]
    }))
  }), [dates, changeData, selectedSkus]);

  const getCountOption = useCallback(() => ({
    title: { text: 'SKU每日在籍会员数' },
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', bottom: 10 },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value' },
    series: selectedSkus.map(sku => ({
      name: sku,
      type: 'line',
      data: countData[sku]
    }))
  }), [dates, countData, selectedSkus]);

  useEffect(() => {
    if (changeChartRef.current) {
      const chart = changeChartRef.current.getEchartsInstance();
      chart.setOption(getChangeOption());
    }
    if (countChartRef.current) {
      const chart = countChartRef.current.getEchartsInstance();
      chart.setOption(getCountOption());
    }
  }, [getChangeOption, getCountOption]);

  return (
    <div className="App">
      <h1>SKU趋势可视化</h1>
      <div>
        {Object.keys(changeData).map(sku => (
          <label key={sku} style={{marginRight: '10px'}}>
            <input
              type="checkbox"
              value={sku}
              checked={selectedSkus.includes(sku)}
              onChange={handleSkuChange}
            />
            {sku}
          </label>
        ))}
      </div>
      <ReactECharts 
        ref={changeChartRef}
        option={getChangeOption()} 
        style={{height: '400px'}} 
        notMerge={true}
        lazyUpdate={false}
      />
      <ReactECharts 
        ref={countChartRef}
        option={getCountOption()} 
        style={{height: '400px'}} 
        notMerge={true}
        lazyUpdate={false}
      />
    </div>
  );
};

export default SKUTrendVisualization;