import os
import sys
import json
import requests
import argparse
import time
import copy


# Configuration
CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'config.json')
try:
    with open(CONFIG_PATH, 'r') as f:
        config = json.load(f)
except FileNotFoundError:
    config = {}

APP_ID = os.getenv("LARK_APP_ID") or config.get("LARK_APP_ID")
APP_SECRET = os.getenv("LARK_APP_SECRET") or config.get("LARK_APP_SECRET")
MY_EMAIL = os.getenv("LARK_EMAIL") or config.get("LARK_EMAIL")

def get_tenant_access_token(app_id, app_secret):
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    headers = {"Content-Type": "application/json; charset=utf-8"}
    payload = {
        "app_id": app_id,
        "app_secret": app_secret
    }
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code == 200:
        return response.json().get("tenant_access_token")
    else:
        print(f"Error getting access token: {response.text}")
        return None

def create_doc(access_token, title, blocks=None):
    url = "https://open.feishu.cn/open-apis/docx/v1/documents"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=utf-8"
    }
    payload = {
        "folder_token": "",
        "title": title
    }
    
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code == 200:
        doc_data = response.json().get("data", {}).get("document", {})
        doc_id = doc_data.get("document_id")
        print(f"Document created successfully! Doc ID: {doc_id}")
        print(f"URL: https://feishu.cn/docx/{doc_id}")
        return doc_id
    else:
        print(f"Error creating document: {response.text}")
        return None

def add_blocks(access_token, document_id, blocks):
    url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{document_id}/blocks/{document_id}/descendant"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=utf-8"
    }
    
    if not blocks:
        print("No blocks to add")
        return
    
    # Clean blocks: remove read-only fields and problematic data
    def clean_block(block):
        block = copy.deepcopy(block)
        
        # Remove read-only fields
        keys_to_remove = ["parent_id", "creator", "create_time", "updater", "update_time", "revision"]
        for key in keys_to_remove:
            block.pop(key, None)
        
        # Remove merge_info and cells from tables (read-only fields)
        # According to API docs, cells should be removed before insertion
        if "table" in block and isinstance(block["table"], dict):
            block["table"].pop("merge_info", None)
            block["table"].pop("cells", None)
            # Also remove merge_info from table.property if it exists
            if "property" in block["table"] and isinstance(block["table"]["property"], dict):
                block["table"]["property"].pop("merge_info", None)
        
        # Remove empty text_element_style
        for key, value in block.items():
            if isinstance(value, dict) and "elements" in value:
                elements = value["elements"]
                if isinstance(elements, list):
                    for element in elements:
                        if "text_run" in element and "text_element_style" in element["text_run"]:
                            style = element["text_run"]["text_element_style"]
                            # Remove if all style values are False
                            if all(not v for v in style.values()):
                                element["text_run"].pop("text_element_style")
        
        return block
    
    # Clean all blocks
    cleaned_blocks = [clean_block(b) for b in blocks]
    
    # Build block map and hierarchy
    block_map = {b["block_id"]: b for b in cleaned_blocks}
    
    # Find all child IDs to identify root blocks
    all_child_ids = set()
    for block in cleaned_blocks:
        children = block.get("children", [])
        all_child_ids.update(children)
    
    # Root blocks are those not referenced as children
    # IMPORTANT: Maintain original order from cleaned_blocks
    root_ids = [b["block_id"] for b in cleaned_blocks if b["block_id"] not in all_child_ids]
    
    print(f"Total blocks: {len(cleaned_blocks)}, Root blocks: {len(root_ids)}")
    
    # Helper to collect all descendants of given root IDs
    def collect_descendants(root_ids):
        result = []
        visited = set()
        
        def traverse(block_id):
            if block_id in visited or block_id not in block_map:
                return
            visited.add(block_id)
            block = block_map[block_id]
            result.append(block)
            
            # Traverse children
            for child_id in block.get("children", []):
                traverse(child_id)
        
        for root_id in root_ids:
            traverse(root_id)
        
        return result
    
    # Upload blocks one root at a time for better error handling
    success_count = 0
    error_count = 0
    failed_blocks = []
    
    for idx, root_id in enumerate(root_ids):
        root_descendants = collect_descendants([root_id])
        
        payload = {
            "children_id": [root_id],
            "descendants": root_descendants,
            "index": -1
        }
        
        # Retry logic for network issues
        max_retries = 3
        retry_delay = 0.5
        
        for attempt in range(max_retries):
            try:
                response = requests.post(url, headers=headers, json=payload, timeout=30)
                result = response.json()
                
                if response.status_code == 200 and result.get("code") == 0:
                    success_count += 1
                    if (idx + 1) % 10 == 0:
                        print(f"Progress: {idx + 1}/{len(root_ids)} blocks uploaded")
                    break
                else:
                    if attempt < max_retries - 1:
                        time.sleep(retry_delay)
                        continue
                    error_count += 1
                    root_block = block_map.get(root_id, {})
                    block_type = root_block.get("block_type")
                    failed_blocks.append({
                        "id": root_id,
                        "type": block_type,
                        "error": result.get("msg", "Unknown error")
                    })
                    if error_count <= 5:
                        print(f"✗ Block {idx + 1} (type {block_type}) failed: {result.get('msg', 'Unknown error')}")
            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                    continue
                error_count += 1
                if error_count <= 5:
                    print(f"✗ Block {idx + 1} exception: {str(e)}")
                break
        
        # Small delay between requests to avoid rate limiting
        time.sleep(0.1)
    
    print(f"\n{'='*60}")
    print(f"Upload summary: {success_count} succeeded, {error_count} failed out of {len(root_ids)} root blocks")
    
    if failed_blocks:
        print(f"\nFailed block types: {set(b['type'] for b in failed_blocks)}")
        print(f"Sample failures:")
        for fb in failed_blocks[:3]:
            print(f"  - Type {fb['type']}: {fb['error']}")


def parse_markdown_to_blocks(file_path, access_token):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        lines = content.split('\n')
    
    # Build a mapping from content to line number with better uniqueness
    # Track each occurrence separately
    line_contents = []
    for line_num, line in enumerate(lines):
        stripped = line.strip()
        if stripped:
            line_contents.append((line_num, stripped))
    
    url = "https://open.feishu.cn/open-apis/docx/v1/documents/blocks/convert"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=utf-8"
    }
    
    payload = {
        "content_type": "markdown",
        "content": content
    }
    
    response = requests.post(url, headers=headers, json=payload)
    
    if response.status_code == 200:
        result = response.json()
        if result.get("code") == 0:
            data = result.get("data", {})
            blocks = data.get("blocks", [])
            first_level_block_ids = data.get("first_level_block_ids", [])
            
            print(f"Converted {len(blocks)} blocks from Markdown")
            print(f"First level blocks: {len(first_level_block_ids)}")
            
            # Use first_level_block_ids to maintain correct order
            # This is the key! Feishu API provides the correct order in this field
            if first_level_block_ids:
                # Create a map of block_id to block
                block_map = {b["block_id"]: b for b in blocks}
                
                # Reorder blocks according to first_level_block_ids
                # First, add all first-level blocks in order
                ordered_blocks = []
                for block_id in first_level_block_ids:
                    if block_id in block_map:
                        ordered_blocks.append(block_map[block_id])
                
                # Then add any remaining blocks (children, etc.)
                first_level_set = set(first_level_block_ids)
                for block in blocks:
                    if block["block_id"] not in first_level_set:
                        ordered_blocks.append(block)
                
                blocks = ordered_blocks
                print(f"Blocks reordered using first_level_block_ids from API")
            
            if blocks and len(blocks) > 0:
                print(f"First block type: {blocks[0].get('block_type')}")
            
            return blocks
        else:
            print(f"Error converting markdown: {result}")
            return []
    else:
        print(f"Error calling convert API: {response.text}")
        return []

def list_files(access_token, folder_token=None, page_size=100, order_by="EditedTime", direction="DESC"):
    """
    List files in user's cloud space or specified folder
    
    Args:
        access_token: Feishu access token
        folder_token: Folder token (None for root directory)
        page_size: Number of items per page (max 200)
        order_by: Sort by "EditedTime" or "CreatedTime"
        direction: Sort direction "ASC" or "DESC"
    
    Returns:
        list: List of files/folders, or empty list if error
    """
    url = "https://open.feishu.cn/open-apis/drive/v1/files"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=utf-8"
    }
    
    params = {
        "page_size": page_size,
        "order_by": order_by,
        "direction": direction
    }
    
    if folder_token:
        params["folder_token"] = folder_token
    
    all_files = []
    page_token = None
    
    while True:
        if page_token:
            params["page_token"] = page_token
        
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("code") == 0:
                data = result.get("data", {})
                files = data.get("files", [])
                all_files.extend(files)
                
                # Check if there are more pages
                page_token = data.get("next_page_token")
                if not page_token:
                    break
            else:
                print(f"Error listing files: {result.get('msg')}")
                break
        else:
            print(f"HTTP error {response.status_code}: {response.text}")
            break
    
    return all_files

def add_collaborator(access_token, token, member_type, member_id, perm):
    url = f"https://open.feishu.cn/open-apis/drive/v1/permissions/{token}/members"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=utf-8"
    }
    params = {"type": "docx"}
    payload = {
        "member_type": member_type,
        "member_id": member_id,
        "perm": perm
    }
    response = requests.post(url, headers=headers, params=params, json=payload)
    if response.status_code == 200 and response.json().get("code") == 0:
        print(f"Added collaborator {member_id}")
    else:
        print(f"Failed to add collaborator: {response.text}")

def delete_document(access_token, document_id, doc_type="docx"):
    """
    Delete a document from Feishu Drive
    
    Args:
        access_token: Feishu access token
        document_id: Document ID (file_token)
        doc_type: Document type, default "docx" for new docs
                  Options: "docx", "file", "bitable", "folder", "doc", "sheet", etc.
    
    Returns:
        bool: True if deletion successful, False otherwise
    """
    url = f"https://open.feishu.cn/open-apis/drive/v1/files/{document_id}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=utf-8"
    }
    params = {"type": doc_type}
    
    response = requests.delete(url, headers=headers, params=params)
    
    if response.status_code == 200:
        result = response.json()
        if result.get("code") == 0:
            print(f"✓ Document {document_id} deleted successfully")
            if "task_id" in result.get("data", {}):
                print(f"  Async task ID: {result['data']['task_id']}")
            return True
        else:
            print(f"✗ Failed to delete document: {result.get('msg')}")
            return False
    else:
        print(f"✗ HTTP error {response.status_code}: {response.text}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Convert Markdown to Lark Doc")
    parser.add_argument("file_path", help="Path to the markdown file")
    args = parser.parse_args()

    if not APP_ID or not APP_SECRET:
        print("Error: LARK_APP_ID and LARK_APP_SECRET environment variables must be set.")
        return

    if not os.path.exists(args.file_path):
        print(f"Error: File not found: {args.file_path}")
        return

    file_name = os.path.basename(args.file_path)
    title = os.path.splitext(file_name)[0]

    token = get_tenant_access_token(APP_ID, APP_SECRET)
    if not token:
        return

    # 1. Create an empty document
    doc_id = create_doc(token, title)
    
    if doc_id:
        print(f"Parsing markdown: {args.file_path}")
        blocks = parse_markdown_to_blocks(args.file_path, token)
        if blocks:
            print(f"Adding {len(blocks)} blocks to document...")
            add_blocks(token, doc_id, blocks)
        else:
            print("No content found in markdown file.")

    # 2. Add Collaborator
    member_id = MY_EMAIL
    if member_id:
        add_collaborator(token, doc_id, "email", member_id, "full_access")
        
if __name__ == "__main__":
    main()
