import json
import os
import sys
import time
from pathlib import Path
from google import genai
from pydantic import BaseModel

# Settings
BASE_DIR = Path(__file__).resolve().parent
EMBEDDINGS_FILE = BASE_DIR / "embeddings" / "all_embeddings.json"
EMBEDDING_MODEL = "text-embedding-004"
DIMENSION = 768

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY environment variable is not set.")
        print("Run with: $env:GEMINI_API_KEY='your_key_here'; python regenerate_embeddings.py")
        sys.exit(1)

    print("Loading original embeddings...")
    with open(EMBEDDINGS_FILE, "r", encoding="utf-8") as f:
        records = json.load(f)

    print(f"Loaded {len(records)} records. Generating new embeddings using {EMBEDDING_MODEL} (Google)...")
    
    client = genai.Client(api_key=api_key)
    
    # Process in batches to respect rate limits
    batch_size = 100
    total_records = len(records)
    new_records = []
    
    for i in range(0, total_records, batch_size):
        batch = records[i:i+batch_size]
        texts = [item["text"] for item in batch]
        
        print(f"Processing batch {i//batch_size + 1}/{(total_records + batch_size - 1)//batch_size} (Records {i} to {min(i+batch_size, total_records)})...")
        
        try:
            # We can embed multiple contents at once
            response = client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=texts,
                config={"output_dimensionality": DIMENSION}
            )
            
            for j, embedding_obj in enumerate(response.embeddings):
                item = batch[j].copy()
                item["embedding"] = list(embedding_obj.values)
                new_records.append(item)
                
        except Exception as e:
            print(f"Error during embedding generation: {e}")
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print("Rate limit reached. Try reducing batch_size or wait.")
            sys.exit(1)
            
        time.sleep(1) # Small delay to avoid aggressive rate limits
        
    print(f"Successfully generated new embeddings for {len(new_records)} records.")
    
    # Save a backup of the original just in case
    backup_file = EMBEDDINGS_FILE.with_suffix(".json.bak")
    if not backup_file.exists():
        print(f"Creating backup at {backup_file.name}...")
        import shutil
        shutil.copy2(EMBEDDINGS_FILE, backup_file)
        
    print(f"Overwriting {EMBEDDINGS_FILE.name} with new {DIMENSION}-dimensional vectors...")
    with open(EMBEDDINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(new_records, f, indent=2)
        
    print("Done! You can now run the backend with the updated knowledge base.")

if __name__ == "__main__":
    main()
