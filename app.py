import os
import cv2
import numpy as np
from flask import Flask, render_template, request, jsonify, send_from_directory, url_for
from PIL import Image, ImageDraw, ImageFont
import librosa
import librosa.display
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from moviepy.editor import VideoFileClip
import uuid

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = os.path.join('static', 'uploads')
app.config['STATIC_FOLDER'] = 'static'

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
# Ensure static/processed directory exists for generated assets
PROCESSED_FOLDER = os.path.join(app.config['STATIC_FOLDER'], 'processed')
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

def generate_filename(extension):
    return f"{uuid.uuid4()}.{extension}"

@app.route('/')
def index():
    return render_template('index.html')

# --- Text Encoding ---
@app.route('/text', methods=['GET', 'POST'])
def text_page():
    if request.method == 'POST':
        data = request.get_json()
        text = data.get('text', '')
        
        ascii_vals = [ord(c) for c in text]
        binary_vals = [format(c, '08b') for c in ascii_vals]
        hex_vals = [format(c, '02x').upper() for c in ascii_vals]
        
        return jsonify({
            'ascii': ascii_vals,
            'binary': binary_vals,
            'hex': hex_vals
        })
    return render_template('text.html')

# --- Image Representation ---
@app.route('/image', methods=['GET', 'POST'])
def image_page():
    return render_template('image.html')

@app.route('/process_image', methods=['POST'])
def process_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    filename = generate_filename(file.filename.split('.')[-1])
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    
    action = request.form.get('action')
    
    # Base URL for the uploaded image
    # We need a route to serve uploads if we want to display the original
    # For simplicity, we can copy it to static/processed or serve from uploads
    # Let's serve from uploads via a route or copy to static. 
    # Copying to static/processed for easy access.
    
    # Load image
    img = Image.open(filepath).convert('RGB')
    width, height = img.size
    
    response_data = {'original_url': url_for('uploaded_file', filename=filename)}

    if action == 'decompose':
        # Split channels
        r, g, b = img.split()
        
        # Create blank images for other channels to make them look Red, Green, Blue
        zeros = Image.new('L', (width, height))
        
        # Merge to create pure R, G, B images
        img_r = Image.merge('RGB', (r, zeros, zeros))
        img_g = Image.merge('RGB', (zeros, g, zeros))
        img_b = Image.merge('RGB', (zeros, zeros, b))
        
        r_name = f"r_{filename}"
        g_name = f"g_{filename}"
        b_name = f"b_{filename}"
        
        img_r.save(os.path.join(PROCESSED_FOLDER, r_name))
        img_g.save(os.path.join(PROCESSED_FOLDER, g_name))
        img_b.save(os.path.join(PROCESSED_FOLDER, b_name))
        
        response_data.update({
            'r_url': url_for('static', filename=f'processed/{r_name}'),
            'g_url': url_for('static', filename=f'processed/{g_name}'),
            'b_url': url_for('static', filename=f'processed/{b_name}')
        })

    elif action == 'sampling':
        # Get sampling factor (pixel size)
        # We'll interpret rows/cols as "resolution"
        # Or better, let's stick to the user's "rows" and "cols" as the target resolution
        rows = int(request.form.get('rows', 10))
        cols = int(request.form.get('cols', 10))
        
        # Resize to small resolution (sampling)
        img_small = img.resize((cols, rows), resample=Image.NEAREST)
        
        # Resize back to original size to show the pixelation effect
        img_sampled = img_small.resize((width, height), resample=Image.NEAREST)
            
        sampled_name = f"sampled_{filename}"
        img_sampled.save(os.path.join(PROCESSED_FOLDER, sampled_name))
        response_data['processed_url'] = url_for('static', filename=f'processed/{sampled_name}')

    elif action == 'quantization':
        colors = int(request.form.get('colors', 16))
        colors = max(2, min(colors, 256))
        
        # Get user defined rows/cols for the grid (Sampling)
        try:
            rows = int(request.form.get('rows', 10))
            cols = int(request.form.get('cols', 10))
        except:
            rows, cols = 10, 10

        # 1. Resize to grid (Sampling)
        img_small = img.resize((cols, rows), resample=Image.BILINEAR)
        
        # 2. Quantize (Color Depth Reduction) - Convert to Grayscale first for clarity
        # "Quantization" in this context often refers to the discrete values.
        # We will show Grayscale values.
        img_gray = img_small.convert('L')
        # Quantize the grayscale image
        img_quant = img_gray.quantize(colors=colors) # This returns a P image
        img_quant_rgb = img_quant.convert('RGB') # For display
        
        # --- Visualization 1: Grid with Values (2D) ---
        cell_size = 60
        canvas_size = (cols * cell_size, rows * cell_size)
        img_vis = Image.new('RGB', canvas_size, (255, 255, 255))
        draw = ImageDraw.Draw(img_vis)
        
        try:
            font = ImageFont.truetype("arial.ttf", 16)
        except IOError:
            font = ImageFont.load_default()

        for y in range(rows):
            for x in range(cols):
                # Get grayscale value
                val = img_quant.getpixel((x, y))
                
                # Draw cell background
                # We can use the actual color or just white
                # Let's use the pixel color
                color = img_quant_rgb.getpixel((x, y))
                
                x0 = x * cell_size
                y0 = y * cell_size
                x1 = x0 + cell_size
                y1 = y0 + cell_size
                
                draw.rectangle([x0, y0, x1, y1], fill=color, outline="gray", width=1)
                
                # Draw text (Value)
                text = str(val)
                
                # Text color based on brightness
                text_color = "white" if val < 128 else "black"
                
                # Center text (approx)
                draw.text((x0 + 20, y0 + 20), text, fill=text_color, font=font)
        
        vis_name = f"quant_grid_{filename}"
        img_vis.save(os.path.join(PROCESSED_FOLDER, vis_name))
        
        # --- Visualization 2: 3D Bar Plot ---
        # Use matplotlib to create a 3D bar chart of the values
        fig = plt.figure(figsize=(8, 6))
        ax = fig.add_subplot(111, projection='3d')
        
        _x = np.arange(cols)
        _y = np.arange(rows)
        _xx, _yy = np.meshgrid(_x, _y)
        x, y = _xx.ravel(), _yy.ravel()
        
        # Z values (height)
        z = np.zeros_like(x)
        dx = dy = 0.8
        dz = np.array(img_quant).ravel()
        
        # Colors
        # Normalize colors for matplotlib
        colors_array = np.array(img_quant_rgb).reshape(-1, 3) / 255.0
        
        ax.bar3d(x, y, z, dx, dy, dz, color=colors_array, shade=True)
        ax.set_title(f"3D Quantization ({colors} Levels)")
        ax.set_zlabel("Intensity")
        
        plot_name = f"quant_3d_{filename}.png"
        plt.savefig(os.path.join(PROCESSED_FOLDER, plot_name))
        plt.close()

        response_data.update({
            'processed_url': url_for('static', filename=f'processed/{vis_name}'),
            'plot_url': url_for('static', filename=f'processed/{plot_name}')
        })

    elif action == 'mix_colors':
        try:
            x = int(float(request.form.get('x', 0)))
            y = int(float(request.form.get('y', 0)))
            w = int(float(request.form.get('w', 100)))
            h = int(float(request.form.get('h', 100)))
            r = int(request.form.get('r', 0))
            g = int(request.form.get('g', 0))
            b = int(request.form.get('b', 0))
            
            draw = ImageDraw.Draw(img)
            draw.rectangle([x, y, x+w, y+h], fill=(r, g, b))
            
            mixed_name = f"mixed_{filename}"
            img.save(os.path.join(PROCESSED_FOLDER, mixed_name))
            response_data['processed_url'] = url_for('static', filename=f'processed/{mixed_name}')
        except Exception as e:
            return jsonify({'error': str(e)}), 400

    return jsonify(response_data)

# --- Video Processing ---
@app.route('/video', methods=['GET', 'POST'])
def video_page():
    return render_template('video.html')

@app.route('/process_video', methods=['POST'])
def process_video():
    if 'video' not in request.files:
        return jsonify({'error': 'No video uploaded'}), 400
    
    file = request.files['video']
    filename = generate_filename(file.filename.split('.')[-1])
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    
    try:
        clip = VideoFileClip(filepath)
        duration = clip.duration
        fps = clip.fps
        size = clip.size
        
        num_frames = int(request.form.get('num_frames', 5))
        times = np.linspace(0, duration - 0.1, num_frames) # Avoid last frame issue
        
        frame_urls = []
        for i, t in enumerate(times):
            frame_name = f"frame_{i}_{filename}.jpg"
            frame_path = os.path.join(PROCESSED_FOLDER, frame_name)
            clip.save_frame(frame_path, t)
            frame_urls.append(url_for('static', filename=f'processed/{frame_name}'))
            
        clip.close()
        
        return jsonify({
            'metadata': {
                'duration': f"{duration:.2f}s",
                'fps': fps,
                'resolution': f"{size[0]}x{size[1]}"
            },
            'frames': frame_urls
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- Audio Analysis ---
@app.route('/audio', methods=['GET', 'POST'])
def audio_page():
    return render_template('audio.html')

@app.route('/process_audio', methods=['POST'])
def process_audio():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio uploaded'}), 400
    
    file = request.files['audio']
    filename = generate_filename(file.filename.split('.')[-1])
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    
    try:
        # Load audio
        y, sr = librosa.load(filepath, sr=None)
        duration = librosa.get_duration(y=y, sr=sr)
        
        # Generate Waveform Plot
        plt.figure(figsize=(10, 4))
        librosa.display.waveshow(y, sr=sr)
        plt.title('Waveform')
        plt.tight_layout()
        
        plot_name = f"wave_{filename}.png"
        plot_path = os.path.join(PROCESSED_FOLDER, plot_name)
        plt.savefig(plot_path)
        plt.close()
        
        # Binary representation
        num_samples = int(request.form.get('num_samples', 20))
        num_samples = max(1, min(num_samples, 1000))
        
        # Zero-Skipping: Find start index where signal is non-zero (or above threshold)
        threshold = 0.001
        start_index = 0
        for i, val in enumerate(y):
            if abs(val) > threshold:
                start_index = i
                break
        
        # Extract samples starting from the non-silent part
        y_segment = y[start_index : start_index + num_samples]
        
        # Convert float samples to 16-bit PCM representation
        y_int = (y_segment * 32767).astype(int)
        binary_snippet = [format(val & 0xFFFF, '016b') for val in y_int]
        
        return jsonify({
            'metadata': {
                'duration': f"{duration:.2f}s",
                'sample_rate': f"{sr} Hz",
                'total_samples': len(y)
            },
            'waveform_url': url_for('static', filename=f'processed/{plot_name}'),
            'binary_snippet': binary_snippet
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    app.run(debug=True)
