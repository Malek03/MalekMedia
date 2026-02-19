# Media Processing Web App

A Flask-based web application for processing and analyzing Text, Images, Video, and Audio. This project demonstrates various media processing techniques using Python libraries like OpenCV, Librosa, and MoviePy.

## Features

### 1. Text Processing
- **Encoding**: Convert text to ASCII, Binary, and Hexadecimal representations.

### 2. Image Processing
- **Channel Decomposition**: Split an image into Red, Green, and Blue channels.
- **Sampling**: Reduce image resolution to simulate pixelation.
- **Quantization**: Reduce color depth and visualize pixel intensity in 2D grids and 3D plots.
- **Color Mixing**: Mix RGB colors into specific regions of an image.

### 3. Video Processing
- **Frame Extraction**: Extract frames from a video at specific intervals.
- **Metadata**: Retrieve video duration, FPS, and resolution.

### 4. Audio Processing
- **Waveform Visualization**: Generate and display the audio waveform.
- **Binary Representation**: Convert audio samples to binary format (PCM).

## Installation

### Prerequisites
- Python 3.9+
- pip (Python package manager)

### Local Setup

1. **Clone the repository** (if applicable) or navigate to the project directory.

2. **Create a virtual environment (optional but recommended):**
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application:**
   ```bash
   python app.py
   ```
   The app will be accessible at `http://127.0.0.1:5000`.

## Docker Usage

This project includes a `Dockerfile` for easy containerization.

1. **Build the Docker image:**
   ```bash
   docker build -t media-app .
   ```

2. **Run the container:**
   ```bash
   docker run -p 5000:5000 media-app
   ```

3. **Access the application:**
   Open your browser and navigate to `http://localhost:5000`.

## Project Structure

```
Projectv2/
├── app.py              # Main Flask application
├── Dockerfile          # Docker configuration
├── requirements.txt    # Python dependencies
├── README.md           # Project documentation
├── static/             # Static assets (CSS, JS, processed files)
│   ├── uploads/        # User uploaded files
│   └── processed/      # Generated files (plots, frames, etc.)
└── templates/          # HTML templates
    ├── index.html
    ├── text.html
    ├── image.html
    ├── video.html
    ├── audio.html
    └── layout.html (implied)
```

## Technologies Used

- **Flask**: Web framework for Python.
- **OpenCV**: Computer vision library for image processing.
- **Pillow (PIL)**: Python Imaging Library for image manipulation.
- **Librosa**: Audio analysis and music information retrieval.
- **MoviePy**: Video editing and processing.
- **Matplotlib**: Plotting library for visualizations.
