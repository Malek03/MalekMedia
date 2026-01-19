// Helper to show/hide elements
function showElement(id) {
    document.getElementById(id).classList.remove('hidden');
}

function hideElement(id) {
    document.getElementById(id).classList.add('hidden');
}

// --- Text Encoding ---
async function processText() {
    const text = document.getElementById('textInput').value;
    if (!text) return alert('Please enter some text.');

    try {
        const response = await fetch('/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });
        const data = await response.json();

        const tbody = document.getElementById('textTableBody');
        tbody.innerHTML = '';

        data.ascii.forEach((val, index) => {
            const row = `<tr>
                <td>${text[index]}</td>
                <td>${val}</td>
                <td>${data.hex[index]}</td>
                <td>${data.binary[index]}</td>
            </tr>`;
            tbody.innerHTML += row;
        });

        showElement('textResult');
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred.');
    }
}

// --- Image Representation ---
async function uploadImage(action, additionalData = {}) {
    const fileInput = document.getElementById('imageInput');
    if (!fileInput.files[0]) return alert('Please select an image.');

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    formData.append('action', action);
    
    for (const key in additionalData) {
        formData.append(key, additionalData[key]);
    }

    try {
        const response = await fetch('/process_image', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (data.error) return alert(data.error);
        
        return data;
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred.');
    }
}

async function decomposeRGB() {
    const data = await uploadImage('decompose');
    if (!data) return;

    const container = document.getElementById('imageContainer');
    container.innerHTML = `
        <div class="rgb-layers" id="rgbLayers">
            <div class="rgb-layer" style="z-index: 3;"><img src="${data.r_url}" alt="Red"></div>
            <div class="rgb-layer" style="z-index: 2;"><img src="${data.g_url}" alt="Green"></div>
            <div class="rgb-layer" style="z-index: 1;"><img src="${data.b_url}" alt="Blue"></div>
        </div>
        <button onclick="animateRGB()" style="margin-top: 1rem;">Animate Layers</button>
    `;
    showElement('imageDisplay');
}

function animateRGB() {
    const layers = document.querySelectorAll('.rgb-layer');
    if (layers.length === 3) {
        layers[0].style.transform = 'translateX(-110%)'; // Red left
        layers[2].style.transform = 'translateX(110%)';  // Blue right
    }
}

async function applySampling() {
    const rows = document.getElementById('sampleRows').value;
    const cols = document.getElementById('sampleCols').value;
    
    const data = await uploadImage('sampling', { rows, cols });
    if (!data) return;

    const container = document.getElementById('imageContainer');
    container.innerHTML = `<div class="image-wrapper"><img src="${data.processed_url}" alt="Sampled Image"></div>`;
    showElement('imageDisplay');
}

async function applyQuantization() {
    const colors = document.getElementById('quantColors').value;
    // Pass current sampling rows/cols to quantization for consistent grid
    const rows = document.getElementById('sampleRows').value;
    const cols = document.getElementById('sampleCols').value;
    
    const data = await uploadImage('quantization', { colors, rows, cols });
    if (!data) return;

    const container = document.getElementById('imageContainer');
    container.innerHTML = `
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
            <div class="image-wrapper">
                <h4>Grid Representation</h4>
                <img src="${data.processed_url}" alt="Quantized Grid">
            </div>
            <div class="image-wrapper">
                <h4>3D Visualization</h4>
                <img src="${data.plot_url}" alt="3D Plot">
            </div>
        </div>
    `;
    showElement('imageDisplay');
}

// Show controls when image is selected
document.getElementById('imageInput')?.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        showElement('imageControls');
    }
});


// --- Video Processing ---
let extractedFrames = [];
let animationInterval = null;

// Video Input Feedback & Preview
document.getElementById('videoInput')?.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        // Update text
        const box = this.parentElement.querySelector('.file-upload-box p');
        if (box) box.textContent = this.files[0].name;
        
        // Preview Video
        const video = document.getElementById('videoPreview');
        video.src = URL.createObjectURL(this.files[0]);
        showElement('videoPreviewContainer');
    }
});

async function processVideo() {
    const fileInput = document.getElementById('videoInput');
    if (!fileInput.files[0]) return alert('Please select a video.');
    
    const numFrames = document.getElementById('numFrames').value;

    const formData = new FormData();
    formData.append('video', fileInput.files[0]);
    formData.append('num_frames', numFrames);

    try {
        const response = await fetch('/process_video', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (data.error) return alert(data.error);

        const metaDiv = document.getElementById('videoMeta');
        metaDiv.innerHTML = `
            <p><strong>Duration:</strong> ${data.metadata.duration}</p>
            <p><strong>FPS:</strong> ${data.metadata.fps}</p>
            <p><strong>Resolution:</strong> ${data.metadata.resolution}</p>
        `;

        const grid = document.getElementById('framesGrid');
        grid.innerHTML = '';
        extractedFrames = data.frames; // Store for animation
        
        data.frames.forEach((url, index) => {
            grid.innerHTML += `
                <div class="card">
                    <img src="${url}" alt="Frame ${index}" style="width: 100%; border-radius: 8px;">
                    <p>Frame ${index + 1}</p>
                </div>
            `;
        });

        showElement('videoResult');
        hideElement('animationDisplay'); // Hide animation if previously shown
        if(animationInterval) clearInterval(animationInterval);
        
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred.');
    }
}

function animateFrames() {
    if (extractedFrames.length === 0) return alert("No frames to animate.");
    
    const display = document.getElementById('animationDisplay');
    const img = document.getElementById('animationImg');
    showElement('animationDisplay');
    
    let i = 0;
    if (animationInterval) clearInterval(animationInterval);
    
    animationInterval = setInterval(() => {
        img.src = extractedFrames[i];
        i = (i + 1) % extractedFrames.length;
    }, 200); // 5 FPS roughly
}

// --- Audio Analysis ---
// Audio Input Feedback & Preview
document.getElementById('audioInput')?.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        // Update text
        const box = this.parentElement.querySelector('.file-upload-box p');
        if (box) box.textContent = this.files[0].name;
        
        // Preview Audio
        const audio = document.getElementById('audioPreview');
        audio.src = URL.createObjectURL(this.files[0]);
        showElement('audioPreviewContainer');
    }
});

async function processAudio() {
    const fileInput = document.getElementById('audioInput');
    if (!fileInput.files[0]) return alert('Please select an audio file.');
    
    const numSamples = document.getElementById('numSamples').value;

    const formData = new FormData();
    formData.append('audio', fileInput.files[0]);
    formData.append('num_samples', numSamples);

    try {
        const response = await fetch('/process_audio', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (data.error) return alert(data.error);

        const metaDiv = document.getElementById('audioMeta');
        metaDiv.innerHTML = `
            <p><strong>Duration:</strong> ${data.metadata.duration}</p>
            <p><strong>Sample Rate:</strong> ${data.metadata.sample_rate}</p>
            <p><strong>Total Samples:</strong> ${data.metadata.total_samples}</p>
        `;

        document.getElementById('waveformImage').src = data.waveform_url;
        document.getElementById('binaryData').textContent = data.binary_snippet.join('\n');

        showElement('audioResult');
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred.');
    }
}

// --- UI Enhancements ---

// Tab Switching
function openTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Deactivate all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tabId).classList.add('active');
    
    // Activate clicked button (event.target is tricky here if called inline, 
    // but we can find the button that calls this function or just rely on the user clicking)
    // A better way is to pass 'this' or handle it via event delegation.
    // For simplicity, let's iterate buttons and check text or attributes if needed, 
    // but the easiest is to add 'active' class to the clicked button in the onclick handler 
    // or use event.currentTarget.
    
    // Let's assume the button triggered the event.
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

// File Input Feedback
document.getElementById('imageInput')?.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        showElement('imageControls');
        // Update text
        const box = this.parentElement.querySelector('.file-upload-box p');
        if (box) box.textContent = this.files[0].name;
        
        // Load original image into container for selection
        const reader = new FileReader();
        reader.onload = function(e) {
            const container = document.getElementById('imageContainer');
            container.innerHTML = `<div class="image-wrapper"><img src="${e.target.result}" id="targetImage" style="max-width: 100%; display: block;"></div>`;
            showElement('imageDisplay');
        }
        reader.readAsDataURL(this.files[0]);
    }
});

// --- Color Mixing Logic ---
let selectionBox = null;
let isSelecting = false;
let startX, startY;
let selectionRect = { x: 0, y: 0, w: 0, h: 0 };

function updateColorFromSliders() {
    const r = document.getElementById('sliderR').value;
    const g = document.getElementById('sliderG').value;
    const b = document.getElementById('sliderB').value;
    
    document.getElementById('valR').textContent = r;
    document.getElementById('valG').textContent = g;
    document.getElementById('valB').textContent = b;
    
    const hex = rgbToHex(parseInt(r), parseInt(g), parseInt(b));
    document.getElementById('colorPicker').value = hex;
    updatePreview(r, g, b);
}

function updateColorFromPicker() {
    const hex = document.getElementById('colorPicker').value;
    const rgb = hexToRgb(hex);
    
    document.getElementById('sliderR').value = rgb.r;
    document.getElementById('sliderG').value = rgb.g;
    document.getElementById('sliderB').value = rgb.b;
    
    updateColorFromSliders(); // Update text values
}

function updatePreview(r, g, b) {
    const color = `rgb(${r}, ${g}, ${b})`;
    document.getElementById('colorPreview').style.backgroundColor = color;
    if (selectionBox) {
        selectionBox.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
        selectionBox.style.borderColor = `rgb(${r}, ${g}, ${b})`;
    }
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
}

function enableSelectionMode() {
    const img = document.getElementById('targetImage');
    if (!img) return alert("Please upload an image first.");
    
    isSelecting = true;
    document.getElementById('selectionInfo').textContent = "Mode Active: Click and drag on the image to select a region.";
    
    const wrapper = img.parentElement;
    wrapper.style.position = 'relative';
    wrapper.style.cursor = 'crosshair';
    
    // Remove existing selection box
    if (selectionBox) selectionBox.remove();
    selectionBox = document.createElement('div');
    selectionBox.style.position = 'absolute';
    selectionBox.style.border = '2px dashed white';
    selectionBox.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    selectionBox.style.pointerEvents = 'none'; // Let clicks pass through
    selectionBox.style.display = 'none';
    wrapper.appendChild(selectionBox);
    
    wrapper.onmousedown = function(e) {
        if (!isSelecting) return;
        e.preventDefault();
        
        const rect = img.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        
        selectionBox.style.left = startX + 'px';
        selectionBox.style.top = startY + 'px';
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
        selectionBox.style.display = 'block';
        
        // Update color immediately
        const r = document.getElementById('sliderR').value;
        const g = document.getElementById('sliderG').value;
        const b = document.getElementById('sliderB').value;
        updatePreview(r, g, b);
        
        document.onmousemove = function(e) {
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            
            const width = currentX - startX;
            const height = currentY - startY;
            
            selectionBox.style.width = Math.abs(width) + 'px';
            selectionBox.style.height = Math.abs(height) + 'px';
            selectionBox.style.left = (width < 0 ? currentX : startX) + 'px';
            selectionBox.style.top = (height < 0 ? currentY : startY) + 'px';
        };
        
        document.onmouseup = function(e) {
            document.onmousemove = null;
            document.onmouseup = null;
            
            // Calculate actual image coordinates
            // We need to account for image scaling if displayed size != natural size
            const scaleX = img.naturalWidth / img.width;
            const scaleY = img.naturalHeight / img.height;
            
            const boxRect = selectionBox.getBoundingClientRect();
            const imgRect = img.getBoundingClientRect();
            
            selectionRect.x = Math.round((boxRect.left - imgRect.left) * scaleX);
            selectionRect.y = Math.round((boxRect.top - imgRect.top) * scaleY);
            selectionRect.w = Math.round(boxRect.width * scaleX);
            selectionRect.h = Math.round(boxRect.height * scaleY);
            
            document.getElementById('selectionInfo').textContent = `Selected Region: X=${selectionRect.x}, Y=${selectionRect.y}, W=${selectionRect.w}, H=${selectionRect.h}`;
        };
    };
}

async function applyColorMixing() {
    if (selectionRect.w === 0 || selectionRect.h === 0) return alert("Please select a region first.");
    
    const r = document.getElementById('sliderR').value;
    const g = document.getElementById('sliderG').value;
    const b = document.getElementById('sliderB').value;
    
    const data = await uploadImage('mix_colors', {
        x: selectionRect.x,
        y: selectionRect.y,
        w: selectionRect.w,
        h: selectionRect.h,
        r: r, g: g, b: b
    });
    
    if (!data) return;
    
    // Update the image
    const container = document.getElementById('imageContainer');
    container.innerHTML = `<div class="image-wrapper"><img src="${data.processed_url}" id="targetImage" style="max-width: 100%; display: block;"></div>`;
    
    // Reset selection
    selectionBox = null;
    isSelecting = false;
    document.getElementById('selectionInfo').textContent = "Color applied. Click 'Start Selection Mode' to select again.";
}
