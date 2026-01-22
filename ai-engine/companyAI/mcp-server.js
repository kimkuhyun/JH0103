import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    ListToolsRequestSchema,
    CallToolRequestSchema,
    ErrorCode,
    McpError
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import { searchCompanyHomepage, searchCompanyNews } from "./tools/searxng-tool.js";
import { fetchWithBrowserless, fetchMultipleUrls, findImportantPages } from "./tools/browserless-tools.js";
import { analyzeCompanyData } from "./tools/analyzer.js";

const app = express();
app.use(express.json());

// Health check 엔드포인트
app.get("/health", (req, res) => {
    res.json({ 
        status: "ok", 
        service: "company-search-mcp",
        timestamp: new Date().toISOString()
    });
});

//http api 엔드포인트 
app.post("/search", async (req, res) => {
    const { companyName, jobtitle, jobDescription } = req.body;

    if (!companyName) {
        return res.status(400).json({ error: "companyName is required" });
    }

    console.log("\n====================================");
    console.log("🔍 Company Research Request");
    console.log("====================================");
    console.log("Company:", companyName);
    console.log("Job Title:", jobtitle || "N/A");
    console.log("====================================\n");

    try {
        // STEP 1: 회사 홈페이지 검색
        console.log("📍 STEP 1: Searching company homepage...");
        const searchResults = await searchCompanyHomepage(companyName);
        
        if (searchResults.length === 0) {
            throw new Error("No search results found for company: " + companyName);
        }
        
        // STEP 2: 메인 페이지 크롤링
        console.log("📍 STEP 2: Crawling main homepage...");
        const mainUrl = searchResults[0].url;
        console.log("Main URL:", mainUrl);
        
        const mainPageData = await fetchWithBrowserless(mainUrl);
        
        // STEP 3: 중요 페이지 찾기 및 크롤링
        console.log("📍 STEP 3: Finding and crawling important pages...");
        const importantUrls = findImportantPages(mainPageData, mainUrl);
        console.log(`Found ${importantUrls.length} important pages:`, importantUrls);
        
        const additionalPages = await fetchMultipleUrls(importantUrls);
        
        // 모든 크롤링 데이터 합치기
        const allCrawledData = [mainPageData, ...additionalPages];
        console.log(`Total pages crawled: ${allCrawledData.length}`);
        
        // STEP 4: 뉴스 검색
        console.log("📍 STEP 4: Searching recent news...");
        const newsResults = await searchCompanyNews(companyName);
        
        // STEP 5: AI 종합 분석
        console.log("📍 STEP 5: AI analysis...");
        const analysis = await analyzeCompanyData({
            company: companyName,
            searchResults,
            crawledData: allCrawledData,
            newsResults,
            jobContext: { 
                title: jobtitle, 
                description: jobDescription 
            }
        });

        console.log("\n✅ Research completed successfully\n");

        res.json({
            success: true,
            data: analysis
        });
        
    } catch (error) {
        console.error("\n❌ Research error:", error.message);
        console.error(error.stack);
        
        res.status(500).json({
            success: false,
            error: "Research failed",
            message: error.message
        });
    }
});

const server = new Server(
    {
        name: "company-search-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_company",
        description: "회사명으로 웹 검색 (공식 사이트, 뉴스, 채용정보)",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "검색 쿼리" }
          },
          required: ["query"]
        }
      },
      {
        name: "fetch_webpage",
        description: "URL에서 웹페이지 크롤링",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "크롤링할 URL" }
          },
          required: ["url"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "search_company") {
      const results = await searchWithSearxng(args.query);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2)
          }
        ]
      };
    } else if (name === "fetch_webpage") {
      const data = await fetchWithBrowserless(args.url);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2)
          }
        ]
      };
    }

    throw new McpError(
      ErrorCode.MethodNotFound,
      `Unknown tool: ${name}`
    );
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error.message}`
    );
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`company search server running on port ${PORT}`);
});

async function runMcpServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("MCP server connected via stdio");
}

runMcpServer().catch(console.error);