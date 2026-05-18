export class FinanceCharts {
    _setup(canvas) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        return { ctx, w: rect.width, h: rect.height };
    }

    drawPieChart(canvas, data, labels, colors) {
        const { ctx, w, h } = this._setup(canvas);
        ctx.clearRect(0, 0, w, h);

        const total = data.reduce((a, v) => a + v, 0);
        if (total === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.beginPath();
            ctx.arc(w / 2, h / 2, Math.min(w, h) / 2 - 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = `13px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('Sem dados', w / 2, h / 2 + 5);
            return;
        }

        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(w, h) / 2 - 8;
        let angle = -Math.PI / 2;

        data.forEach((value, i) => {
            const slice = (value / total) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, radius, angle, angle + slice);
            ctx.closePath();
            ctx.fillStyle = colors[i % colors.length];
            ctx.fill();
            ctx.strokeStyle = '#111827';
            ctx.lineWidth = 2;
            ctx.stroke();
            angle += slice;
        });

        // Donut hole
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.42, 0, Math.PI * 2);
        ctx.fillStyle = '#111827';
        ctx.fill();
    }

    drawBarChart(canvas, incomeData, expenseData, labels) {
        const { ctx, w, h } = this._setup(canvas);
        ctx.clearRect(0, 0, w, h);

        const pad = { top: 16, right: 12, bottom: 36, left: 42 };
        const cw = w - pad.left - pad.right;
        const ch = h - pad.top - pad.bottom;

        const maxVal = Math.max(...incomeData, ...expenseData, 1);
        const groups = labels.length;
        const gw = cw / groups;
        const bw = gw * 0.32;

        // Grid lines + Y labels
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = `10px Inter, sans-serif`;
        ctx.textAlign = 'right';

        for (let i = 0; i <= 4; i++) {
            const y = pad.top + (ch / 4) * i;
            ctx.beginPath();
            ctx.moveTo(pad.left, y);
            ctx.lineTo(w - pad.right, y);
            ctx.stroke();
            const val = maxVal - (maxVal / 4) * i;
            ctx.fillText(this._short(val), pad.left - 4, y + 4);
        }

        // Bars
        labels.forEach((label, i) => {
            const x = pad.left + gw * i + gw * 0.08;

            const ih = (incomeData[i] / maxVal) * ch;
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.roundRect(x, pad.top + ch - ih, bw, ih, [3, 3, 0, 0]);
            ctx.fill();

            const eh = (expenseData[i] / maxVal) * ch;
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.roundRect(x + bw + 2, pad.top + ch - eh, bw, eh, [3, 3, 0, 0]);
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.font = `9px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(label, x + bw, h - pad.bottom + 14);
        });
    }

    _short(val) {
        if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
        return val.toFixed(0);
    }
}
