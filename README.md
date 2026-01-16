# Chatbot Platform

A modern, responsive chatbot platform that allows users to create and manage multiple AI-powered chat agents with custom system prompts.

## Features

- **User Authentication**: Secure registration and login system
- **Multi-Project Support**: Create and manage multiple chatbot projects
- **Real-time Streaming**: Fast, streaming AI responses for better UX
- **Persistent Storage**: Conversations saved in browser localStorage
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Free AI Models**: Uses free-tier AI models from OpenRouter

## Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **OpenRouter API Key** (free tier available)

## Installation Steps

### 1. Clone or Create Project

```bash
# Create new Vite + React project
npm create vite@latest chatbot-platform -- --template react
cd chatbot-platform
```

### 2. Install Dependencies

```bash
npm install lucide-react
```

### 3. Get OpenRouter API Key

1. Visit [https://openrouter.ai](https://openrouter.ai)
2. Sign up for a free account
3. Go to **Keys** section
4. Create a new API key
5. Copy the key (starts with `sk-or-v1-...`)

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=https://openrouter.ai/api/v1
VITE_OPENROUTER_API_KEY=your_api_key_here
```

**Important**: Replace `your_api_key_here` with your actual OpenRouter API key.


### 5. Run the Application

```bash
# Development mode
npm run dev

# The app will be available at http://localhost:5173
```

### 6. Build for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## Usage Guide

### First Time Setup

1. **Register Account**
   - Open the application
   - Click "Register" tab
   - Enter your name, email, and password (min 8 characters)
   - Click "Create Account"

2. **Create Your First Project**
   - Click "New Project" button
   - Enter project name (e.g., "Customer Support Bot")
   - Write a system prompt (e.g., "You are a helpful customer support assistant. Respond in plain text without markdown formatting.")
   - Select an AI model (Gemini 2.0 Flash recommended for speed)
   - Click "Create"

3. **Start Chatting**
   - Select your project from the sidebar
   - Type your message in the input box
   - Press Enter or click Send
   - Watch the AI response stream in real-time

### Managing Projects

- **Switch Projects**: Click any project in the sidebar
- **Delete Project**: Click the trash icon on a project card
- **Create More**: Click "New Project" anytime

### Tips for Best Performance

1. **Use Gemini 2.0 Flash** for fastest responses
2. **Add instructions in system prompt** like "Respond in plain text only"
3. **Keep conversations focused** for better context
4. **Logout** to clear session when done

## Troubleshooting

### "API key not configured" Error

- Check `.env` file exists in project root
- Verify API key is correct
- Restart dev server after creating `.env`

### "Rate limit exceeded" Error

- Free tier has usage limits
- Wait 10 seconds and try again
- Consider upgrading OpenRouter account

### Responses Show Markdown Formatting

- Update system prompt: "Respond in plain text without using markdown formatting like **bold**, *italic*, or bullet points."
- Use Gemini models (better at following instructions)

### Slow Responses

- Change to faster models’ API
- Ensure streaming is working (you should see text appear word-by-word)
- Check internet connection

### Lost Conversations

- Data stored in browser localStorage
- Clearing browser data deletes conversations
- Use same browser to access saved chats

## Security Notes

- Passwords hashed with SHA-256 (client-side)
- API key stored in environment variables
- Authentication tokens in sessionStorage
- **For production**: Implement proper backend authentication

## Project Structure

```
chatbot-platform/
├── src/
│   ├── App.jsx          # Main application code
│   └── main.jsx         # Entry point
├── .env                 # Environment variables (create this)
├── package.json         # Dependencies
└── vite.config.js       # Vite configuration
```

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers

## Known Limitations

- Client-side only (no backend)
- Browser storage limited to ~10MB
- Free AI models have rate limits
- No conversation export feature

## Future Enhancements

- Backend API integration
- Database for persistent storage
- Conversation export (JSON/PDF)
- Analytics dashboard
- Model comparison
- File upload support
- Voice input/output

## Support

For issues or questions:
- Check troubleshooting section
- Review OpenRouter documentation
- Verify environment variables

## License

MIT License - Free to use and modify

---

**Built with**: React, Vite, TailwindCSS, Lucide Icons, OpenRouter API