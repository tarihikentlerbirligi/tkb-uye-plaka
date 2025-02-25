// DOM elementlerini seçme
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const backgroundColorInput = document.getElementById('backgroundColor');
const textInput = document.getElementById('text');
const exportButton = document.getElementById('exportButton');

// Logo kontrolü
const logoUpload = document.getElementById('logoUpload');
const logoSize = document.getElementById('logoSize');
const logoSizeValue = document.getElementById('logoSizeValue');
const smoothEdges = document.getElementById('smoothEdges');

// Yazı stil kontrolleri
const fontSize = document.getElementById('fontSize');
const fontSizeValue = document.getElementById('fontSizeValue');
const fontColor = document.getElementById('fontColor');
const fontBold = document.getElementById('fontBold');
const fontItalic = document.getElementById('fontItalic');
const fontFamily = document.getElementById('fontFamily');

// TKB logosu için görsel (placeholder olarak)
const logo = new Image();
logo.src = "/api/placeholder/400/400";
let customLogo = null;

// Logo yükleme işlemi
logoUpload.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            customLogo = new Image();
            customLogo.onload = updateCanvas;
            customLogo.src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
});

// Logo boyutu değişikliğini gösterme
logoSize.addEventListener('input', function() {
    logoSizeValue.textContent = logoSize.value + '%';
    updateCanvas();
});

// Kenar düzleştirme seçeneği
smoothEdges.addEventListener('change', updateCanvas);

// Yazı stili değişiklikleri
fontSize.addEventListener('input', function() {
    fontSizeValue.textContent = fontSize.value + 'px';
    updateCanvas();
});

fontBold.addEventListener('change', updateCanvas);
fontItalic.addEventListener('change', updateCanvas);
fontFamily.addEventListener('change', updateCanvas);
fontColor.addEventListener('input', updateCanvas);

// Event listener'lar
backgroundColorInput.addEventListener('input', updateCanvas);
textInput.addEventListener('input', updateCanvas);

// Canvas'ı güncelleyen fonksiyon
function updateCanvas() {
    const backgroundColor = backgroundColorInput.value;
    const text = textInput.value;
    
    // Canvas'ı temizleme ve arka plan rengi
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Özel logo veya varsayılan logo merkeze yerleştirme
    const logoToUse = customLogo || logo;
    if (logoToUse.complete) {
        // Kullanıcı tarafından ayarlanan boyut oranı
        const sizePercent = parseInt(logoSize.value) / 100;
        
        // Gerçek logo verilerini işlemek için geçici canvas kullan
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // Oranı koruyarak boyutlandırma
        let logoWidth, logoHeight;
        const ratio = logoToUse.width / logoToUse.height;
        
        if (ratio > 1) {
            // Yatay logo
            logoWidth = canvas.width * 0.8 * sizePercent;
            logoHeight = logoWidth / ratio;
        } else {
            // Dikey veya kare logo
            logoHeight = canvas.height * 0.4 * sizePercent;
            logoWidth = logoHeight * ratio;
        }
        
        // Kenar temizleme algoritmasını iyileştirme
        if (smoothEdges.checked) {
            // PNG logolardaki tüm sınır piksellerini agresif şekilde temizleyen gelişmiş algoritma
            
            // Orijinal logoyu geçici canvas'a çiz
            tempCanvas.width = logoToUse.width;
            tempCanvas.height = logoToUse.height;
            tempCtx.drawImage(logoToUse, 0, 0);

            // Orijinal görüntüden piksel verilerini al
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;
            
            const width = tempCanvas.width;
            const height = tempCanvas.height;
            
            // Tüm piksellerdeki edge'leri bulmak için bir maske oluştur
            const edgeMask = new Array(width * height).fill(false);
            
            // İlk aşama: Kenar pikselleri için genişletilmiş tespit
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;
                    const alpha = data[idx + 3];
                    
                    // Tamamen şeffaf pikselleri atla
                    if (alpha === 0) continue;
                    
                    // Piksel rengi
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    
                    // Dış kenar kontrolü - logoların en dış kenarlarını tespit etmek için ek kontroller
                    const isEdgeOfImage = x < 10 || x > width - 10 || y < 10 || y > height - 10;
                    
                    // Herhangi bir şeffaf komşusu var mı bak - daha geniş bir alanda tara
                    let hasTransparentNeighbor = false;
                    const range = 10; // Çok daha geniş arama
                    
                    for (let ny = Math.max(0, y - range); ny <= Math.min(height - 1, y + range); ny++) {
                        for (let nx = Math.max(0, x - range); nx <= Math.min(width - 1, x + range); nx++) {
                            // Kendisini kontrol etme
                            if (nx === x && ny === y) continue;
                            
                            const nidx = (ny * width + nx) * 4;
                            if (data[nidx + 3] === 0) {
                                hasTransparentNeighbor = true;
                                break;
                            }
                        }
                        if (hasTransparentNeighbor) break;
                    }
                    
                    // Eğer şeffaf komşusu varsa veya görüntünün dış kenarına yakınsa
                    if (hasTransparentNeighbor || isEdgeOfImage) {
                        // Açık renkli veya düşük alpha değeri varsa, kenar pikseli olarak işaretle
                        if ((r > 70 || g > 70 || b > 70) || alpha < 250) {
                            edgeMask[y * width + x] = true;
                        }
                        
                        // Beyaza yakın pikselleri tespit et (eşiği düşür)
                        if (r > 120 && g > 120 && b > 120) {
                            edgeMask[y * width + x] = true;
                        }
                        
                        // Gri tonlu pikselleri daha geniş bir aralıkta tespit et
                        if (Math.abs(r - g) < 25 && Math.abs(r - b) < 25 && Math.abs(g - b) < 25 && r > 50) {
                            edgeMask[y * width + x] = true;
                        }
                        
                        // Dış kenarlardaki pikseller için daha agresif temizleme
                        if (isEdgeOfImage && alpha < 255) {
                            edgeMask[y * width + x] = true;
                        }
                    }
                }
            }
            
            // İkinci aşama: Tüm kenar piksellerini şeffaf yap
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (edgeMask[y * width + x]) {
                        const idx = (y * width + x) * 4;
                        // Bu bir kenar pikseli, tamamen şeffaf yap
                        data[idx + 3] = 0;
                    }
                }
            }
            
            // Üçüncü aşama: Yeni kenar piksellerinin oluşup oluşmadığını kontrol et ve onları da temizle
            // Birkaç iterasyon yaparak daha agresif temizleme
            for (let iteration = 0; iteration < 3; iteration++) {
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const idx = (y * width + x) * 4;
                        const alpha = data[idx + 3];
                        
                        // Tamamen şeffaf pikselleri atla
                        if (alpha === 0) continue;
                        
                        // Komşuların alpha değerlerinin ortalamasını hesapla
                        let transparentNeighbors = 0;
                        let totalNeighbors = 0;
                        
                        // Daha geniş bir komşuluk alanı tara
                        const neighborhood = 3;
                        for (let ny = Math.max(0, y - neighborhood); ny <= Math.min(height - 1, y + neighborhood); ny++) {
                            for (let nx = Math.max(0, x - neighborhood); nx <= Math.min(width - 1, x + neighborhood); nx++) {
                                if (nx === x && ny === y) continue;
                                
                                const nidx = (ny * width + nx) * 4;
                                totalNeighbors++;
                                
                                if (data[nidx + 3] === 0) {
                                    transparentNeighbors++;
                                }
                            }
                        }
                        
                        // Şeffaf komşu oranı
                        const transparentRatio = transparentNeighbors / totalNeighbors;
                        
                        // Dış kenar kontrolü
                        const isEdgeOfImage = x < 15 || x > width - 15 || y < 15 || y > height - 15;
                        
                        // Piksel rengi
                        const r = data[idx];
                        const g = data[idx + 1];
                        const b = data[idx + 2];
                        
                        // Eğer komşularının belirli bir kısmı şeffafsa veya dış kenara yakınsa
                        if (transparentRatio > 0.2 || isEdgeOfImage) {
                            // Açık renkli (özellikle beyaza veya griye yakın) pikselleri temizle
                            if ((r > 100 && g > 100 && b > 100) || alpha < 240) {
                                data[idx + 3] = 0;
                            }
                            
                            // Dış kenarlardaki tüm hafif yarı-şeffaf pikselleri temizle
                            if (isEdgeOfImage && alpha < 250) {
                                data[idx + 3] = 0;
                            }
                        }
                    }
                }
            }
            
            // Dördüncü aşama: Logo kenarlarında kalan izole noktaları temizle
            // Tüm pikseller için izolasyon testi
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;
                    
                    // Şeffaf pikselleri atla
                    if (data[idx + 3] === 0) continue;
                    
                    // Geniş bir alan içinde, bu pikselin izole olup olmadığını kontrol et
                    let opaqueNeighbors = 0;
                    let totalChecked = 0;
                    
                    const isolationRange = 5;
                    for (let ny = Math.max(0, y - isolationRange); ny <= Math.min(height - 1, y + isolationRange); ny++) {
                        for (let nx = Math.max(0, x - isolationRange); nx <= Math.min(width - 1, x + isolationRange); nx++) {
                            // Kendisini saymıyoruz
                            if (nx === x && ny === y) continue;
                            
                            // Fazla uzak pikselleri kontrol etme (dairesel alan)
                            const distance = Math.sqrt(Math.pow(nx - x, 2) + Math.pow(ny - y, 2));
                            if (distance > isolationRange) continue;
                            
                            const nidx = (ny * width + nx) * 4;
                            if (data[nidx + 3] > 0) {
                                opaqueNeighbors++;
                            }
                            totalChecked++;
                        }
                    }
                    
                    // Eğer çok az sayıda opak komşu varsa, bu izole bir pikseldir
                    if (opaqueNeighbors / totalChecked < 0.2) {
                        data[idx + 3] = 0; // İzole pikseli temizle
                    }
                }
            }
            
            // Değiştirilmiş görüntüyü geri yaz
            tempCtx.putImageData(imageData, 0, 0);
            
            // Şimdi final canvas'ı hazırla
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = logoWidth;
            finalCanvas.height = logoHeight;
            const finalCtx = finalCanvas.getContext('2d');
            
            // Ölçeklendirme yaparken kenarları yumuşatma (anti-aliasing) kullanma
            finalCtx.imageSmoothingEnabled = false;
            
            // İşlenmiş logoyu son boyuta getir
            finalCtx.drawImage(tempCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
            
            // Merkeze yerleştirme
            const logoX = (canvas.width - logoWidth) / 2;
            const logoY = (canvas.height - logoHeight) / 3;
            
            // İşlenmiş logoyu ana canvas'a çiz
            ctx.drawImage(finalCanvas, logoX, logoY);
        } else {
            // Normal çizim (kenar yumuşatma olmadan)
            const logoX = (canvas.width - logoWidth) / 2;
            const logoY = (canvas.height - logoHeight) / 3;
            ctx.drawImage(logoToUse, logoX, logoY, logoWidth, logoHeight);
        }
    }
    
    // Text çizimi
    ctx.fillStyle = fontColor.value; // Yazı rengini kullanıcının seçtiği renge ayarla
    
    // Yazı stili ayarları
    const fontSizeValue = (fontSize.value * 2) + 'px'; // Canvas boyutuna göre font boyutunu 2 kat büyüttüm
    const fontBoldValue = fontBold.checked ? 'bold ' : '';
    const fontItalicValue = fontItalic.checked ? 'italic ' : '';
    const fontFamilyValue = fontFamily.value;
    
    ctx.font = `${fontBoldValue}${fontItalicValue}${fontSizeValue} ${fontFamilyValue}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Çoklu satır text
    const lines = text.split('\n');
    let y = canvas.height * 0.65; // Metnin başlangıç Y pozisyonu
    
    lines.forEach(line => {
        ctx.fillText(line, canvas.width / 2, y);
        y += parseInt(fontSize.value) * 2.5; // Satır aralığı, font boyutuna bağlı olarak ayarlanır
    });
}

// Logo yüklendiğinde canvas'ı güncelle
logo.onload = updateCanvas;

// Sayfa yüklendiğinde canvas'ı ilk kez çiz
window.addEventListener('load', updateCanvas);

// PNG olarak indirme fonksiyonu
exportButton.addEventListener('click', function() {
    // Her zaman yüksek kalite için büyük bir canvas oluştur
    const exportCanvas = document.createElement('canvas');
    const exportWidth = 1600;
    const exportHeight = 1600;
    
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;
    const exportCtx = exportCanvas.getContext('2d');
    
    // Arka plan rengini ayarla
    exportCtx.fillStyle = backgroundColorInput.value;
    exportCtx.fillRect(0, 0, exportWidth, exportHeight);
    
    // Logoyu yükle
    const logoToUse = customLogo || logo;
    
    // Logo boyutu oranını hesapla
    const sizePercent = parseInt(logoSize.value) / 100;
    
    // Oranı koruyarak boyutlandırma
    let logoWidth, logoHeight;
    const ratio = logoToUse.width / logoToUse.height;
    
    if (ratio > 1) {
        // Yatay logo
        logoWidth = exportWidth * 0.8 * sizePercent;
        logoHeight = logoWidth / ratio;
    } else {
        // Dikey veya kare logo
        logoHeight = exportHeight * 0.4 * sizePercent;
        logoWidth = logoHeight * ratio;
    }
    
    // Logo işleme
    if (smoothEdges.checked) {
        // PNG logolardaki tüm sınır piksellerini agresif şekilde temizleyen gelişmiş algoritma (export versiyonu)
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = logoToUse.width;
        tempCanvas.height = logoToUse.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Orijinal logoyu geçici canvas'a çiz
        tempCtx.drawImage(logoToUse, 0, 0);
        
        // Orijinal görüntüden piksel verilerini al
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        
        const width = tempCanvas.width;
        const height = tempCanvas.height;
        
        // Tüm piksellerdeki edge'leri bulmak için bir maske oluştur
        const edgeMask = new Array(width * height).fill(false);
        
        // İlk aşama: Kenar pikselleri için genişletilmiş tespit
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const alpha = data[idx + 3];
                
                // Tamamen şeffaf pikselleri atla
                if (alpha === 0) continue;
                
                // Piksel rengi
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                
                // Dış kenar kontrolü - logoların en dış kenarlarını tespit etmek için ek kontroller
                const isEdgeOfImage = x < 10 || x > width - 10 || y < 10 || y > height - 10;
                
                // Herhangi bir şeffaf komşusu var mı bak - daha geniş bir alanda tara
                let hasTransparentNeighbor = false;
                const range = 10; // Çok daha geniş arama
                
                for (let ny = Math.max(0, y - range); ny <= Math.min(height - 1, y + range); ny++) {
                    for (let nx = Math.max(0, x - range); nx <= Math.min(width - 1, x + range); nx++) {
                        // Kendisini kontrol etme
                        if (nx === x && ny === y) continue;
                        
                        const nidx = (ny * width + nx) * 4;
                        if (data[nidx + 3] === 0) {
                            hasTransparentNeighbor = true;
                            break;
                        }
                    }
                    if (hasTransparentNeighbor) break;
                }
                
                // Eğer şeffaf komşusu varsa veya görüntünün dış kenarına yakınsa
                if (hasTransparentNeighbor || isEdgeOfImage) {
                    // Açık renkli veya düşük alpha değeri varsa, kenar pikseli olarak işaretle
                    if ((r > 70 || g > 70 || b > 70) || alpha < 250) {
                        edgeMask[y * width + x] = true;
                    }
                    
                    // Beyaza yakın pikselleri tespit et (eşiği düşür)
                    if (r > 120 && g > 120 && b > 120) {
                        edgeMask[y * width + x] = true;
                    }
                    
                    // Gri tonlu pikselleri daha geniş bir aralıkta tespit et
                    if (Math.abs(r - g) < 25 && Math.abs(r - b) < 25 && Math.abs(g - b) < 25 && r > 50) {
                        edgeMask[y * width + x] = true;
                    }
                    
                    // Dış kenarlardaki pikseller için daha agresif temizleme
                    if (isEdgeOfImage && alpha < 255) {
                        edgeMask[y * width + x] = true;
                    }
                }
            }
        }
        
        // İkinci aşama: Tüm kenar piksellerini şeffaf yap
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (edgeMask[y * width + x]) {
                    const idx = (y * width + x) * 4;
                    // Bu bir kenar pikseli, tamamen şeffaf yap
                    data[idx + 3] = 0;
                }
            }
        }
        
        // Üçüncü aşama: Yeni oluşan sınırları da temizle (birkaç tekrarlama)
        for (let iteration = 0; iteration < 4; iteration++) {
            // Son işlemeden sonra yeni kenarları tespit et
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;
                    const alpha = data[idx + 3];
                    
                    // Tamamen şeffaf pikselleri atla
                    if (alpha === 0) continue;
                    
                    // Şeffaf komşu sayısı
                    let transparentNeighbors = 0;
                    let totalNeighbors = 0;
                    
                    // Daha geniş bir komşuluk alanı tara
                    const neighborhood = 3;
                    for (let ny = Math.max(0, y - neighborhood); ny <= Math.min(height - 1, y + neighborhood); ny++) {
                        for (let nx = Math.max(0, x - neighborhood); nx <= Math.min(width - 1, x + neighborhood); nx++) {
                            if (nx === x && ny === y) continue;
                            
                            const nidx = (ny * width + nx) * 4;
                            totalNeighbors++;
                            
                            if (data[nidx + 3] === 0) {
                                transparentNeighbors++;
                            }
                        }
                    }
                    
                    // Şeffaf komşu oranı
                    const transparentRatio = transparentNeighbors / totalNeighbors;
                    
                    // Dış kenar kontrolü
                    const isEdgeOfImage = x < 15 || x > width - 15 || y < 15 || y > height - 15;
                    
                    // Piksel rengi
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    
                    // Eğer komşularının belirli bir kısmı şeffafsa veya dış kenara yakınsa
                    if (transparentRatio > 0.2 || isEdgeOfImage) {
                        // Açık renkli (özellikle beyaza veya griye yakın) pikselleri temizle
                        if ((r > 100 && g > 100 && b > 100) || alpha < 240) {
                            data[idx + 3] = 0;
                        }
                        
                        // Dış kenarlardaki tüm hafif yarı-şeffaf pikselleri temizle
                        if (isEdgeOfImage && alpha < 250) {
                            data[idx + 3] = 0;
                        }
                    }
                }
            }
        }
        
        // Dördüncü aşama: Logo kenarlarında kalan izole noktaları temizle
        // Tüm pikseller için izolasyon testi
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                // Şeffaf pikselleri atla
                if (data[idx + 3] === 0) continue;
                
                // Geniş bir alan içinde, bu pikselin izole olup olmadığını kontrol et
                let opaqueNeighbors = 0;
                let totalChecked = 0;
                
                const isolationRange = 5;
                for (let ny = Math.max(0, y - isolationRange); ny <= Math.min(height - 1, y + isolationRange); ny++) {
                    for (let nx = Math.max(0, x - isolationRange); nx <= Math.min(width - 1, x + isolationRange); nx++) {
                        // Kendisini saymıyoruz
                        if (nx === x && ny === y) continue;
                        
                        // Fazla uzak pikselleri kontrol etme (dairesel alan)
                        const distance = Math.sqrt(Math.pow(nx - x, 2) + Math.pow(ny - y, 2));
                        if (distance > isolationRange) continue;
                        
                        const nidx = (ny * width + nx) * 4;
                        if (data[nidx + 3] > 0) {
                            opaqueNeighbors++;
                        }
                        totalChecked++;
                    }
                }
                
                // Eğer çok az sayıda opak komşu varsa, bu izole bir pikseldir
                if (opaqueNeighbors / totalChecked < 0.2) {
                    data[idx + 3] = 0; // İzole pikseli temizle
                }
            }
        }
        
        // Değiştirilmiş görüntüyü geri yaz
        tempCtx.putImageData(imageData, 0, 0);
        
        // Şimdi final canvas'ı hazırla
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = logoWidth;
        finalCanvas.height = logoHeight;
        const finalCtx = finalCanvas.getContext('2d');
        
        // Ölçeklendirme yaparken kenarları yumuşatma (anti-aliasing) kullanma
        finalCtx.imageSmoothingEnabled = false;
        
        // İşlenmiş logoyu son boyuta getir
        finalCtx.drawImage(tempCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
        
        const logoX = (exportWidth - logoWidth) / 2;
        const logoY = (exportHeight - logoHeight) / 3;
        
        exportCtx.drawImage(finalCanvas, logoX, logoY);
    } else {
        const logoX = (exportWidth - logoWidth) / 2;
        const logoY = (exportHeight - logoHeight) / 3;
        exportCtx.drawImage(logoToUse, logoX, logoY, logoWidth, logoHeight);
    }
    
    // Text çizimi
    exportCtx.fillStyle = fontColor.value;
    
    // Yazı stili ayarları - export canvas boyutuna uyarlanmış
    const scaleFactor = exportWidth / canvas.width;
    const exportFontSizeValue = (parseInt(fontSize.value) * scaleFactor * 2) + 'px';
    const fontBoldValue = fontBold.checked ? 'bold ' : '';
    const fontItalicValue = fontItalic.checked ? 'italic ' : '';
    const fontFamilyValue = fontFamily.value;
    
    exportCtx.font = `${fontBoldValue}${fontItalicValue}${exportFontSizeValue} ${fontFamilyValue}`;
    exportCtx.textAlign = 'center';
    exportCtx.textBaseline = 'middle';
    
    // Çoklu satır text
    const lines = textInput.value.split('\n');
    let y = exportHeight * 0.65; // Metnin başlangıç Y pozisyonu
    
    lines.forEach(line => {
        exportCtx.fillText(line, exportWidth / 2, y);
        y += parseInt(fontSize.value) * scaleFactor * 2.5; // Satır aralığı, font boyutuyla orantılı
    });
    
    // Yüksek kalitede PNG olarak indir
    const image = exportCanvas.toDataURL('image/png');
    
    const link = document.createElement('a');
    link.href = image;
    
    // Dosya adını belediye adından al
    const fileName = 'tarihi-kentler-birligi-' + 
        textInput.value.split('\n')[0]
            .substring(0, 15)
            .replace(/\s+/g, '-')
            .toLowerCase() + 
        '.png';
        
    link.download = fileName;
    link.click();
});
