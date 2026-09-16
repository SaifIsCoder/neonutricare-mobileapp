import sys
import os
from rag_api import retrieve, generate_answer

def test_rag():
    print("Testing RAG retrieval...")
    queries = [
        "What are the WHO recommendations for maternal nutrition?",
        "What are the recommendations for folic acid during pregnancy?",
        "What does WHO recommend about iron supplementation during pregnancy?",
        "What nutrients are important during pregnancy?"
    ]
    
    for query in queries:
        print(f"\n=========================================\nQuery: {query}\n")
        
        try:
            results = retrieve(query, top_k=3)
        except Exception as e:
            print(f"Retrieval failed: {e}")
            continue
            
        print("--- RETRIEVED SOURCES ---")
        for r in results:
            print(f"Source: {r['source']} (Chunk {r['chunk_index']})")
            print(f"Similarity: {r['score']:.4f}")
            print(f"Text snippet: {r['text'][:150]}...\n")
            
        print("--- GENERATING ANSWER ---")
        try:
            answer = generate_answer(query, results)
            print(answer)
        except Exception as e:
            print(f"Answer generation failed: {e}")

if __name__ == "__main__":
    test_rag()
