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
                    body { margin: 0; overflow: hidden; background-color: #f0f0f0; }
                    canvas { display: block; }
                    #status { 
                        position: absolute; top: 10px; left: 10px; 
                        padding: 5px 10px; background: rgba(255, 255, 255, 0.9); 
                        color: #333; font-family: sans-serif; border: 1px solid #999;
                        border-radius: 4px; pointer-events: none; font-size: 12px; font-weight: bold;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                    }
                </style>
            </head>
            <body>
                <div id="status">Logisim Viewer: Final Replica</div>
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

                    // --- YARDIMCI: Pin genişliğine göre '000..' stringi üret ---
                    function getPlaceholderValue(width) {
                        if (!width || width === 1) return "0";
                        if (width === 8) return "00000000";
                        return "0".repeat(width);
                    }

                    function draw() {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        
                        // 1. KATMAN: KABLOLAR
                        ctx.strokeStyle = COLORS.wire;
                        ctx.lineWidth = 2; 
                        ctx.lineCap = 'round'; // Yuvarlak uçlar

                        data.wires.forEach(wire => {
                            if (!wire) return;
                            const f = parseLoc(wire['@_from']);
                            const t = parseLoc(wire['@_to']);
                            ctx.beginPath();
                            ctx.moveTo(f.x, f.y);
                            ctx.lineTo(t.x, t.y);
                            ctx.stroke();
                            
                            // Bağlantı noktaları
                            ctx.fillStyle = COLORS.wire;
                            ctx.beginPath(); ctx.arc(f.x, f.y, 3, 0, Math.PI*2); ctx.fill();
                            ctx.beginPath(); ctx.arc(t.x, t.y, 3, 0, Math.PI*2); ctx.fill();
                        });

                        // 2. KATMAN: BİLEŞENLER
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';

                        data.comps.forEach(comp => {
                            if (!comp || !comp['@_loc']) return;
                            const loc = parseLoc(comp['@_loc']);
                            const name = comp['@_name'];
                            
                            // Özellikleri Çek
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
                            
                            // Yönlendirme (Hex Display hariç)
                            if (name !== 'Hex Digit Display') { 
                                ctx.rotate(getRotation(facing));
                            }

                            // --- ÇİZİMLER ---

                            if (name === 'Pin') {
                                const isOutput = comp.a && Array.isArray(comp.a) && comp.a.some(x => x['@_name'] === 'output' && x['@_val'] === 'true');
                                ctx.fillStyle = '#ffffff';
                                ctx.strokeStyle = '#000000';
                                ctx.lineWidth = 1;

                                if (isOutput) {
                                    // Çıkış Pini (Yuvarlak/Kare karışımı Logisim stili)
                                    // Çıkışlar genelde sabit durur, yuvarlak çizelim
                                    ctx.beginPath();
                                    ctx.arc(0, 0, 10, 0, Math.PI*2);
                                    ctx.fill(); ctx.stroke();
                                    // Çıktı değerini görelim
                                    if(width > 1) {
                                        ctx.fillStyle = '#000';
                                        ctx.font = '10px monospace';
                                        ctx.fillText("x".repeat(width > 4 ? 4 : width), 0, 0); 
                                    }
                                } else {
                                    // GİRİŞ PİNİ (Input)
                                    // Logisim'de giriş pinleri, kablo bağlantı noktasından geriye doğru uzayan dikdörtgenlerdir.
                                    // Genişliğe göre kutuyu uzat
                                    const boxWidth = (width * 7) + 10; 
                                    const boxHeight = 20;
                                    
                                    ctx.fillRect(-boxWidth, -10, boxWidth, boxHeight);
                                    ctx.strokeRect(-boxWidth, -10, boxWidth, boxHeight);
                                    
                                    // İçine Değer Yaz (00000000)
                                    ctx.fillStyle = '#000000';
                                    ctx.font = '12px monospace';
                                    ctx.textAlign = 'right'; // Sağa yasla (kabloya yakın)
                                    const displayVal = val || getPlaceholderValue(width);
                                    ctx.fillText(displayVal, -5, 1);
                                }
                                
                                // Etiket (Label) - Dönme etkilenmesin diye restore edip çiziyoruz
                                if(label) {
                                    ctx.restore(); ctx.save(); ctx.translate(loc.x, loc.y);
                                    ctx.fillStyle = '#000';
                                    ctx.font = 'bold 12px sans-serif';
                                    ctx.textAlign = 'center';
                                    ctx.fillText(label, -20, -15);
                                }
                            }
                            else if (name === 'Multiplexer') {
                                // MUX: Yamuk
                                // Logisim MUX: Çıkış ucu (0,0)'dır. Gövde geridedir.
                                ctx.beginPath();
                                ctx.fillStyle = '#ffffff'; 
                                ctx.strokeStyle = '#000000';
                                ctx.lineWidth = 1;
                                
                                // Yamuk Koordinatları (Çıkışa göre)
                                const h = 40 + (width > 1 ? 10 : 0); // Biraz daha uzun
                                ctx.moveTo(0, 0);       // Çıkış ucu
                                ctx.lineTo(-10, -10);   // Ön üst köşe
                                ctx.lineTo(-40, -h/2);  // Arka üst köşe
                                ctx.lineTo(-40, h/2);   // Arka alt köşe
                                ctx.lineTo(-10, 10);    // Ön alt köşe
                                ctx.closePath();
                                ctx.fill(); ctx.stroke();
                                
                                ctx.fillStyle = '#666';
                                ctx.font = '10px sans-serif';
                                ctx.textAlign = 'center';
                                ctx.fillText("MUX", -25, 0);
                            }
                            else if (name === 'Splitter') {
                                // Splitter: Kalın çizgiler
                                ctx.strokeStyle = '#000';
                                ctx.lineWidth = 3;
                                ctx.lineCap = 'butt';
                                ctx.beginPath();
                                ctx.moveTo(0, 0); // Kök
                                ctx.lineTo(-10, 0); // Gövde
                                // Dallanma
                                ctx.lineTo(-20, -10); // Üst dal
                                ctx.moveTo(-10, 0);
                                ctx.lineTo(-20, 10);  // Alt dal
                                // İhtiyaç olursa daha fazla dal eklenebilir ama genelde 2'li görünür
                                ctx.stroke();
                            }
                            else if (name === 'Constant') {
                                // Sabit Değer Kutusu
                                ctx.fillStyle = '#ffffff';
                                ctx.strokeStyle = '#000000';
                                ctx.lineWidth = 1;
                                ctx.fillRect(-15, -10, 30, 20);
                                ctx.strokeRect(-15, -10, 30, 20);
                                
                                ctx.fillStyle = '#000000';
                                ctx.font = '11px monospace';
                                ctx.textAlign = 'center';
                                // 0x prefixini atıp sade gösterelim
                                const displayVal = val.startsWith("0x") ? val : "0x" + val;
                                ctx.fillText(displayVal, 0, 1);
                            }
                            else if (name === 'Hex Digit Display') {
                                // Ekran Çerçevesi
                                ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 1;
                                ctx.fillRect(-12, -20, 24, 40); ctx.strokeRect(-12, -20, 24, 40);
                                
                                // Segmentler (8 Rakamı)
                                ctx.fillStyle = '#ddd'; // Sönük hali
                                ctx.fillRect(-8, -16, 16, 4); // Top
                                ctx.fillRect(-8, -2, 16, 4);  // Mid
                                ctx.fillRect(-8, 12, 16, 4);  // Bot
                                ctx.fillRect(-10, -14, 4, 14); // TL
                                ctx.fillRect(6, -14, 4, 14);   // TR
                                ctx.fillRect(-10, 0, 4, 14);   // BL
                                ctx.fillRect(6, 0, 4, 14);     // BR

                                // Eğer aktifse kırmızı yak (Simülasyon yok ama görsel olsun)
                                ctx.fillStyle = '#ff0000';
                                ctx.fillRect(-8, -2, 16, 4); // Orta çizgi kırmızı (Örnek)
                            }
                            else if (name.includes('Gate')) {
                                // Kapı Çizimleri (Önceki kodun aynısı, scale edilmiş)
                                ctx.beginPath(); ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 2;
                                if (name.includes('NOT')) {
                                    ctx.moveTo(0, 0); ctx.lineTo(-20, -10); ctx.lineTo(-20, 10); ctx.closePath();
                                    ctx.fill(); ctx.stroke();
                                    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fillStyle='#ffffff'; ctx.fill(); ctx.stroke();
                                }
                                else if (name.includes('AND') && !name.includes('NAND')) {
                                    ctx.beginPath(); ctx.moveTo(-50, -25); ctx.lineTo(-25, -25); 
                                    ctx.arc(-25, 0, 25, -Math.PI/2, Math.PI/2); ctx.lineTo(-50, 25); ctx.closePath();
                                    ctx.fill(); ctx.stroke();
                                }
                                else if (name.includes('OR') || name.includes('XOR')) {
                                    ctx.beginPath(); ctx.moveTo(-50, -25); ctx.quadraticCurveTo(-25, -25, 0, 0);
                                    ctx.quadraticCurveTo(-25, 25, -50, 25); ctx.quadraticCurveTo(-40, 0, -50, -25);
                                    ctx.fill(); ctx.stroke();
                                    if(name.includes('XOR')) {
                                        ctx.beginPath(); ctx.moveTo(-56, -25); ctx.quadraticCurveTo(-46, 0, -56, 25); ctx.stroke();
                                    }
                                }
                            }
                            else if (name === 'LED') {
                                ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2);
                                ctx.fillStyle = '#ff0000'; ctx.fill(); ctx.stroke();
                                if(label) {
                                    ctx.restore(); ctx.save(); ctx.translate(loc.x, loc.y);
                                    ctx.fillStyle='#000'; ctx.textAlign='left';
                                    ctx.fillText(label, 15, 0);
                                }
                            }
                            else if (name === 'Adder' || name === 'Subtractor') {
                                ctx.fillStyle = '#ffffff'; ctx.fillRect(-20, -20, 40, 40); ctx.strokeRect(-20, -20, 40, 40);
                                ctx.fillStyle = '#000'; ctx.font = '24px sans-serif'; 
                                ctx.fillText(name === 'Adder' ? '+' : '-', 0, 2);
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