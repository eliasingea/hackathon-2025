import React, { useState, useRef, useEffect } from "react";
import { algoliasearch } from "algoliasearch";

const searchClient = algoliasearch(
  "1O071SLCFD",
  "8e0c05de6ee92174f50db39e199ec9b8"
);
const indexName = "prod_transformations_en";

const initialState = {
  userId: "123",
  history: [],
  intent: null,
  entities: {},
  transformations: {},
};

const evaluateNextStep = (state) => {
  if (
    !state.entities.transformationRequest ||
    state.entities.transformationRequest.length < 6
  ) {
    return "ask_transformation_description";
  }
  console.log(state);
  if (state.transformations.code) {
    return {
      step: "show_existing_transformation",
      code: state.transformations.code,
    };
  }
  if (!state.intent && state.history.length > 0) {
    return "get_more_information";
  }
  return {
    step: "generate_new_transformation",
    description: state.entities.transformationRequest,
  };
};

const generateAITransformation = async (description) => {
  // Placeholder for real AI logic or API call
  const url = "/api/complete";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: description }),
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    if (response.ok) {
      const data = await response.json();
      return data.output_text;
    }
  } catch (error) {
    console.error("Error generating transformation:", error);
    return `// Error generating transformation: ${error.message}`;
  }
};

const generateBotMessage = async (state) => {
  const stepResult = evaluateNextStep(state);

  let message = {
    text: "",
  };

  if (typeof stepResult === "string") {
    let prompt = '';
    if (stepResult === "ask_transformation_description") {
      prompt = 'What kind of transformation are you trying to accomplish?';
    } else {
      state.intent = true;
      prompt = 'Can you describe in detail what transformation you want and I can generate one for you?';
    }
    return { ...message, text: prompt };
  } else if (stepResult.step === "show_existing_transformation") {
    return {
      ...message,
      text: "I found a transformation that matches your request:\n",
      code: stepResult.code,
    };
  } else if (stepResult.step === "generate_new_transformation") {
    const aiCode = await generateAITransformation(
      state.entities.transformationRequest
    );
    console.log(aiCode);
    return {
      ...message,
      text: "Here's a AI generated transformation based on your request:",
      code: aiCode ? aiCode : "// No transformation found. Please try again.",
    };
  }
};

export default function Chatbot() {
  const [state, setState] = useState(initialState);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const chatMessages = useRef(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (input.trim().length > 1) {
        console.log(input);
        const { results } = await searchClient.search({
          requests: [
            {
              indexName,
              query: input.toString(),
            },
          ],
        });
        setSuggestions(results[0].hits);
      } else {
        setSuggestions([]);
      }
    };

    fetchSuggestions();
  }, [input]);

  const handleSend = async (input) => {
    console.log("Sending message:", input);
    let newState = { ...state };

    let selectedText = "";
    if (typeof input !== "string") {
      newState.transformations.code = input.code;
      selectedText = input.title;
    } else {
      selectedText = input;
      newState = { ...newState, entities: {}, transformations: {} };
    }
    const userMessage = { from: "user", message: { text: selectedText } };
    newState = { ...newState, history: [...state.history, userMessage] };
    newState.entities.transformationRequest = selectedText;

    setLoading(true);
    const botMessage = {
      from: "bot",
      message: await generateBotMessage(newState),
    };
    setLoading(false);

    // scroll to the bottom after the messages are added to the DOM
    setTimeout(() => {
      if (chatMessages && chatMessages.current) {
        chatMessages.current.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
      }
    }, 10);

    setState({ ...newState, history: [...newState.history, botMessage] });
    setInput("");
    setSuggestions([]);
  };

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 inline-flex items-center justify-center text-sm font-medium disabled:pointer-events-none disabled:opacity-50 border rounded-full w-16 h-16 bg-black hover:bg-gray-700 m-0 cursor-pointer border-gray-200 bg-none p-0 normal-case leading-5 hover:text-gray-900"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        data-state={isOpen ? "open" : "closed"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="30"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-black block border-gray-200 align-middle"
        >
          <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
        </svg>
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-[calc(4rem+1.5rem)] right-0 mr-4 bg-white p-6 rounded-lg border border-[#e5e7eb] w-2/3 h-[634px] shadow-sm flex flex-col">
          <div className="flex flex-col space-y-1.5 pb-6">
            <h2 className="font-semibold text-lg tracking-tight">Algolia Transformations Chatbot</h2>
            <p className="text-md text-[#6b7280] leading-6">
              Start typing to find existing data tranformations or generate a new one
            </p>
          </div>

          <div
            className="pr-4 flex-1 overflow-y-auto h-[474px] scroll-smooth"
            style={{ minWidth: "100%" }}
          >
            {state.history.map((msg, i) => (
              <div
                ref={chatMessages}
                key={i}
                className="flex gap-3 my-4 text-gray-600 text-sm flex-1"
              >
                <span className="relative flex shrink-0 overflow-hidden rounded-full w-8 h-8">
                  <div className="rounded-full bg-gray-100 border p-1">
                    <svg
                      stroke="none"
                      fill="black"
                      strokeWidth={msg.from === "bot" ? "1.5" : "0"}
                      viewBox={msg.from === "bot" ? "0 0 24 24" : "0 0 16 16"}
                      height="20"
                      width="20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d={
                          msg.from === "bot"
                            ? "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                            : "M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10Z"
                        }
                      />
                    </svg>
                  </div>
                </span>
                <div className="leading-relaxed">
                  <span className="block font-bold text-gray-700">
                    {msg.from === "bot" ? "Algolia AI" : "You"}
                  </span>
                  {msg.message.text}
                  {msg.message.code && (
                    <div>
                      <pre className="mt-4 mb-2">{msg.message.code}</pre>
                      <button
                        className="mb-2 outline-2 outline-blue-500"
                        onClick={() =>
                          navigator.clipboard.writeText(msg.message.code)
                        }
                      >
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 my-4 text-gray-600 text-sm flex-1">
                <span className="relative flex shrink-0 overflow-hidden rounded-full w-8 h-8">
                  <div className="rounded-full bg-gray-100 border p-1" />
                </span>
                <p className="leading-relaxed text-gray-500 italic">
                  Generating transformation...
                </p>
              </div>
            )}
          </div>

          <div className="relative pt-0">
            <form
              className="flex items-center justify-center w-full space-x-2"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
            >
              <input
                className="flex h-10 w-full rounded-md border border-[#e5e7eb] px-3 py-2 text-sm placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#9ca3af] disabled:cursor-not-allowed disabled:opacity-50 text-[#030712] focus-visible:ring-offset-2"
                placeholder="Type your message"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium text-black disabled:pointer-events-none disabled:opacity-50 bg-black hover:bg-[#111827E6] h-10 px-4 py-2"
                disabled={loading}
              >
                Send
              </button>
            </form>

            {suggestions.length > 0 && (
              <ul className="absolute bottom-12 left-0 w-full border border-gray-200 bg-white rounded-md shadow max-h-32 overflow-y-auto text-sm z-10">
                {suggestions.map((s, i) => (
                  <li
                    key={s.objectID || i}
                    className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-[#030712]"
                    onClick={() => handleSend(s)}
                  >
                    {s.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
