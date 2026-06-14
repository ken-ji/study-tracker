const instances = new Map();

export function renderBarChart(canvasId, labels, values) {
  if (typeof Chart === 'undefined') {
    console.error('[charts] Chart.js not loaded');
    return;
  }
  destroyById(canvasId);
  const ctx = document.getElementById(canvasId).getContext('2d');
  instances.set(canvasId, new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: 'rgba(74, 144, 226, 0.75)',
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: v => `${v}分`,
          },
        },
      },
    },
  }));
}

export function renderPieChart(canvasId, labels, values, colors) {
  if (typeof Chart === 'undefined') {
    console.error('[charts] Chart.js not loaded');
    return;
  }
  destroyById(canvasId);
  const ctx = document.getElementById(canvasId).getContext('2d');
  instances.set(canvasId, new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
      },
    },
  }));
}

export function destroyAll() {
  instances.forEach(chart => chart.destroy());
  instances.clear();
}

function destroyById(canvasId) {
  if (instances.has(canvasId)) {
    instances.get(canvasId).destroy();
    instances.delete(canvasId);
  }
}
