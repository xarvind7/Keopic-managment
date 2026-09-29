import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// Helper to get GoogleGenAI client
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API: Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", aiConfigured: Boolean(process.env.GEMINI_API_KEY) });
});

// API: AI Sales Performance Analysis
app.post("/api/ai/analyze", async (req, res) => {
  try {
    const { month, meta, stats } = req.body;

    const ai = getGenAI();

    const prompt = `
You are an expert Sales & Commission Strategy Advisor for Keopic Photobooth Pvt Ltd.
Analyze the following monthly sales and incentive performance data and generate concise, actionable insights and tips for the employee.

Context:
- Employee Name: ${meta?.empName || meta?.employeeName || "Employee"}
- Location: ${meta?.locVal || meta?.location || "Photobooth"}
- Month: ${month || "Current Month"}
- Base Salary: ₹${meta?.baseSalary || meta?.mainSalary || 0}
- Total Stand Sales (₹200/unit): ₹${stats?.totalStand || 0} (${stats?.standUnits || 0} units)
- Total Magnet Sales (₹250/unit): ₹${stats?.totalMagnet || 0} (${stats?.magnetUnits || 0} units)
- Total Frame Sales: ₹${stats?.totalFrame || 0}
- Gross Sales Revenue: ₹${stats?.grossSales || 0}
- Attendance: ${stats?.presentDays || 0} Present / ${stats?.absentDays || 0} Absent / ${stats?.offDays || 0} Week Off
- Total Commissions/Incentive Earned: ₹${stats?.totalIncentive || 0}
- Final Payable Salary: ₹${stats?.finalPayable || 0}

Provide a structured, encouraging, and highly specific response in Markdown with:
1. 🎯 **Performance Snapshot**: A brief 2-sentence summary of overall performance.
2. 💡 **Incentive & Sales Insights**: Analysis of Stand vs Magnet vs Frame sales balance and how to hit higher incentive targets.
3. 🚀 **Actionable Recommendations**: 3 high-impact tips for the employee to increase daily sales, minimize absences, and maximize total monthly payout.

Keep the tone energetic, professional, clear, and direct. Avoid generic filler.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    res.status(500).json({ error: error?.message || "Failed to generate AI insights." });
  }
});

// API: AI Sales Copilot Chat
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { messages, context } = req.body;

    const ai = getGenAI();

    const systemInstruction = `
You are the AI Sales & Incentive Advisor for Keopic Photobooth Pvt Ltd.
You assist photobooth staff and managers with sales strategy, commission calculation advice, daily target planning, and attendance queries.

Current Employee & Performance Context:
- Employee: ${context?.employeeName || "Staff"} at ${context?.location || "Location"}
- Current Selected Month: ${context?.selectedMonth || "N/A"}
- Stand Sales: ₹${context?.totalStand || 0} (${context?.standUnits || 0} pcs @ ₹200)
- Magnet Sales: ₹${context?.totalMagnet || 0} (${context?.magnetUnits || 0} pcs @ ₹250)
- Frame Sales: ₹${context?.totalFrame || 0}
- Gross Sales: ₹${context?.grossSales || 0}
- Earned Commission/Incentive: ₹${context?.totalIncentive || 0}
- Final Payable: ₹${context?.finalPayable || 0}
- Attendance: ${context?.presentDays || 0} Present days

Rules:
- Be friendly, encouraging, and business-focused.
- Use Rupees (₹) for monetary values.
- Remind staff that Stand is priced at ₹200 and Magnet at ₹250 per piece.
- Give concise, direct answers with bullet points or bold highlights.
`;

    const formattedContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: formattedContents,
      config: {
        systemInstruction,
      },
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ error: error?.message || "Failed to process chat message." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
