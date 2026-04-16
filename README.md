# NeuroDetect Lite 🧠

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

> **NeuroDetect Lite** is an advanced, lightweight neuroimaging analysis pipeline designed for real-time Alzheimer's Disease classification. By combining deep learning with clinical metrics (MMSE), it provides interpretable diagnostic insights through Grad-CAM visualizations.

---

## 🏗️ System Architecture

NeuroDetect Lite employs a modular full-stack architecture designed for research scalability and clinical deployment.

```mermaid
graph TD
    Client["🌐 User Interface (React)"]
    subgraph Frontend ["Frontend Ecosystem"]
        UI["React Functional Components"]
        State["State Management"]
        API_S["Axios API Services"]
    end
    subgraph Backend ["Inference Engine (FastAPI)"]
        Scanner["MRI Preprocessing"]
        Models["PyTorch Model Zoo"]
        CAM["Grad-CAM Analyzer"]
    end
    subgraph Storage ["Research Data"]
        Slices["MRI NIfTI/PNG Slices"]
        Weights["Pre-trained Weights (.pt)"]
    end
    
    Client <--> UI
    UI <--> API_S
    API_S <--> Scanner
    Scanner <--> Models
    Models <--> CAM
    Models --- Weights
    Scanner --- Slices
```

---

## 🧪 Inference Pipeline

The diagnostic flow integrates raw imaging data with patient cognitive scores (MMSE) to produce a comprehensive classification.

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant F as React Frontend
    participant B as FastAPI Backend
    participant M as PyTorch Model
    
    U->>F: Upload MRI Slice & Enter MMSE
    F->>B: POST /api/predict (Multipart Form Data)
    B->>B: Image Normalization & Tensor Conversion
    B->>M: Forward Pass (Image + MMSE Integration)
    M-->>B: Prediction Probabilities
    B->>B: Extract Gradients for Grad-CAM
    B->>B: Overlay Heatmap on Original Slice
    B-->>F: JSON Result (Class, Confidence, Visualization)
    F-->>U: Render High-Fidelity Results
```

---

## 🖼️ System Gallery

| Diagnosis View | Gradient Analysis | Comparison |
|:---:|:---:|:---:|
| ![Screenshot 1](writing-article/screenshots/screencapture-localhost-3001-2026-04-16-03_45_55.png) | ![Screenshot 2](writing-article/screenshots/screencapture-localhost-3001-2026-04-16-03_46_17.png) | ![Screenshot 3](writing-article/screenshots/screencapture-localhost-3001-2026-04-16-03_46_33.png) |

---

## 🚀 Key Features

- **Multi-Modal Integration**: Combines MRI structural data with clinical MMSE scoring.
- **Explainable AI (XAI)**: Native Grad-CAM support for localized neuropathology visualization.
- **Accessible Design**: Built following the **Accessible & Ethical** UI/UX pattern with high contrast and WCAG-compliant components.
- **Lightweight Deployment**: Optimized for edge inference with minimal hardware overhead.

---

## 🛠️ Installation & Setup

### 1. Backend (FastAPI)
```bash
cd back-end
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
# Install dependencies
pip install -r requirements.txt
# Run the server
python main.py
```

### 2. Frontend (React + Vite)
```bash
cd front-end
# Install dependencies
npm install
# Configure environment variables
cp .env.example .env.local
# Run developer server
npm run dev
```

---

## 📄 Research & Citation

This project is part of a research initiative detailed in the paper:
**"NeuroDetect Lite: Lightweight Deep Learning for Alzheimer's Classification"** (2026).

If you use this work in your research, please cite:
```bibtex
@article{neurodetect2026,
  title={NeuroDetect Lite: Lightweight Deep Learning for Alzheimer's Classification},
  author={Alzheimer's Model Pipeline Team},
  year={2026},
  journal={Internal Research Repository}
}
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
