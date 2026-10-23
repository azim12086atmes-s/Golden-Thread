// Authored Golden Thread Meadow plant geometry/atlases at a6c20a4.
// Extracted without changing silhouettes, blade painting or flower painting.
import * as THREE from 'three';
function tuftGeo() {
    const pos = [], uv = [], tip = [], nor = [], idx = [];
    const W = 0.95, H = 0.9;
    for(let q = 0; q < 3; q++){
        const a = q / 3 * Math.PI + 0.3, cx = Math.cos(a) * W / 2, cz = Math.sin(a) * W / 2, base = pos.length / 3;
        pos.push(-cx, 0, -cz, cx, 0, cz, cx, H, cz, -cx, H, -cz);
        uv.push(q % 2 ? 1 : 0, 0, q % 2 ? 0 : 1, 0, q % 2 ? 0 : 1, 1, q % 2 ? 1 : 0, 1);
        tip.push(0, 0, 1, 1);
        for(let i = 0; i < 4; i++)nor.push(0, 1, 0);
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('tip', new THREE.Float32BufferAttribute(tip, 1));
    g.setIndex(idx);
    return g;
}
function tuftTexture() {
    if (typeof document === 'undefined') return null;
    const S = 512, c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const x = c.getContext('2d');
    let seed = 11;
    const r = ()=>(seed = seed * 16807 % 2147483647) / 2147483647;
    const N = 110;
    for(let i = 0; i < N; i++){
        const depth = i / N;
        const root = S / 2 + (r() - 0.5) * S * 0.36, h = S * (0.42 + r() * 0.52) * (1 - depth * 0.15);
        const lean = (root - S / 2) * (0.9 + r()) + (r() - 0.5) * S * 0.25;
        const w = 3 + r() * 5, dry = r() < 0.07;
        const tipX = root + lean, tipY = S - h, midX = root + lean * 0.3, midY = S - h * 0.55;
        const light = 0.76 + depth * 0.24;
        const tone = (k, side)=>{
            const v = Math.round(255 * Math.min(1, (0.62 + k * 0.42) * light * side));
            return dry ? `rgb(${v},${Math.round(v * 0.93)},${Math.round(v * 0.7)})` : `rgb(${Math.round(v * 0.96)},${v},${Math.round(v * 0.9)})`;
        };
        for (const side of [
            -1,
            1
        ]){
            const g = x.createLinearGradient(0, S, 0, tipY);
            const sh = side < 0 ? 1 : 0.78;
            g.addColorStop(0, tone(0, sh));
            g.addColorStop(0.5, tone(0.75, sh));
            g.addColorStop(1, tone(1, sh));
            x.fillStyle = g;
            x.beginPath();
            x.moveTo(root, S);
            x.quadraticCurveTo(midX, midY, tipX, tipY);
            x.quadraticCurveTo(midX + side * w * 0.9, midY, root + side * w, S);
            x.closePath();
            x.fill();
        }
    }
    for(let i = 0; i < 3; i++){
        const root = S / 2 + (r() - 0.5) * S * 0.2, h = S * (0.85 + r() * 0.12), lean = (r() - 0.5) * S * 0.3;
        x.strokeStyle = 'rgb(214,214,190)';
        x.lineWidth = 2;
        x.beginPath();
        x.moveTo(root, S);
        x.quadraticCurveTo(root + lean * 0.2, S - h * 0.6, root + lean, S - h);
        x.stroke();
        for(let k = 0; k < 7; k++){
            x.fillStyle = 'rgb(236,228,196)';
            x.beginPath();
            x.ellipse(root + lean + (k % 2 ? 4 : -4), S - h + k * 6, 3.2, 6, lean * 0.004 + (k % 2 ? 0.5 : -0.5), 0, Math.PI * 2);
            x.fill();
        }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
}
function flowerGeo() {
    const pos = [], uv = [], tip = [], nor = [], idx = [];
    const W = 0.62, H = 0.66;
    for(let q = 0; q < 2; q++){
        const a = q * Math.PI / 2 + 0.4, cx = Math.cos(a) * W / 2, cz = Math.sin(a) * W / 2, base = pos.length / 3;
        pos.push(-cx, 0, -cz, cx, 0, cz, cx, H, cz, -cx, H, -cz);
        uv.push(0, 0, 1, 0, 1, 1, 0, 1);
        tip.push(0, 0, 1, 1);
        for(let i = 0; i < 4; i++)nor.push(0, 1, 0);
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('tip', new THREE.Float32BufferAttribute(tip, 1));
    g.setIndex(idx);
    return g;
}
function flowerTexture() {
    if (typeof document === 'undefined') return null;
    const C = 256, c = document.createElement('canvas');
    c.width = C * 4;
    c.height = C * 2;
    const x = c.getContext('2d');
    let seed = 5;
    const r = ()=>(seed = seed * 16807 % 2147483647) / 2147483647;
    const PETAL = 'rgb(250,248,244)', PETAL2 = 'rgb(228,224,222)', STEM = 'rgb(74,132,58)', LEAF = 'rgb(88,150,66)', HEART = 'rgb(246,196,52)';
    const stem = (x0, y0, x1, y1, w = 4)=>{
        x.strokeStyle = STEM;
        x.lineWidth = w;
        x.lineCap = 'round';
        x.beginPath();
        x.moveTo(x0, y0);
        x.quadraticCurveTo(x0 + (x1 - x0) * 0.2, (y0 + y1) / 2, x1, y1);
        x.stroke();
    };
    const leaf = (lx, ly, len, ang)=>{
        x.save();
        x.translate(lx, ly);
        x.rotate(ang);
        x.fillStyle = LEAF;
        x.beginPath();
        x.moveTo(0, 0);
        x.quadraticCurveTo(len * 0.5, -len * 0.22, len, 0);
        x.quadraticCurveTo(len * 0.5, len * 0.22, 0, 0);
        x.fill();
        x.restore();
    };
    const petals = (cx, cy, n, len, wid, col = PETAL, rot = 0)=>{
        for(let i = 0; i < n; i++){
            const a = rot + i / n * Math.PI * 2;
            x.save();
            x.translate(cx, cy);
            x.rotate(a);
            x.fillStyle = i % 2 ? col : PETAL2 === col ? PETAL : col;
            x.beginPath();
            x.ellipse(len / 2, 0, len / 2, wid / 2, 0, 0, Math.PI * 2);
            x.fill();
            x.restore();
        }
    };
    const heart = (cx, cy, rr, col = HEART)=>{
        x.fillStyle = col;
        x.beginPath();
        x.arc(cx, cy, rr, 0, Math.PI * 2);
        x.fill();
    };
    const cell = (i, draw)=>{
        x.save();
        x.beginPath();
        x.rect(i % 4 * C + 6, Math.floor(i / 4) * C + 6, C - 12, C - 12);
        x.clip();
        draw(i % 4 * C, Math.floor(i / 4) * C);
        x.restore();
    };
    const B = C - 8;
    cell(0, (ox, oy)=>{
        for (const [dx, h] of [
            [
                -50,
                150
            ],
            [
                30,
                190
            ],
            [
                70,
                120
            ]
        ]){
            stem(ox + 128 + dx, oy + B, ox + 128 + dx * 0.8, oy + B - h, 3);
            leaf(ox + 128 + dx, oy + B - 30, 34, -2.4);
            petals(ox + 128 + dx * 0.8, oy + B - h, 16, 34, 9);
            heart(ox + 128 + dx * 0.8, oy + B - h, 10);
        }
    });
    cell(1, (ox, oy)=>{
        for (const [dx, h] of [
            [
                -40,
                170
            ],
            [
                45,
                140
            ]
        ]){
            stem(ox + 128 + dx, oy + B, ox + 128 + dx, oy + B - h, 4);
            leaf(ox + 128 + dx, oy + B - 40, 40, -2.2);
            petals(ox + 128 + dx, oy + B - h, 4, 46, 44, PETAL, 0.3);
            heart(ox + 128 + dx, oy + B - h, 9, 'rgb(40,36,40)');
        }
    });
    cell(2, (ox, oy)=>{
        for (const [dx, h] of [
            [
                -30,
                180
            ],
            [
                50,
                130
            ]
        ]){
            stem(ox + 128 + dx, oy + B, ox + 128 + dx, oy + B - h, 3);
            leaf(ox + 128 + dx, oy + B - 60, 44, -2.6);
            for(let k = 0; k < 12; k++)petals(ox + 128 + dx, oy + B - h, 1, 30 + k % 3 * 5, 12, PETAL, k / 12 * Math.PI * 2);
            heart(ox + 128 + dx, oy + B - h, 7, 'rgb(90,80,150)');
        }
    });
    cell(3, (ox, oy)=>{
        for (const [dx, h] of [
            [
                -55,
                120
            ],
            [
                0,
                175
            ],
            [
                55,
                140
            ]
        ]){
            stem(ox + 128 + dx, oy + B, ox + 128 + dx, oy + B - h, 3);
            petals(ox + 128 + dx, oy + B - h, 5, 24, 22, PETAL, 1.2);
            heart(ox + 128 + dx, oy + B - h, 6);
        }
        leaf(ox + 128, oy + B - 20, 50, -2.8);
        leaf(ox + 128, oy + B - 20, 50, -0.3);
    });
    cell(4, (ox, oy)=>{
        for (const dx of [
            -50,
            -15,
            20,
            55
        ]){
            const h = 170 + r() * 50;
            stem(ox + 128 + dx * 0.4, oy + B, ox + 128 + dx, oy + B - h, 3);
            for(let k = 0; k < 9; k++){
                x.fillStyle = k % 2 ? PETAL : PETAL2;
                x.beginPath();
                x.ellipse(ox + 128 + dx + (k % 2 ? 4 : -4), oy + B - h + k * 9, 6, 8, 0, 0, Math.PI * 2);
                x.fill();
            }
        }
    });
    cell(5, (ox, oy)=>{
        for (const [dx, h] of [
            [
                -45,
                110
            ],
            [
                35,
                150
            ]
        ]){
            stem(ox + 128 + dx, oy + B, ox + 128 + dx, oy + B - h, 3);
            for(let k = 0; k < 26; k++){
                const a = r() * Math.PI * 2, d = r() * 20;
                x.fillStyle = k % 3 ? PETAL : PETAL2;
                x.beginPath();
                x.ellipse(ox + 128 + dx + Math.cos(a) * d, oy + B - h + Math.sin(a) * d, 6, 3, a, 0, Math.PI * 2);
                x.fill();
            }
        }
        for(let k = 0; k < 3; k++)leaf(ox + 110, oy + B - 30, 36, -Math.PI / 2 + (k - 1) * 0.9);
    });
    cell(6, (ox, oy)=>{
        stem(ox + 90, oy + B, ox + 170, oy + B - 190, 3);
        for(let k = 0; k < 4; k++){
            const bx = ox + 105 + k * 20, by = oy + B - 90 - k * 30;
            x.fillStyle = PETAL;
            x.beginPath();
            x.moveTo(bx - 14, by + 20);
            x.quadraticCurveTo(bx, by - 18, bx + 14, by + 20);
            x.lineTo(bx + 18, by + 26);
            x.lineTo(bx - 18, by + 26);
            x.closePath();
            x.fill();
        }
        leaf(ox + 95, oy + B - 30, 44, -2.3);
    });
    cell(7, (ox, oy)=>{
        for (const [dx, h] of [
            [
                -40,
                140
            ],
            [
                40,
                160
            ]
        ]){
            stem(ox + 128 + dx, oy + B, ox + 128 + dx, oy + B - h, 3);
            leaf(ox + 128 + dx, oy + B - 50, 34, -2.5);
            for(let k = 0; k < 7; k++){
                const a = k / 7 * Math.PI * 2, d = k ? 22 : 0;
                petals(ox + 128 + dx + Math.cos(a) * d, oy + B - h + Math.sin(a) * d, 5, 13, 11);
                heart(ox + 128 + dx + Math.cos(a) * d, oy + B - h + Math.sin(a) * d, 3);
            }
        }
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
}

export { tuftGeo, tuftTexture, flowerGeo, flowerTexture };

function leafAtlas() {
    if (typeof document === 'undefined') return null;
    const C = 256, c = document.createElement('canvas');
    c.width = C * 4;
    c.height = C * 2;
    const x = c.getContext('2d');
    let seed = 17;
    const r = ()=>(seed = seed * 16807 % 2147483647) / 2147483647;
    const grey = (v)=>`rgb(${Math.round(v * 0.95)},${Math.round(v)},${Math.round(v * 0.88)})`;
    const leaf = (lx, ly, len, wid, a, v, lobed = false)=>{
        x.save();
        x.translate(lx, ly);
        x.rotate(a);
        x.fillStyle = grey(v);
        x.beginPath();
        x.moveTo(0, 0);
        if (lobed) {
            for(let i = 0; i <= 6; i++){
                const t = i / 6;
                x.lineTo(t * len, -wid * Math.sin(t * Math.PI) * (i % 2 ? 1 : 0.72));
            }
            for(let i = 6; i >= 0; i--){
                const t = i / 6;
                x.lineTo(t * len, wid * Math.sin(t * Math.PI) * (i % 2 ? 1 : 0.72));
            }
        } else {
            x.quadraticCurveTo(len * 0.45, -wid, len, 0);
            x.quadraticCurveTo(len * 0.45, wid, 0, 0);
        }
        x.fill();
        x.strokeStyle = grey(Math.min(255, v + 45));
        x.lineWidth = 1.2;
        x.beginPath();
        x.moveTo(0, 0);
        x.lineTo(len * 0.9, 0);
        x.stroke();
        x.restore();
    };
    const cell = (i, draw)=>{
        x.save();
        x.beginPath();
        x.rect(i % 4 * C + 4, Math.floor(i / 4) * C + 4, C - 8, C - 8);
        x.clip();
        draw(i % 4 * C + C / 2, Math.floor(i / 4) * C + C / 2);
        x.restore();
    };
    cell(0, (cx, cy)=>{
        for(let i = 0; i < 26; i++){
            const a = r() * Math.PI * 2, d = r() * 70;
            leaf(cx + Math.cos(a) * d - Math.cos(a) * 30, cy + Math.sin(a) * d - Math.sin(a) * 30, 46 + r() * 30, 17 + r() * 8, a + (r() - 0.5) * 0.8, 150 + r() * 90, r() < 0.4);
        }
    });
    cell(1, (cx, cy)=>{
        x.strokeStyle = 'rgb(120,110,95)';
        x.lineWidth = 2;
        for(let t = 0; t < 7; t++){
            const a = t / 7 * Math.PI * 2 + r();
            x.beginPath();
            x.moveTo(cx, cy);
            x.lineTo(cx + Math.cos(a) * 110, cy + Math.sin(a) * 110);
            x.stroke();
        }
        for(let i = 0; i < 70; i++){
            const a = r() * Math.PI * 2, d = 20 + r() * 95;
            leaf(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 20 + r() * 12, 7 + r() * 4, a + (r() - 0.5) * 1.6, 150 + r() * 95);
        }
    });
    cell(2, (cx, cy)=>{
        for(let b = 0; b < 14; b++){
            const a0 = r() * Math.PI * 2, d = r() * 70, bx = cx + Math.cos(a0) * d, by = cy + Math.sin(a0) * d;
            for(let k = 0; k < 22; k++){
                const a = a0 + (r() - 0.5) * 2.4, len = 26 + r() * 30;
                x.strokeStyle = grey(140 + r() * 100);
                x.lineWidth = 1.6;
                x.beginPath();
                x.moveTo(bx, by);
                x.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len);
                x.stroke();
            }
        }
    });
    cell(3, (cx, cy)=>{
        for(let i = 0; i < 8; i++){
            const a = r() * Math.PI * 2, d = r() * 80;
            leaf(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 34, 12, a, 120 + r() * 40);
        }
        for(let i = 0; i < 34; i++){
            const a = r() * Math.PI * 2, d = r() * 100, fx = cx + Math.cos(a) * d, fy = cy + Math.sin(a) * d, pr = 9 + r() * 6;
            for(let k = 0; k < 5; k++){
                const pa = k / 5 * Math.PI * 2 + a;
                x.fillStyle = k % 2 ? 'rgb(252,250,248)' : 'rgb(236,232,232)';
                x.beginPath();
                x.ellipse(fx + Math.cos(pa) * pr * 0.7, fy + Math.sin(pa) * pr * 0.7, pr * 0.62, pr * 0.46, pa, 0, Math.PI * 2);
                x.fill();
            }
            x.fillStyle = 'rgb(246,200,80)';
            x.beginPath();
            x.arc(fx, fy, pr * 0.28, 0, Math.PI * 2);
            x.fill();
        }
    });
    cell(4, (cx, cy)=>{
        x.strokeStyle = grey(200);
        x.lineWidth = 3;
        x.beginPath();
        x.moveTo(cx, cy + 124);
        x.lineTo(cx, cy - 124);
        x.stroke();
        for(let i = 0; i < 22; i++){
            const yy = cy + 118 - i * 11;
            for (const sd of [
                -1,
                1
            ])leaf(cx, yy, 64 + r() * 34 - i * 1.2, 5 + r() * 2, sd < 0 ? Math.PI + 0.55 + (r() - 0.5) * 0.2 : -0.55 + (r() - 0.5) * 0.2, 150 + r() * 80);
        }
    });
    cell(5, (cx, cy)=>{
        x.strokeStyle = 'rgb(150,150,110)';
        x.lineWidth = 2;
        x.beginPath();
        x.moveTo(cx - 100, cy + 100);
        x.lineTo(cx + 60, cy - 60);
        x.stroke();
        for(let i = 0; i < 16; i++){
            const t = i / 16, bx = cx - 100 + t * 160, by = cy + 100 - t * 160;
            leaf(bx, by, 90 + r() * 30, 9 + r() * 3, -0.8 + (i % 2 ? 1 : -1) * (0.5 + r() * 0.5), 150 + r() * 90);
        }
    });
    cell(6, (cx, cy)=>{
        x.fillStyle = grey(190);
        x.beginPath();
        x.moveTo(cx, cy + 126);
        x.bezierCurveTo(cx - 118, cy + 60, cx - 118, cy - 70, cx, cy - 126);
        x.bezierCurveTo(cx + 118, cy - 70, cx + 118, cy + 60, cx, cy + 126);
        x.fill();
        x.strokeStyle = grey(235);
        x.lineWidth = 4;
        x.beginPath();
        x.moveTo(cx, cy + 126);
        x.lineTo(cx, cy - 126);
        x.stroke();
        x.strokeStyle = grey(160);
        x.lineWidth = 1.2;
        for(let i = 0; i < 26; i++){
            const yy = cy + 110 - i * 9;
            for (const sd of [
                -1,
                1
            ]){
                x.beginPath();
                x.moveTo(cx, yy);
                x.lineTo(cx + sd * 110, yy - 34);
                x.stroke();
            }
        }
        x.globalCompositeOperation = 'destination-out';
        for(let i = 0; i < 7; i++){
            const yy = cy + 90 - i * 28 - r() * 10, sd = r() < 0.5 ? -1 : 1;
            x.beginPath();
            x.moveTo(cx + sd * 120, yy - 30);
            x.lineTo(cx + sd * (20 + r() * 30), yy - 4);
            x.lineTo(cx + sd * 120, yy - 26);
            x.fill();
        }
        x.globalCompositeOperation = 'source-over';
    });
    cell(7, (cx, cy)=>{
        for(let i = 0; i < 14; i++){
            const a = r() * Math.PI * 2, d = r() * 80, px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d, len = 34 + r() * 26, wd = 10 + r() * 6;
            x.save();
            x.translate(px, py);
            x.rotate(a + (r() - 0.5));
            x.fillStyle = grey(200 + r() * 55);
            x.beginPath();
            x.moveTo(0, 0);
            x.lineTo(len * 0.4, -wd);
            x.lineTo(len, 0);
            x.lineTo(len * 0.4, wd);
            x.closePath();
            x.fill();
            x.strokeStyle = 'rgb(255,255,255)';
            x.lineWidth = 1.5;
            x.beginPath();
            x.moveTo(0, 0);
            x.lineTo(len, 0);
            x.moveTo(len * 0.4, -wd);
            x.lineTo(len * 0.4, wd);
            x.stroke();
            x.restore();
        }
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
}

export { leafAtlas };
