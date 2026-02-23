---
name: "md-to-lark-doc"
description: "Converts Markdown files to Lark/Feishu documents. Invoke when user wants to publish, upload, or convert local markdown content to Lark/Feishu docs."
---

# Markdown to Lark/Feishu Doc Converter

This skill helps convert local Markdown files into Lark (Feishu) cloud documents.

## Prerequisites

1.  **Lark/Feishu App**: You need a Lark/Feishu App with "Docs" permissions enabled.
2.  **Environment Variables**: Set the following variables or update the `config.json` (if created):
    -   `LARK_APP_ID`
    -   `LARK_APP_SECRET`

## Usage

1.  **Install Dependencies**:
    ```bash
    pip install -r .trae/skills/md-to-lark-doc/requirements.txt
    ```

2.  **Run Conversion**:
    ```bash
    python .trae/skills/md-to-lark-doc/convert_to_lark.py <path_to_markdown_file>
    ```

## Features

-   Reads a local Markdown file.
-   Authenticates with Lark Open Platform.
-   Creates a new document in the user's root folder (or specified folder).
-   Converts Markdown syntax to Lark Doc blocks.

## Setup Instructions

1.  Go to [Lark Open Platform](https://open.feishu.cn/app) and create an app.
2.  Enable **Docs** and **Drive** related permissions.
3.  Get your **App ID** and **App Secret**.
