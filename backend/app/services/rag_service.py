from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

class RAGService:
    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        self.text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)

    def create_vector_store(self, text: str):
        chunks = self.text_splitter.split_text(text)
        vector_store = FAISS.from_texts(chunks, self.embeddings)
        return vector_store

    def retrieve_context(self, vector_store, query: str):
        # Retrieve docs with scores to calculate confidence
        docs_and_scores = vector_store.similarity_search_with_relevance_scores(query, k=4)
        context = "\n".join([doc.page_content for doc, score in docs_and_scores])
        avg_score = sum([score for doc, score in docs_and_scores]) / len(docs_and_scores) if docs_and_scores else 0
        return context, docs_and_scores, avg_score