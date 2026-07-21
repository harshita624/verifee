const aiService = require("./aiService");

// Extract data from receipt image using AI
exports.parseReceiptImage = async (imageBase64) => {
  try {
    // Try vision-capable model first if openai
    if (process.env.AI_PROVIDER === "openai") {
      return await aiService.recognizeProduct(imageBase64);
    }
    // For groq/ollama — can only do text OCR (if text is extracted first)
    return await aiService.parseReceipt(imageBase64);
  } catch (err) {
    throw new Error(`OCR failed: ${err.message}`);
  }
};

// Extract text from image using a simple approach
exports.extractTextFromImage = async (imageBase64) => {
  // In production, integrate Google Vision API or AWS Textract here
  // For now, use AI to describe what it sees
  return { text: "", confidence: 0, note: "Integrate Google Vision API for production OCR" };
};