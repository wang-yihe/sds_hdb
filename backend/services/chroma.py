from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
import os
import pandas as pd
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.messages import SystemMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_core.runnables import RunnablePassthrough

INPUT_DIR = "./data"
CSV_FILE_PATH = os.path.join(INPUT_DIR, "palm.csv")
DB_PATH = "chroma_db"

chat_model = ChatGoogleGenerativeAI(
    model="gemini-pro",
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
)

embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)



def build_doc_from_row(row: pd.Series) -> Document:
    """
    Turn a palm row into a semantically rich block of text for retrieval.
    We'll include both structured fields and the Appearance Summary.
    """
    botanical = row.get("Botanical Name", "")
    common = row.get("Common Name", "")
    habit = row.get("Habit", "")
    crownshaft = row.get("Crownshaft", "")
    trunk = row.get("Trunk / Stem", "")
    fronds = row.get("Fronds / Leaves", "")
    height_m = row.get("Max Height (m)", "")
    spread_m = row.get("Max Spread (m)", "")
    inflo = row.get("Inflorescence / Flowers", "")
    fruit = row.get("Fruit", "")
    features = row.get("Distinctive Features", "")
    summary = row.get("Appearance Summary", "")
    url = row.get("NParks URL", "")

    # fallback summary if "Appearance Summary" is missing
    if not isinstance(summary, str) or summary.strip() == "":
        summary = (
            f"{botanical} ({common}) is a {habit} with {fronds}. "
            f"It is known for {features}."
        )

    # this becomes the retrievable text
    page_content = f"""
Botanical Name: {botanical}
Common Name: {common}
Habit / Form: {habit}
Crownshaft: {crownshaft}
Trunk / Stem: {trunk}
Leaves: {fronds}
Height (m): {height_m}  |  Spread (m): {spread_m}
Flowers / Inflorescence: {inflo}
Fruit: {fruit}
Key Features: {features}

Summary: {summary}

Reference: {url}
""".strip()

    # metadata is optional but nice for debugging / UI
    metadata = {
        "botanical_name": botanical,
        "common_name": common,
    }

    return Document(page_content=page_content, metadata=metadata)


def load_palm_csv_to_chroma():
    """
    1. Read palm.csv
    2. Convert each row -> Document
    3. Insert into Chroma (persist locally)
    """
    df = pd.read_csv(CSV_FILE_PATH)

    documents = []
    for _, row in df.iterrows():
        doc = build_doc_from_row(row)
        # skip empty rows
        if doc.page_content.strip():
            documents.append(doc)

    print(f"[build] Loaded {len(documents)} plant documents")

    # No splitter for now (each plant is already small).
    Chroma.from_documents(
        documents=documents,
        embedding=embedding_model,
        persist_directory=DB_PATH,
    )
    print("[build] Vector store created and persisted")


# prompt template for generation
# chat_template = ChatPromptTemplate.from_messages(
#     [
#         SystemMessage(
#             content=(
#                 "You are a plant species assistant. "
#                 "You identify palm species and answer morphology questions. "
#                 "If you are not sure, say you are not sure. "
#                 "Cite traits (leaf shape, trunk, fruit, habit) but do NOT invent."
#             )
#         ),
#         HumanMessagePromptTemplate.from_template(
#             """Use ONLY the context below to answer the user's question.
# If the answer is not in the context, say you don't know.

# Context:
# {context}

# Question:
# {question}

# Answer:"""
#         ),
#     ]
# )

# output_parser = StrOutputParser()


def format_docs(docs):
    return "\n\n---\n\n".join(doc.page_content for doc in docs)


def get_retriever():
    """
    Create / load the Chroma vector store as a retriever.
    """
    vs = Chroma(
        persist_directory=DB_PATH,
        embedding_function=embedding_model,
    )
    # mmr = diversity, k=5 top chunks
    return vs.as_retriever(
        search_type="mmr",
        search_kwargs={"k": 5, "fetch_k": 10, "lambda_mult": 0.5},
    )


# # RAG chain: retrieve -> prompt -> model -> string
# rag_chain = (
#     {
#         "context": lambda q: format_docs(get_retriever().invoke(q)),
#         "question": RunnablePassthrough(),
#     }
#     | chat_template
#     | chat_model
#     | output_parser
# )


def init_chroma():
    """
    Build the Chroma DB if it doesn't exist yet.
    We'll say 'doesn't exist' == folder missing or empty.
    """
    if not os.path.exists(DB_PATH) or not os.listdir(DB_PATH):
        print("[init] No DB found. Building from palm.csv ...")
        load_palm_csv_to_chroma()
    else:
        print("[init] DB already exists. Skipping rebuild.")


# def answer_query(query: str) -> str:
#     """
#     Public function you can call in a REPL / main() / FastAPI route.
#     """
#     init_chroma()
#     return rag_chain.invoke(query)

def answer_query(query: str) -> str:
    """
    Offline fallback:
    1. Ensure vector DB exists.
    2. Retrieve top docs for the query.
    3. Return summarized snippets directly from those docs.
    """
    init_chroma()
    retriever = get_retriever()
    docs = retriever.invoke(query)

    if not docs:
        return "No match found in palm database."

    formatted = []
    for d in docs[:3]:
        botanical = d.metadata.get("botanical_name", "Unknown botanical name")
        common = d.metadata.get("common_name", "Unknown common name")

        # We'll extract the Summary section from page_content if possible
        text = d.page_content
        # light cleanup so it's easier to read in console
        text = text.replace("\n\n", "\n").strip()

        formatted.append(
            f"Match: {common} ({botanical})\n{text}"
        )

    return "\n\n---\n\n".join(formatted)



if __name__ == "__main__":
    init_chroma()
    q = "Which palm has fishtail leaves and forms clumps?"
    print("Q:", q)
    print("A:", answer_query(q))