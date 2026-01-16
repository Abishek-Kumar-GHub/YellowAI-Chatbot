import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, MessageSquare, User, Lock, Mail, FolderPlus, LogOut, Menu, X, Trash2 } from 'lucide-react';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Use environment variables for API configuration
const API_BASE = import.meta.env.VITE_API_BASE_URL;
const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;


// Security utility functions
const hashPassword = async (password) => {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const generateToken = (userId) => {
  return btoa(JSON.stringify({ userId, timestamp: Date.now() }));
};

const verifyToken = (token) => {
  try {
    const decoded = JSON.parse(atob(token));
    return decoded.userId;
  } catch {
    return null;
  }
};

export default function App() {
  // State management
  const [view, setView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState('');
  
  // Auth form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  
  // Project form states
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectPrompt, setNewProjectPrompt] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);  

  const [streaming, setStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');

  
  const messagesEndRef = useRef(null);

  // Initialize - check for existing session
  useEffect(() => {
    const token = sessionStorage.getItem('authToken');
    if (token) {
      const userId = verifyToken(token);
      if (userId) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.id === userId);
        if (user) {
          setCurrentUser(user);
          loadProjects(userId);
          setView('dashboard');
        }
      }
    }
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load user's projects
  const loadProjects = (userId) => {
    const allProjects = JSON.parse(localStorage.getItem('projects') || '[]');
    const userProjects = allProjects.filter(p => p.userId === userId);
    setProjects(userProjects);
  };

  // Handle user registration
  const handleRegister = async () => {
    setError('');
    
    if (!registerName || !registerEmail || !registerPassword) {
      setError('All fields are required');
      return;
    }
    
    if (registerPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    if (users.find(u => u.email === registerEmail)) {
      setError('Email already registered');
      return;
    }
    
    const hashedPassword = await hashPassword(registerPassword);
    const newUser = {
      id: Date.now().toString(),
      name: registerName,
      email: registerEmail,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    const token = generateToken(newUser.id);
    sessionStorage.setItem('authToken', token);
    setCurrentUser(newUser);
    setView('dashboard');
  };

  // Handle user login
  const handleLogin = async () => {
    setError('');
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const hashedPassword = await hashPassword(loginPassword);
    const user = users.find(u => u.email === loginEmail && u.password === hashedPassword);
    
    if (!user) {
      setError('Invalid email or password');
      return;
    }
    
    const token = generateToken(user.id);
    sessionStorage.setItem('authToken', token);
    setCurrentUser(user);
    loadProjects(user.id);
    setView('dashboard');
  };

  // Handle logout
  const handleLogout = () => {
    sessionStorage.removeItem('authToken');
    setCurrentUser(null);
    setProjects([]);
    setSelectedProject(null);
    setMessages([]);
    setView('login');
  };

  // Create new project
  const createProject = () => {
    if (!newProjectName || !newProjectPrompt) {
      setError('Project name and system prompt are required');
      return;
    }
    
    const project = {
      id: Date.now().toString(),
      userId: currentUser.id,
      name: newProjectName,
      systemPrompt: newProjectPrompt,
      createdAt: new Date().toISOString()
    };
    
    const allProjects = JSON.parse(localStorage.getItem('projects') || '[]');
    allProjects.push(project);
    localStorage.setItem('projects', JSON.stringify(allProjects));
    
    setProjects([...projects, project]);
    setNewProjectName('');
    setNewProjectPrompt('');
    setShowNewProject(false);
    setError('');
  };

  // Delete project
  const deleteProject = (projectId) => {
    const allProjects = JSON.parse(localStorage.getItem('projects') || '[]');
    const filtered = allProjects.filter(p => p.id !== projectId);
    localStorage.setItem('projects', JSON.stringify(filtered));
    setProjects(projects.filter(p => p.id !== projectId));
    
    // Clear messages for this project
    localStorage.removeItem(`messages_${projectId}`);
    
    if (selectedProject?.id === projectId) {
      setSelectedProject(null);
      setMessages([]);
    }
  };

  // Select a project and load its messages
  const selectProject = (project) => {
    setSelectedProject(project);
    const projectMessages = JSON.parse(localStorage.getItem(`messages_${project.id}`) || '[]');
    setMessages(projectMessages);
  };

  // Send message to AI
  const sendMessage = async () => {
    if (!input.trim() || !selectedProject) return;
    
    // Check if API key is configured
    if (!API_KEY) {
      setError('API key not configured. Please add VITE_OPENROUTER_API_KEY to your .env file and restart the server.');
      return;
    }
    
    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.href,
          'X-Title': 'Chatbot Platform'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [
            { role: 'system', content: selectedProject.systemPrompt },
            ...newMessages
          ]
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (response.status === 401) {
          throw new Error('Invalid API key. Please check your VITE_OPENROUTER_API_KEY in .env file.');
        } else if (response.status === 404) {
          throw new Error('API endpoint not found. Please check your VITE_API_BASE_URL configuration.');
        }
        
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }
      
      const data = await response.json();
      const assistantMessage = {
        role: 'assistant',
        content: data.choices[0].message.content
      };
      
    const assistantText = data.choices[0].message.content;
    const words = assistantText.split(' ');

    setStreamedContent('');
    setStreaming(true);

    let i = 0;
    const interval = setInterval(() => {
      setStreamedContent(prev =>
        prev + (i === 0 ? '' : ' ') + words[i]
      );
      i++;

      if (i >= words.length) {
        clearInterval(interval);
        setStreaming(false);

        const assistantMessage = {
          role: 'assistant',
          content: assistantText
        };

        const updatedMessages = [...newMessages, assistantMessage];
        setMessages(updatedMessages);
        localStorage.setItem(
          `messages_${selectedProject.id}`,
          JSON.stringify(updatedMessages)
        );

        setStreamedContent('');
      }
    }, 120);
    } catch (err) {
      setError(err.message || 'Failed to send message. Please check your connection and try again.');
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  // Render login/register view
  if (view === 'login' || view === 'register') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-lg mb-4">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-black mb-2">Chatbot Platform</h1>
            <p className="text-gray-600">Build and deploy intelligent agents</p>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}
          
          <div className="bg-white border-2 border-black rounded-lg p-8">
            <div className="flex border-b-2 border-black mb-6">
              <button
                onClick={() => { setView('login'); setError(''); }}
                className={`flex-1 pb-3 font-semibold transition-colors ${
                  view === 'login' ? 'text-black border-b-4 border-black -mb-0.5' : 'text-gray-400'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => { setView('register'); setError(''); }}
                className={`flex-1 pb-3 font-semibold transition-colors ${
                  view === 'register' ? 'text-black border-b-4 border-black -mb-0.5' : 'text-gray-400'
                }`}
              >
                Register
              </button>
            </div>
            
            {view === 'login' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-black mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, handleLogin)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-black mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, handleLogin)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <button
                  onClick={handleLogin}
                  className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                >
                  Sign In
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-black mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-black mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-black mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, handleRegister)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="••••••••"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>
                <button
                  onClick={handleRegister}
                  className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render main dashboard
  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-black text-white px-4 py-4 flex items-center justify-between border-b-2 border-black">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6" />
            <h1 className="text-xl font-bold">Chatbot Platform</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm hidden sm:inline">{currentUser?.name}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:relative z-30 w-80 bg-white border-r-2 border-black h-full transition-transform duration-300 flex flex-col`}>
          <div className="p-4 border-b-2 border-black">
            <button
              onClick={() => setShowNewProject(true)}
              className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors font-semibold"
            >
              <Plus className="w-5 h-5" />
              New Project
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Your Projects</h2>
            {projects.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No projects yet. Create one to get started.</p>
            ) : (
              <div className="space-y-2">
                {projects.map(project => (
                  <div
                    key={project.id}
                    className={`p-3 rounded-lg border-2 transition-all cursor-pointer group ${
                      selectedProject?.id === project.id
                        ? 'border-black bg-black text-white'
                        : 'border-gray-200 hover:border-black'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div onClick={() => selectProject(project)} className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{project.name}</h3>
                        <p className={`text-xs mt-1 line-clamp-2 ${
                          selectedProject?.id === project.id ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          {project.systemPrompt}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this project? This will also delete all messages.')) {
                            deleteProject(project.id);
                          }
                        }}
                        className={`p-1 rounded hover:bg-red-100 transition-colors ${
                          selectedProject?.id === project.id ? 'text-white hover:text-red-600' : 'text-gray-400 hover:text-red-600'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {selectedProject ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b-2 border-black px-6 py-4">
                <h2 className="text-xl font-bold text-black">{selectedProject.name}</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedProject.systemPrompt}</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Start a conversation with your agent</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-2xl px-4 py-3 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-black border-2 border-gray-200'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-sm max-w-none leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {streaming && (
                  <div className="flex justify-start">
                    <div className="max-w-2xl px-4 py-3 rounded-lg bg-gray-100 text-black border-2 border-gray-200">
                      <div className="prose prose-sm max-w-none leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamedContent}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 border-2 border-gray-200 px-4 py-3 rounded-lg">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t-2 border-black bg-white p-4 not-prose">
                {error && (
                  <div className="max-w-4xl mx-auto mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                    {error}
                  </div>
                )}
                <div className="max-w-4xl mx-auto flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-3 border-2 border-black rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                    disabled={loading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FolderPlus className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-black mb-2">No Project Selected</h3>
                <p className="text-gray-600">Select a project or create a new one to start chatting</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border-2 border-black p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-black mb-4">Create New Project</h2>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Project Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Customer Support Bot"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-2">System Prompt</label>
                <textarea
                  value={newProjectPrompt}
                  onChange={(e) => setNewProjectPrompt(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black h-32 resize-none"
                  placeholder="You are a helpful customer support assistant..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowNewProject(false);
                    setError('');
                    setNewProjectName('');
                    setNewProjectPrompt('');
                  }}
                  className="flex-1 px-4 py-3 border-2 border-black rounded-lg hover:bg-gray-100 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={createProject}
                  className="flex-1 px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}