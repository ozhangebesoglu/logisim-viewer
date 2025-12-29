import * as vscode from 'vscode';
import { XMLParser } from 'fast-xml-parser';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(
            'logisim-viewer.preview',
            new LogisimEditorProvider()
        )
    );
}

class LogisimEditorProvider implements vscode.CustomTextEditorProvider {

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
        };

        this.updateWebview(document, webviewPanel);

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                this.updateWebview(document, webviewPanel);
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });
    }

    private updateWebview(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel) {
        const text = document.getText();
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

        try {
            let jsonObj = parser.parse(text);
            webviewPanel.webview.html = this.getHtmlForWebview(jsonObj);
        } catch (error) {
            webviewPanel.webview.html = `<h1>Hata: XML Parse edilemedi</h1>`;
        }
    }


    private getHtmlForWebview(data: any): string {
        const circuit = data.project.circuit;
        const wires = circuit.wire ? (Array.isArray(circuit.wire) ? circuit.wire : [circuit.wire]) : [];
        const comps = circuit.comp ? (Array.isArray(circuit.comp) ? circuit.comp : [circuit.comp]) : [];
        const safeData = JSON.stringify({ wires, comps });

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { margin: 0; overflow: hidden; background-color: #f0f0f0; font-family: sans-serif; }
                    canvas { display: block; }
                    
                    /* Toolbar Tasarımı - EN ÜSTTE */
                    #toolbar {
                        position: absolute; top: 10px; left: 10px;
                        display: flex; gap: 10px;
                        background: rgba(255, 255, 255, 0.95);
                        padding: 10px; border-radius: 8px;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                        border: 1px solid #ccc;
                        z-index: 9999; /* Kesinlikle en üstte */
                    }
                    .btn {
                        cursor: pointer; padding: 8px 12px;
                        border: 1px solid #ccc; border-radius: 4px;
                        background: #fff; color: #333;
                        font-size: 13px; font-weight: 600;
                        transition: all 0.2s; display: flex; align-items: center; gap: 6px;
                    }
                    .btn:hover { background: #eee; transform: translateY(-1px); }
                    .btn:active { transform: translateY(1px); }
                    
                    /* Yapay Zeka Butonu Rengi (Mor) */
                    .btn-ai { 
                        border-color: #7c3aed; color: #7c3aed; background: #f5f3ff;
                    }
                    .btn-ai:hover { background: #ede9fe; }
                </style>
            </head>
            <body>
                <div id="toolbar">
                    <button class="btn" onclick="copyImage()">📷 Görseli Kopyala</button>
                    <button class="btn btn-ai" onclick="copyLogic()">🤖 AI İçin Mantığı Kopyala</button>
                </div>
                
                <canvas id="circuitCanvas"></canvas>

                <script>
                    const data = ${safeData};
                    const canvas = document.getElementById('circuitCanvas');
                    const ctx = canvas.getContext('2d');

                    const COLORS = {
                        wire: '#000000',
                        gateFill: '#ffffff',
                        gateStroke: '#000000',
                        pinText: '#000000',
                        select: '#aaaaaa'
                    };

                    function resize() {
                        canvas.width = window.innerWidth;
                        canvas.height = window.innerHeight;
                        draw();
                    }
                    window.addEventListener('resize', resize);

                    function parseLoc(locStr) {
                        if(!locStr) return {x:0, y:0};
                        const parts = locStr.replace(/[()]/g, '').split(',');
                        return { x: parseInt(parts[0]), y: parseInt(parts[1]) };
                    }

                    function getRotation(facing) {
                        if (!facing) return 0;
                        if (facing === 'north') return -Math.PI / 2;
                        if (facing === 'south') return Math.PI / 2;
                        if (facing === 'west') return Math.PI;
                        return 0; 
                    }

                    function getPlaceholderValue(width) {
                        if (!width || width === 1) return "0";
                        if (width === 8) return "00000000";
                        return "0".repeat(width);
                    }

                    // --- KOPYALAMA İŞLEMLERİ ---

                    function copyImage() {
                        canvas.toBlob(blob => {
                            const item = new ClipboardItem({ "image/png": blob });
                            navigator.clipboard.write([item]).then(() => {
                                alert("Resim panoya kopyalandı! ChatGPT'ye yapıştırabilirsin.");
                            }).catch(err => alert("Kopyalama hatası: " + err));
                        });
                    }

                    function copyLogic() {
                        const aiData = {
                            summary: "Logisim Circuit Logic Analysis",
                            components: data.comps.map(c => {
                                let info = { type: c['@_name'], location: c['@_loc'] };
                                if(c.a) {
                                    const attrs = Array.isArray(c.a) ? c.a : [c.a];
                                    attrs.forEach(attr => {
                                        if(['label', 'facing', 'width', 'output', 'value'].includes(attr['@_name'])) {
                                            info[attr['@_name']] = attr['@_val'];
                                        }
                                    });
                                }
                                return info;
                            }),
                            connections: data.wires.map(w => ({ from: w['@_from'], to: w['@_to'] }))
                        };
                        const text = JSON.stringify(aiData, null, 2);
                        navigator.clipboard.writeText(text).then(() => {
                             alert("Devre mantığı (JSON) kopyalandı! Bunu AI'ya yapıştırıp analiz iste.");
                        });
                    }

                    // --- ÇİZİM MOTORU ---

                    function draw() {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        
                        // KABLOLAR
                        ctx.strokeStyle = COLORS.wire;
                        ctx.lineWidth = 2; 
                        ctx.lineCap = 'round';

                        data.wires.forEach(wire => {
                            if (!wire) return;
                            const f = parseLoc(wire['@_from']);
                            const t = parseLoc(wire['@_to']);
                            ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(t.x, t.y); ctx.stroke();
                            ctx.fillStyle = COLORS.wire;
                            ctx.beginPath(); ctx.arc(f.x, f.y, 3, 0, Math.PI*2); ctx.fill();
                            ctx.beginPath(); ctx.arc(t.x, t.y, 3, 0, Math.PI*2); ctx.fill();
                        });

                        // BİLEŞENLER
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';

                        data.comps.forEach(comp => {
                            if (!comp || !comp['@_loc']) return;
                            const loc = parseLoc(comp['@_loc']);
                            const name = comp['@_name'];
                            
                            let label = "";
                            let facing = "east";
                            let width = 1;
                            let val = ""; 
                            
                            if(comp.a) {
                                const attrs = Array.isArray(comp.a) ? comp.a : [comp.a];
                                const labelAttr = attrs.find(a => a['@_name'] === 'label');
                                const facingAttr = attrs.find(a => a['@_name'] === 'facing');
                                const widthAttr = attrs.find(a => a['@_name'] === 'width');
                                const valAttr = attrs.find(a => a['@_name'] === 'value');
                                if(labelAttr) label = labelAttr['@_val'];
                                if(facingAttr) facing = facingAttr['@_val'];
                                if(widthAttr) width = parseInt(widthAttr['@_val']);
                                if(valAttr) val = valAttr['@_val'];
                            }

                            ctx.save();
                            ctx.translate(loc.x, loc.y);
                            
                            if (name !== 'Hex Digit Display') { 
                                ctx.rotate(getRotation(facing));
                            }

                            if (name === 'Pin') {
                                const isOutput = comp.a && Array.isArray(comp.a) && comp.a.some(x => x['@_name'] === 'output' && x['@_val'] === 'true');
                                ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 1;

                                if (isOutput) {
                                    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill(); ctx.stroke();
                                    if(width > 1) { ctx.fillStyle = '#000'; ctx.font = '10px monospace'; ctx.fillText("x".repeat(width>4?4:width), 0, 0); }
                                } else {
                                    const boxWidth = (width * 7) + 10; 
                                    ctx.fillRect(-boxWidth, -10, boxWidth, 20); ctx.strokeRect(-boxWidth, -10, boxWidth, 20);
                                    ctx.fillStyle = '#000000'; ctx.font = '12px monospace'; ctx.textAlign = 'right';
                                    ctx.fillText(val || getPlaceholderValue(width), -5, 1);
                                }
                                if(label) {
                                    ctx.restore(); ctx.save(); ctx.translate(loc.x, loc.y);
                                    ctx.fillStyle = '#000'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
                                    ctx.fillText(label, -20, -15);
                                }
                            }
                            else if (name === 'Multiplexer') {
                                ctx.beginPath(); ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 1;
                                const h = 40 + (width > 1 ? 10 : 0);
                                ctx.moveTo(0, 0); ctx.lineTo(-10, -10); ctx.lineTo(-40, -h/2); 
                                ctx.lineTo(-40, h/2); ctx.lineTo(-10, 10); ctx.closePath();
                                ctx.fill(); ctx.stroke();
                                ctx.fillStyle = '#666'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText("MUX", -25, 0);
                            }
                            else if (name === 'Splitter') {
                                ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.lineCap = 'butt';
                                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-10, 0); 
                                ctx.lineTo(-20, -10); ctx.moveTo(-10, 0); ctx.lineTo(-20, 10); ctx.stroke();
                            }
                            else if (name === 'Constant') {
                                ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 1;
                                ctx.fillRect(-15, -10, 30, 20); ctx.strokeRect(-15, -10, 30, 20);
                                ctx.fillStyle = '#000000'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
                                ctx.fillText((val.startsWith("0x")?val:"0x"+val), 0, 1);
                            }
                            else if (name === 'Hex Digit Display') {
                                ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 1;
                                ctx.fillRect(-12, -20, 24, 40); ctx.strokeRect(-12, -20, 24, 40);
                                ctx.fillStyle = '#ddd'; 
                                ctx.fillRect(-8, -16, 16, 4); ctx.fillRect(-8, -2, 16, 4); ctx.fillRect(-8, 12, 16, 4);
                                ctx.fillRect(-10, -14, 4, 14); ctx.fillRect(6, -14, 4, 14); ctx.fillRect(-10, 0, 4, 14); ctx.fillRect(6, 0, 4, 14);
                                ctx.fillStyle = '#ff0000'; ctx.fillRect(-8, -2, 16, 4); 
                            }
                            else if (name.includes('Gate')) {
                                ctx.beginPath(); ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 2;
                                if (name.includes('NOT')) {
                                    ctx.moveTo(0, 0); ctx.lineTo(-20, -10); ctx.lineTo(-20, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
                                    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fillStyle='#ffffff'; ctx.fill(); ctx.stroke();
                                }
                                else if (name.includes('AND') && !name.includes('NAND')) {
                                    ctx.beginPath(); ctx.moveTo(-50, -25); ctx.lineTo(-25, -25); 
                                    ctx.arc(-25, 0, 25, -Math.PI/2, Math.PI/2); ctx.lineTo(-50, 25); ctx.closePath(); ctx.fill(); ctx.stroke();
                                }
                                else if (name.includes('OR') || name.includes('XOR')) {
                                    ctx.beginPath(); ctx.moveTo(-50, -25); ctx.quadraticCurveTo(-25, -25, 0, 0);
                                    ctx.quadraticCurveTo(-25, 25, -50, 25); ctx.quadraticCurveTo(-40, 0, -50, -25); ctx.fill(); ctx.stroke();
                                    if(name.includes('XOR')) { ctx.beginPath(); ctx.moveTo(-56, -25); ctx.quadraticCurveTo(-46, 0, -56, 25); ctx.stroke(); }
                                }
                            }
                            else if (name === 'LED') {
                                ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fillStyle = '#ff0000'; ctx.fill(); ctx.stroke();
                                if(label) { ctx.restore(); ctx.save(); ctx.translate(loc.x, loc.y); ctx.fillStyle='#000'; ctx.textAlign='left'; ctx.fillText(label, 15, 0); }
                            }
                            else if (name === 'Adder' || name === 'Subtractor') {
                                ctx.fillStyle = '#ffffff'; ctx.fillRect(-20, -20, 40, 40); ctx.strokeRect(-20, -20, 40, 40);
                                ctx.fillStyle = '#000'; ctx.font = '24px sans-serif'; ctx.fillText(name === 'Adder' ? '+' : '-', 0, 2);
                            }
                            else if (name === 'Comparator') {
                                ctx.fillStyle = '#ffffff'; ctx.fillRect(-20, -20, 40, 40); ctx.strokeRect(-20, -20, 40, 40);
                                ctx.fillStyle = '#000'; ctx.font = '14px sans-serif'; ctx.fillText('Comp', 0, 0);
                            }

                            ctx.restore();
                        });
                    }
                    
                    resize();
                </script>
            </body>
            </html>
        `;
    }
}