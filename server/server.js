/**
 * Server Entry Point
 * ------------------
 * This Express server provides an endpoint to interact with the OpenAI API
 * for text completion. It uses environment variables to store configuration
 * and a JSON-based request body to supply prompts to the AI model.
 */

// Import statements (ES6)
import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config({ path: './server/.env' });

// Initialize Express app
const app = express();
app.use(express.json());

// Check for required environment variable
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set.');
  process.exit(1);
}

// Initialize OpenAI with provided API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /complete
 * --------------
 * Expects a JSON body with a "prompt" field. Sends the prompt to the
 * OpenAI API and returns the completion result in JSON format.
 */
app.post('/complete', async (req, res) => {
  // Validate the request body
  if (!req.body) {
    return res.status(400).json({ error: 'Body is required' });
  }
  
  const { prompt } = req.body;
  
  // Validate the prompt field
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    // Send the prompt to OpenAI API (example model & parameters)
    const response = await openai.responses.create({
      model: 'gpt-4o',
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: `You are an assistant adept at transforming Algolia records to support tasks including hydration, manipulation, and deletion of attributes. 

# Steps

1. **Hydration**: Enhance the record with additional required attributes or information.
2. **Manipulation**: Modify existing attributes according to specified conditions or requirements.
3. **Deletion**: Remove unnecessary or redundant attributes from the records.

# Output Format

Provide a structured and clear code snippet with detailed explanations for each step taken. The snippet must be framed with respect to a hypothetical Algolia record that is JSON, and with respect to the ecommerce vertical.

The response should "only include a JSON of the sample javascript helper function that would accomplish the source prompt".

# Notes

- Ensure any modification is consistent with user requirements.
- Maintain the integrity and performance of the Algolia index.
- Validate the transformation before applying changes to prevent data loss.
`
            }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: prompt
            }
          ]
        }
      ],
      text: {
        format: {
          type: 'text'
        }
      },
      reasoning: {},
      tools: [],
      temperature: 1,
      max_output_tokens: 2048,
      top_p: 1,
      store: true
    });

    // Extract the completion text from the response
    const outputText = response.output_text;

    // Validate the output text
    if (typeof outputText !== 'string') {
      throw new Error('output_text is missing or not a string');
    }

    // Return the response as JSON
    return res.json({ output_text: String(outputText) });
    
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to get completion' });
  }
});

// Start the server
const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
