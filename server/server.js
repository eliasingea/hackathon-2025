import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';
dotenv.config({ path: './server/.env' });

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/complete', async (req, res) => {
    if (!req.body) return res.status(400).json({ error: 'body is required' });
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
  
    try {
      const response = await openai.responses.create({
        model: "gpt-4o",
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: "You are an assistant adept at transforming Algolia records to support tasks including hydration, manipulation, and deletion of attributes. \n\n# Steps\n\n1. **Hydration**: Enhance the record with additional required attributes or information.\n2. **Manipulation**: Modify existing attributes according to specified conditions or requirements.\n3. **Deletion**: Remove unnecessary or redundant attributes from the records.\n\n# Output Format\n\nProvide a structured and clear code snippet with detailed explanations for each step taken. The snippet must be framed with respect to a hypothetical Algolia record that is JSON, and with respect to the ecommerce vertical.\n\nThe response should \"only include a JSON of the sample javascript helper function that would accomplish the source prompt\".\n\n# Notes\n\n- Ensure any modification is consistent with user requirements.\n- Maintain the integrity and performance of the Algolia index.\n- Validate the transformation before applying changes to prevent data loss.\n\n"
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: prompt
              }
            ]
          }
        ],
        text: {
          format: {
            type: "text"
          }
        },
        reasoning: {},
        tools: [],
        temperature: 1,
        max_output_tokens: 2048,
        top_p: 1,
        store: true
      });
  
  // Extract the output_text property from the response
  const outputText = response.output_text;

  // Check if it's a valid string, otherwise throw an error
  if (typeof outputText !== 'string') {
    throw new Error('output_text is missing or not a string');
  }

  // Send as JSON response with a guaranteed string
  res.json({ output_text: String(outputText) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to get completion' });
    }
  });
  

app.listen(3002, () => {
  console.log('Server running at http://localhost:3002');
});
