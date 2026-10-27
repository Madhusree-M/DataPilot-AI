import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  BarChart3,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatView({ dataset }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I am **DataPilot AI**, your autonomous Data Scientist.\n\nI can analyze **${dataset?.name || 'your dataset'}**, uncover hidden correlations, detect data anomalies, or answer statistical questions. Try one of the suggested prompts below or ask anything!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    'Summarize this dataset',
    'Which columns have missing values?',
    'What are the strongest correlations?',
    'Are there any outliers in this data?',
    `Show statistics for ${dataset?.columns?.[0] || 'first column'}`,
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || !dataset || loading) return;

    setInput('');
    const userMsg = {
      role: 'user',
      content: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.queryChat(dataset.id, queryText);
      const assistantMsg = {
        role: 'assistant',
        content: res.reply,
        insights: res.insights,
        chart_suggestion: res.chart_suggestion,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an issue analyzing your query. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 190px)',
      minHeight: '550px',
      overflow: 'hidden',
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(255, 255, 255, 0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Sparkles size={18} color="white" />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Chat with AI Data Scientist</h3>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Context: <b>{dataset?.name}</b> ({dataset?.row_count} rows, {dataset?.col_count} columns)
            </p>
          </div>
        </div>

        <span className="badge badge-indigo">Analytical Engine Active</span>
      </div>

      {/* Messages Scroll Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}>
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '12px',
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: isUser ? '80%' : '85%',
              }}
            >
              {!isUser && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.2)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}>
                  <Bot size={18} color="var(--accent-primary)" />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  background: isUser ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${isUser ? 'transparent' : 'var(--border-subtle)'}`,
                  color: 'var(--text-main)',
                  padding: '12px 16px',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  fontSize: '13.5px',
                  boxShadow: isUser ? '0 4px 14px rgba(99, 102, 241, 0.25)' : 'none',
                }}>
                  <div className={`markdown-content ${isUser ? 'markdown-user' : 'markdown-assistant'}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  </div>

                  {/* Render Chart Suggestion if available */}
                  {m.chart_suggestion && m.chart_suggestion.data && (
                    <div style={{
                      marginTop: '14px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <BarChart3 size={15} />
                        {m.chart_suggestion.title}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {m.chart_suggestion.data.map((item, dIdx) => {
                          const maxVal = Math.max(...m.chart_suggestion.data.map((d) => d.value)) || 1;
                          const pct = Math.max((item.value / maxVal) * 100, 5);
                          return (
                            <div key={dIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                              <span style={{ width: '90px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                                {item.name}
                              </span>
                              <div style={{ flex: 1, height: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{
                                  width: `${pct}%`,
                                  height: '100%',
                                  background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
                                  borderRadius: '4px',
                                }} />
                              </div>
                              <span style={{ width: '40px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                                {item.value}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', marginTop: '4px', padding: '0 4px' }}>
                  {m.timestamp}
                </span>
              </div>

              {isUser && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(6, 182, 212, 0.2)',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}>
                  <User size={18} color="var(--accent-cyan)" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', alignSelf: 'flex-start' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Bot size={18} color="var(--accent-primary)" />
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px 16px 16px 4px',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: 'var(--text-muted)',
            }}>
              <div className="animate-spin" style={{ width: '12px', height: '12px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />
              Analyzing dataset...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      <div style={{
        padding: '8px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(0, 0, 0, 0.1)',
      }}>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Suggestions:
        </span>
        {quickPrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(p)}
            disabled={loading}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              fontSize: '11.5px',
              padding: '4px 10px',
              borderRadius: '9999px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-main)';
              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(13, 18, 31, 0.95)',
      }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          style={{ display: 'flex', gap: '10px' }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask DataPilot anything about ${dataset?.name || 'this dataset'}...`}
            className="input-field"
            disabled={loading}
            style={{ fontSize: '13.5px' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="btn btn-primary"
            style={{ padding: '0 18px', flexShrink: 0 }}
          >
            <Send size={15} />
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}
