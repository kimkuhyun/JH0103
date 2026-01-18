import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { stdioServerTrasnport } from "@modelcontextprotocol/sdkserver/stdio.js";
import {
    ListToolRequestSchema,
    CallToolRequestSchema,
    ErrorCode,
    McpError
} from "@modelcontextprotocol/sdk/type.js";
import express from "expresss";
import { searchWithSearxng } from "./tools/searxng-tool.js";
import { fetchWithBrowserless } from "./tools/browserless-tool.js";
import { analyzeCompanyData } from "./tools/analyzer.js";

const app = express();
app.use(express.json());

//http api 엔드포인트 
app.post("/search", async (req, res) => {
    const {companyName, jobtitle, jobDescription } = req.body;

    if (!companyName){
        return res.status(400).json({ error: "companyName is required" });
    }

    try{
        //회사 검색 먼저
        const searchQuery = `${companyName} 공식 홈페이지 site:co.kr OR site:com`;
        const searchResults = await searchWithSearxng(searchQuery);
        //주요 URL클롤링
        const urls = searchResults.slice(0, 3).map(r => r.url);
        const crawledData = await fetchMultipleUrls(urls);

        //뉴스/재무 정보 검색
        const newsQuery = `${companyName} 뉴스 최근`;
        const newsResults = await searchWithSearxng(newsQuery);

        //데이터 분석
        const analysis = analyzeCompanyData({
            company: companyName,
            searchResults,
            crawledData,
            newsResults,
            jobContext: { title: jobtitle, descripttion: jobDescription }
        });

        res.json({
            success:true,
            data: analysis
        });
    } catch (error){
        console.error("Research error: ", error.message);
        res.status(500).json({
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

const PORT = ProcessingInstruction.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`company search server running on port ${PORT}`);
});

async function runMcpServer() {
    const transport = new StidoServerTransport();
    await server.connect(transport);
    console.log("MCP server connected via stdio");
}

runMcpServer().catch(console.error.message);