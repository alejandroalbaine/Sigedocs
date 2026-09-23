function prepareCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(rect.width || canvas.clientWidth || 300));
  const height = Math.max(1, Math.round(rect.height || canvas.clientHeight || 150));
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const context = canvas.getContext('2d');
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  return { context, width, height };
}

function drawEmpty(context, width, height) {
  context.fillStyle = '#7d8697';
  context.font = '12px Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('Sin datos disponibles', width / 2, height / 2);
}

export function drawBarChart(canvas, { labels = [], received = [], registered = [] } = {}) {
  const { context, width, height } = prepareCanvas(canvas);
  const values = [...received, ...registered].map(Number).filter(Number.isFinite);
  if (!labels.length || !values.length || Math.max(...values) <= 0) {
    drawEmpty(context, width, height);
    return;
  }

  const padding = { top: 12, right: 12, bottom: 28, left: 32 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maximum = Math.max(...values, 1);
  const groupWidth = chartWidth / labels.length;
  const barWidth = Math.max(3, Math.min(18, groupWidth * 0.28));

  context.strokeStyle = '#e5e8ef';
  context.fillStyle = '#7d8697';
  context.font = '9px Arial, sans-serif';
  context.textAlign = 'right';
  context.textBaseline = 'middle';
  for (let index = 0; index <= 4; index++) {
    const y = padding.top + chartHeight * (index / 4);
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
    context.fillText(String(Math.round(maximum * (1 - index / 4))), padding.left - 6, y);
  }

  labels.forEach((label, index) => {
    const center = padding.left + groupWidth * index + groupWidth / 2;
    const firstHeight = chartHeight * ((Number(received[index]) || 0) / maximum);
    const secondHeight = chartHeight * ((Number(registered[index]) || 0) / maximum);
    context.fillStyle = '#173b6c';
    context.fillRect(center - barWidth - 1, padding.top + chartHeight - firstHeight, barWidth, firstHeight);
    context.fillStyle = '#f28c28';
    context.fillRect(center + 1, padding.top + chartHeight - secondHeight, barWidth, secondHeight);
    context.fillStyle = '#697386';
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillText(String(label), center, padding.top + chartHeight + 7);
  });
}

export function drawDoughnutChart(canvas, { values = [] } = {}) {
  const { context, width, height } = prepareCanvas(canvas);
  const normalized = values.map((value) => Math.max(0, Number(value) || 0));
  const total = normalized.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    drawEmpty(context, width, height);
    return;
  }

  const colors = ['#263f70', '#ed8a2b', '#d9a02d', '#cf564c'];
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.max(10, Math.min(width, height) * 0.38);
  let start = -Math.PI / 2;

  normalized.forEach((value, index) => {
    if (value <= 0) return;
    const end = start + (value / total) * Math.PI * 2;
    context.beginPath();
    context.arc(centerX, centerY, radius, start, end);
    context.strokeStyle = colors[index % colors.length];
    context.lineWidth = Math.max(8, radius * 0.28);
    context.stroke();
    start = end;
  });
}
