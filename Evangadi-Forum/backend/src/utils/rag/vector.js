// RAG-specific vector settings and helper functions.

const rag_THRESHOLD = Number(process.env.RAG_SEARCH_THRESHOLD);
const rag_K = Number(process.env.RAG_SEARCH_K);

export const getVectorConfig = () => {
    return {
        ragThreshold: rag_THRESHOLD,
        ragK: rag_K,
    };
};

const normalizeWhiteSpace = value => {
    return value.replace(/\s+/g, ' ').trim();
};

export const normalizeQueryText = ({ title }) => {
    return normalizeWhiteSpace(
        `${title || ''}`.normalize('NFKC').toLowerCase()
    );
};

export const calculateCosineSimilarity = (vecA, vecB) => {
    if (vecA.length !== vecB.length) {
        throw new Error('embedded vectors are not equal');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magnitudeA += vecA[i] * vecA[i];
        magnitudeB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);

    if (denominator === 0) {
        return 0;
    }

    return dotProduct / denominator;
};
