import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import Papa from 'papaparse';

const CandlestickChart = () => {
  const [rawData, setRawData] = useState([]);
  const [selectedSkus, setSelectedSkus] = useState([]);
  const chartRef = useRef(null);

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
    const processedData = {};
    const dates = [...new Set(data.map(item => item.date))].sort();
    
    data.forEach(item => {
      const mappedSku = skuMapping[item.sku] || item.sku;
      const date = item.date;
      const previousDayCount = parseInt(item.previous_day_count) || 0;
      const currentCount = parseInt(item.current_count) || 0;
      const dailyChange = parseInt(item.daily_change) || 0;

      if (!processedData[mappedSku]) {
        processedData[mappedSku] = {};
      }

      if (!processedData[mappedSku][date]) {
        processedData[mappedSku][date] = [date, previousDayCount, currentCount, dailyChange];
      } else {
        // 如果已存在，累加数据
        processedData[mappedSku][date][1] += previousDayCount;
        processedData[mappedSku][date][2] += currentCount;
        processedData[mappedSku][date][3] += dailyChange;
      }
    });

    // 转换为数组格式
    Object.keys(processedData).forEach(sku => {
      processedData[sku] = dates.map(date => processedData[sku][date] || [date, 0, 0, 0]);
    });

    return { dates, processedData };
  }, []);

  const { dates, processedData } = useMemo(() => processData(rawData), [rawData, processData]);

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

  const getOption = useCallback(() => ({
    title: { text: 'SKU在籍会员变化' },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        if (!Array.isArray(params) || params.length === 0) {
          return '';
        }
        let result = `日期: ${params[0].axisValue}<br/>`;
        params.forEach(param => {
          if (Array.isArray(param.data) && param.data.length >= 4) {
            const [, yesterday, today, change] = param.data;
            result += `${param.seriesName}:<br/>
                       昨日: ${yesterday}<br/>
                       今日: ${today}<br/>
                       变化: ${change}<br/><br/>`;
          }
        });
        return result;
      }
    },
    legend: { type: 'scroll', bottom: 10 },
    xAxis: { 
      type: 'category', 
      data: dates,
      axisLabel: {
        formatter: (value) => {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            console.error('Invalid date:', value);
            return value;
          }
          return `${date.getMonth() + 1}月${date.getDate()}日`;
        }
      }
    },
    yAxis: { type: 'value' },
    series: selectedSkus.map(sku => ({
      name: sku,
      type: 'custom',
      renderItem: (params, api) => {
        const xValue = api.value(0);
        const yesterday = api.value(1);
        const today = api.value(2);
        const change = api.value(3);
        
        const start = api.coord([xValue, yesterday]);
        const end = api.coord([xValue, today]);
        const size = api.size([1, 0]);
        const width = Math.max(1, size[0] * 0.6);  // Ensure minimum width of 1 pixel

        const style = api.style({
          stroke: change >= 0 ? '#ef5350' : '#26a69a',
          fill: change >= 0 ? '#ef5350' : '#26a69a'
        });

        return {
          type: 'group',
          children: [{
            type: 'rect',
            shape: {
              x: start[0] - width / 2,
              y: Math.min(start[1], end[1]),
              width: width,
              height: Math.max(1, Math.abs(end[1] - start[1]))  // Ensure minimum height of 1 pixel
            },
            style
          }, {
            type: 'line',
            shape: {
              x1: start[0],
              y1: start[1],
              x2: start[0],
              y2: end[1]
            },
            style
          }]
        };
      },
      data: processedData[sku],
      z: 10
    }))
  }), [dates, processedData, selectedSkus]);

  useEffect(() => {
    if (chartRef.current) {
      const chart = chartRef.current.getEchartsInstance();
      chart.setOption(getOption());
    }
  }, [getOption]);

  return (
    <div className="App">
      <h1>SKU趋势可视化 (类K线图)</h1>
      <div>
        {Object.keys(processedData).map(sku => (
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
        ref={chartRef}
        option={getOption()} 
        style={{height: '600px'}} 
        notMerge={true}
        lazyUpdate={false}
      />
    </div>
  );
};

export default CandlestickChart;