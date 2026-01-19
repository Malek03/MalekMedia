# Lumina - Image Histogram Analysis Tool

A web-based tool for analyzing image histograms and performing histogram equalization, powered by a Python Flask backend.

## Prerequisites

- Python 3.x installed.
- `pip` (Python package manager).

## Installation

1.  Open your terminal or command prompt.
2.  Navigate to the project directory.
3.  Install the required Python packages:

    ```bash
    pip install -r requirements.txt
    ```

## Running the Application

1.  Start the Flask server:

    ```bash
    python app.py
    ```

2.  Open your web browser and go to:

    ```
    http://localhost:5000
    ```

## Features

- **Upload Images**: Supports PNG, JPG, GIF.
- **Histogram Analysis**: View Grayscale and RGB histograms.
- **Histogram Equalization**: Automatically improve image contrast.
- **Download**: Save the generated histograms and equalized images.
