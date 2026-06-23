import numpy as np
from typing import List, Tuple
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import threading

_model = None
_lock = threading.Lock()


def get_ml_model() -> SentenceTransformer:
    global _model

    if _model is None:
        with _lock:
            if _model is None:
                print("[ML] Loading SentenceTransformer model...")
                _model = SentenceTransformer("paraphrase-MiniLM-L3-v2")

    return _model


def get_text_embedding(text: str) -> List[float]:
    try:
        model = get_ml_model()
        return model.encode(text).tolist()
    except Exception:
        return [0.0] * 384


def calculate_similarity(a: List[float], b: List[float]) -> float:
    if not a or not b:
        return 0.0

    return float(
        cosine_similarity(
            np.array(a).reshape(1, -1),
            np.array(b).reshape(1, -1)
        )[0][0]
    )


def rank_films_by_similarity(query_vector, films_with_vectors, top_n=5):
    scored = []

    for film, vec in films_with_vectors:
        score = calculate_similarity(query_vector, vec)
        scored.append((film, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:top_n]