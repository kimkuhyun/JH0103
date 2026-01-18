import axios from "axios";

const SEARXNG_URL = process.env.SEARXNG_URL || "http://searxng:8080";

export async function searchWithSearxng(query, options = {}) {
    const {
        categories = "general",
        language = "ko-KR",
        engines = "google, naver",
        format = "json"
    } = options;
    
    try{
        const response = await axios.get(`${SEARXNG_URL}/search`, {
           params: {
            q: query,
            categories,
            language,
            engines,
            format
           },
           timeout: 10000
        });
        
        return response.data.results || [];
    }catch (error){
        console.error("searxng search failed: ", error.message);
        return [];
    }
}