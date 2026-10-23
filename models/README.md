# Model weights

The model weights are **not stored in this Git repository**. Keeping them out
of Git keeps the clone small and avoids shipping large binary files in history.

The FastAPI backend downloads the weights automatically from Hugging Face when
they are not present locally:

- Model repository: <https://huggingface.co/subarufly17/neurodetectlite-models>

Expected local layout after download:

```text
models/
├── fp32/
│   ├── efficientnet_fp32.pth
│   ├── ghostnet_fp32.pth
│   ├── lightalznet_fp32.pth
│   ├── mobilenet_fp32.pth
│   ├── plaincnn_fp32.pth
│   └── tinyvit_fp32.pth
└── int8/
    ├── efficientnet_int8.pth
    ├── ghostnet_int8.pth
    ├── lightalznet_int8.pth
    ├── mobilenet_int8.pth
    ├── plaincnn_int8.pth
    └── tinyvit_aphqvit.pth
```

To download manually:

```bash
huggingface-cli download subarufly17/neurodetectlite-models --local-dir models
```

## Data and use notice

These weights are research artifacts derived from structural MRI data. The
underlying datasets (OASIS/ADNI) are governed by their own data-use agreements.
Do not use this repository or its weights for clinical diagnosis. If you
redistribute the weights, verify that the terms of the source datasets permit
it.

## Security

Only load checkpoints from a source you trust. The inference code uses
`torch.load`; prefer `weights_only=True` for plain state dictionaries.
