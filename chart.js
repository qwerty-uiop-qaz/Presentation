class PieChart extends HTMLElement {
  constructor() {
    super();
    const container = document.createElement('div');
    container.className = 'pie-container';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('pie-svg');
    svg.setAttribute('viewBox', '0 0 250 250');
    container.appendChild(svg);
    const legend = document.createElement('div');
    legend.className = 'pie-legend';
    container.appendChild(legend);
    this.appendChild(container);
    this.svg = svg;
    this.legend = legend;
    this.defaultColors = [
      '#e74c3c', '#3498db', '#f1c40f', '#27ae60', '#9b59b6', '#1abc9c',
      '#e67e22', '#34495e', '#7f8c8d', '#ff6f61', '#6b5b95', '#88b04b'
    ];
    this._animationFrame = null;
    this._interval = null;
    this._observer = null;
    this._inView = false;
  }
  connectedCallback() {
    this.style.display = 'block';
    this.style.width = '350px';
    this.style.height = '350px';
    this.querySelector('.pie-container').style.width = '100%';
    this.querySelector('.pie-container').style.height = '100%';
    this.drawChart();
    this.suppressSeriesContent();
    this.setupAnimationObserver();
    if (this.hasAttribute('repeat-interval')) {
      this.startRepeatAnimation();
    }
  }
  disconnectedCallback() {
    if (this._observer) this._observer.disconnect();
    if (this._interval) clearInterval(this._interval);
    if (this._animationFrame) cancelAnimationFrame(this._animationFrame);
  }
  drawChart() {
    this.svg.innerHTML = '';
    this.legend.innerHTML = '';
    const seriesEls = Array.from(this.querySelectorAll('series'));
    const usedColors = [];
    const data = [];
    seriesEls.forEach((el) => {
      let value = el.getAttribute('value');
      if (value === null || value === undefined || isNaN(Number(value))) return;
      value = Number(value);
      if (value <= 0) return;
      let color = el.getAttribute('color');
      if (!color) {
        color = this.defaultColors.find(c => !usedColors.includes(c));
        if (!color) color = '#' + Math.floor(Math.random() * 16777215).toString(16);
      }
      usedColors.push(color);
      let label = (el.textContent || '').trim();
      data.push({ value, color, label });
    });
    if (!data.length) {
      this.legend.style.display = 'none';
      return;
    }
    const cx = 125, cy = 125, r = 100;
    const total = data.reduce((sum, d) => sum + d.value, 0);
    let currentAngle = -90;
    this.sliceData = [];
    data.forEach((d) => {
      const angleSpan = (d.value / total) * 360;
      const start = currentAngle;
      const end = start;
      const finalEnd = start + angleSpan;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', this.describeArc(cx, cy, r, start, end));
      path.setAttribute('fill', d.color);
      this.svg.appendChild(path);
      this.sliceData.push({
        path,
        cx, cy, r,
        start,
        end,
        finalEnd
      });
      currentAngle += angleSpan;
    });
    const hasLabels = data.some(d => d.label);
    if (hasLabels) {
      this.legend.style.display = '';
      data.forEach(d => {
        if (!d.label) return;
        const entry = document.createElement('div');
        entry.className = 'pie-legend-entry';
        const swatch = document.createElement('span');
        swatch.className = 'pie-legend-swatch';
        swatch.style.background = d.color;
        entry.appendChild(swatch);
        const text = document.createElement('span');
        text.className = 'pie-legend-label';
        text.textContent = d.label;
        entry.appendChild(text);
        this.legend.appendChild(entry);
      });
    } else {
      this.legend.style.display = 'none';
    }
  }
  describeArc(cx, cy, r, startAngle, endAngle) {
    const rad = Math.PI / 180;
    const x1 = cx + r * Math.cos(rad * startAngle);
    const y1 = cy + r * Math.sin(rad * startAngle);
    const x2 = cx + r * Math.cos(rad * endAngle);
    const y2 = cy + r * Math.sin(rad * endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
  }
  suppressSeriesContent() {
    const seriesEls = Array.from(this.querySelectorAll('series'));
    seriesEls.forEach((el) => { el.textContent = ''; });
  }
  setupAnimationObserver() {
    if (this._observer) this._observer.disconnect();
    this._observer = new window.IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this._inView = true;
          this.restartAnimation();
        } else {
          this._inView = false;
        }
      });
    }, { threshold: 0.4 });
    this._observer.observe(this);
  }
  animateSlices() {
    if (!this.sliceData || !this.sliceData.length) return;
    if (this._animationFrame) cancelAnimationFrame(this._animationFrame);
    const duration = Number(this.getAttribute('animation-length')) || 1200;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      let prevEnd = -90;
      this.sliceData.forEach(slice => {
        const sweep = slice.finalEnd - slice.start;
        const currentEnd = prevEnd + sweep * t;
        slice.path.setAttribute('d', this.describeArc(
          slice.cx, slice.cy, slice.r, prevEnd, currentEnd
        ));
        prevEnd = currentEnd;
      });
      if (t < 1) {
        this._animationFrame = requestAnimationFrame(animate);
      } else {
        this._animationFrame = null;
      }
    };
    this._animationFrame = requestAnimationFrame(animate);
  }
  restartAnimation() {
    this.animateSlices();
  }
  startRepeatAnimation() {
    const interval = Number(this.getAttribute('repeat-interval')) || 2000;
    if (this._interval) clearInterval(this._interval);
    this._interval = setInterval(() => {
      if (this._inView) {
        this.restartAnimation();
      }
    }, interval);
    this.restartAnimation();
  }
}
customElements.define('pie-chart', PieChart);
class BarChart extends HTMLElement {
  constructor() {
    super();
    const container = document.createElement('div');
    container.className = 'bar-container';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('bar-svg');
    svg.setAttribute('viewBox', '0 0 250 250');
    container.appendChild(svg);
    const legend = document.createElement('div');
    legend.className = 'bar-legend';
    container.appendChild(legend);
    this.appendChild(container);
    this.svg = svg;
    this.legend = legend;
    this.defaultColor = '#3498db';
    this._animationFrame = null;
    this._interval = null;
    this._observer = null;
    this._inView = false;
  }
  connectedCallback() {
    this.style.display = 'block';
    this.style.width = '350px';
    this.style.height = '350px';
    this.querySelector('.bar-container').style.width = '100%';
    this.querySelector('.bar-container').style.height = '100%';
    this.drawChart();
    this.suppressSeriesContent();
    this.setupAnimationObserver();
    if (this.hasAttribute('repeat-interval')) {
      this.startRepeatAnimation();
    }
  }
  disconnectedCallback() {
    if (this._observer) this._observer.disconnect();
    if (this._interval) clearInterval(this._interval);
    if (this._animationFrame) cancelAnimationFrame(this._animationFrame);
  }
  drawChart() {
    this.svg.innerHTML = '';
    this.legend.innerHTML = '';
    const seriesEls = Array.from(this.querySelectorAll('series'));
    const data = [];
    seriesEls.forEach((el) => {
      let value = el.getAttribute('value');
      if (value === null || value === undefined || isNaN(Number(value))) return;
      value = Number(value);
      if (value < 0) return;
      let color = el.getAttribute('color') || this.defaultColor;
      let label = (el.textContent || '').trim();
      data.push({ value, color, label });
    });
    if (!data.length) {
      this.legend.style.display = 'none';
      return;
    }
    const maxVal = Math.max(...data.map(d => d.value));
    const barWidth = 32;
    const gap = 18;
    const chartHeight = 180;
    const offsetX = 24;
    const offsetY = 40;
    this.barRects = [];
    data.forEach((d, i) => {
      const x = offsetX + i * (barWidth + gap);
      const y = offsetY + chartHeight;
      const height = d.value / maxVal * chartHeight;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', barWidth);
      rect.setAttribute('height', 0);
      rect.setAttribute('fill', d.color);
      this.svg.appendChild(rect);
      this.barRects.push({
        rect,
        x, y, height, color: d.color,
        finalY: y - height
      });
      if (d.label) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x + barWidth / 2);
        text.setAttribute('y', offsetY + chartHeight + 20);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '13');
        text.setAttribute('fill', '#333');
        text.textContent = d.label;
        this.svg.appendChild(text);
      }
    });
    const hasLabels = data.some(d => d.label);
    if (hasLabels) {
      this.legend.style.display = '';
      data.forEach(d => {
        if (!d.label) return;
        const entry = document.createElement('div');
        entry.className = 'bar-legend-entry';
        const swatch = document.createElement('span');
        swatch.className = 'bar-legend-swatch';
        swatch.style.background = d.color;
        entry.appendChild(swatch);
        const text = document.createElement('span');
        text.className = 'bar-legend-label';
        text.textContent = d.label;
        entry.appendChild(text);
        this.legend.appendChild(entry);
      });
    } else {
      this.legend.style.display = 'none';
    }
  }
  suppressSeriesContent() {
    const seriesEls = Array.from(this.querySelectorAll('series'));
    seriesEls.forEach((el) => { el.textContent = ''; });
  }
  setupAnimationObserver() {
    if (this._observer) this._observer.disconnect();
    this._observer = new window.IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this._inView = true;
          this.restartAnimation();
        } else {
          this._inView = false;
        }
      });
    }, { threshold: 0.4 });
    this._observer.observe(this);
  }
  animateBars() {
    if (!this.barRects || !this.barRects.length) return;
    if (this._animationFrame) cancelAnimationFrame(this._animationFrame);
    const duration = Number(this.getAttribute('animation-length')) || 1200;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      this.barRects.forEach(bar => {
        const currentHeight = bar.height * t;
        const currentY = bar.y - currentHeight;
        bar.rect.setAttribute('y', currentY);
        bar.rect.setAttribute('height', currentHeight);
      });
      if (t < 1) {
        this._animationFrame = requestAnimationFrame(animate);
      } else {
        this._animationFrame = null;
      }
    };
    this._animationFrame = requestAnimationFrame(animate);
  }
  restartAnimation() {
    this.animateBars();
  }
  startRepeatAnimation() {
    const interval = Number(this.getAttribute('repeat-interval')) || 2000;
    if (this._interval) clearInterval(this._interval);
    this._interval = setInterval(() => {
      if (this._inView) {
        this.restartAnimation();
      }
    }, interval);
    this.restartAnimation();
  }
}
customElements.define('bar-chart', BarChart);
// Register a dummy custom element for <series> so it is recognized in the DOM
if (!customElements.get('series')) {
  customElements.define('series', class extends HTMLElement {});
}
